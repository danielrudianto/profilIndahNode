import pandas as pd
from sqlalchemy import create_engine, text
from pymongo import MongoClient
from datetime import datetime, date as d

# Database connection setup
sql_engine = create_engine('mysql+pymysql://root:jamuju18@localhost:3306/profil_indah_bu')
mongo_client = MongoClient('mongodb://localhost:27017/')
mongo_db = mongo_client['profil_indah']
mongo_stock_in_collection = mongo_db['stock_in']
mongo_stock_out_collection = mongo_db['stock_out']
mongo_overflow_collection = mongo_db['overflow']

async def sync_product_out_calculation():
    # SQL query
    query = """
    SELECT * FROM 
    (
      -- Adjustment case
      SELECT 
      NULL AS billID, NULL as billCodeID,
      adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID,
      adjustment_case_code.date, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) * -1 AS quantity,
      adjustment_case.item_id AS itemID,
      0 AS value
      FROM adjustment_case
      JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
      LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
      WHERE adjustment_case_code.is_delete = 0
      AND adjustment_case.quantity < 0
      UNION ALL
      -- Bill
      SELECT 
      bill.id AS billID, bill_code.id as billCodeID,
      NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
      bill_code.date, (bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
      bill.item_id AS itemID,
      IF(total.value = 0, 0, (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1))) AS value
      FROM bill
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
      LEFT JOIN (
        SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
          FROM sales_return
          JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
          WHERE sales_return_code.is_delete = 0
          GROUP BY sales_return.bill_id
      ) AS sr
      ON sr.bill_id = bill.id
      JOIN (
        SELECT SUM((bill.price - bill.discount) * (bill.quantity - COALESCE(sra.quantity, 0))) AS value, bill.bill_code_id
          FROM bill
        LEFT JOIN (
          SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
          FROM sales_return
          JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
          WHERE sales_return_code.is_delete = 0
          GROUP BY sales_return.bill_id
        )  AS sra
        ON bill.id = sra.bill_id
          GROUP BY bill.bill_code_id
      ) AS total
      ON bill_code.id = total.bill_code_id
      WHERE bill_code.is_delete = 0
      AND bill.item_id IS NOT NULL
      UNION ALL
      -- Bill with package
      SELECT 
      bill.id AS billID, bill_code.id as billCodeID,
      NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
      bill_code.date, (package_content.quantity * bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
      package_content.item_id AS itemID,
      IF(total.value = 0, 0, IF(pv.value = 0, 0, ((package_content.price - package_content.discount) / pv.value) * (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1)))) AS value
      FROM bill
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      JOIN package_code ON bill.package_code_id = package_code.id
      JOIN package_content ON package_code.id = package_content.package_code_id
      JOIN item ON package_content.item_id = item.id
      LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
      LEFT JOIN (
      SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        WHERE sales_return_code.is_delete = 0
        GROUP BY sales_return.bill_id
      ) AS sr
      ON sr.bill_id = bill.id
      JOIN (
      SELECT SUM((bill.price - bill.discount) * (bill.quantity - COALESCE(sra.quantity, 0))) AS value, bill.bill_code_id
        FROM bill
      LEFT JOIN (
        SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        WHERE sales_return_code.is_delete = 0
        GROUP BY sales_return.bill_id
      )  AS sra
      ON bill.id = sra.bill_id
        GROUP BY bill.bill_code_id
      ) AS total
      ON bill_code.id = total.bill_code_id
      JOIN (
      SELECT SUM(package_content.quantity * (package_content.price - package_content.discount)) AS value, package_content.package_code_id
      FROM package_content
      GROUP BY package_code_id
      ) AS pv
      ON package_code.id = pv.package_code_id
      WHERE bill_code.is_delete = 0
    ) AS a
    ORDER BY a.date ASC
    """

    # Execute SQL query
    stock_outs = pd.read_sql(query, sql_engine)

    for i in range(len(stock_outs)):
        # Create loading bar in console log
        progress = round((i / len(stock_outs)) * 100)
        loading_bar = "=" * (progress // 10)
        print(f"Stock out sync progress: {loading_bar} {progress}% {i}/{len(stock_outs)}")

        

        quantity = float(stock_outs.iloc[i]['quantity'])
        while quantity > 0:
            if quantity == 0:
                break
            else:
                stock_in = mongo_stock_in_collection.find_one({
                    'itemID': int(stock_outs.iloc[i]['itemID']),
                    'residue': {'$gt': 0}
                }, sort=[('date', 1)])

                bill_code_id = int(stock_outs.iloc[i]['billCodeID']) if not pd.isna(stock_outs.iloc[i]['billCodeID']) else None
                bill_id = int(stock_outs.iloc[i]['billID']) if not pd.isna(stock_outs.iloc[i]['billID']) else None
                adjustment_case_id = int(stock_outs.iloc[i]['adjustmentCaseID']) if not pd.isna(stock_outs.iloc[i]['adjustmentCaseID']) else None
                adjustment_case_code_id = int(stock_outs.iloc[i]['adjustmentCaseCodeID']) if not pd.isna(stock_outs.iloc[i]['adjustmentCaseCodeID']) else None
                
                date_value = stock_outs.iloc[i]['date']
                if isinstance(date_value, pd.Timestamp):
                    date_value = date_value.to_pydatetime()  # Convert pandas Timestamp to datetime
                elif isinstance(date_value, d):  # Use the imported date class
                    date_value = datetime.combine(date_value, datetime.min.time())  # Convert date to datetime

                if stock_in is None:
                    mongo_overflow_collection.insert_one({
                        'itemID': int(stock_outs.iloc[i]['itemID']),
                        'date': date_value,
                        'quantity': quantity,
                        'billCodeID': bill_code_id,
                        'billID': bill_id,
                        'adjustmentCaseID': adjustment_case_id,
                        'adjustmentCaseCodeID': adjustment_case_code_id,
                        'value': float(stock_outs.iloc[i]['value']),
                    })
                    break
                else:
                    stock_in_residue = stock_in['residue']
                    if stock_in_residue >= quantity:
                        try:
                            stock_in['residue'] = stock_in_residue - quantity
                            mongo_stock_out_collection.insert_one({
                                'billCodeID': bill_code_id,
                                'billID': bill_id,
                                'adjustmentCaseID': adjustment_case_id,
                                'adjustmentCaseCodeID': adjustment_case_code_id,
                                'date': date_value,
                                'quantity': quantity,
                                'value': float(stock_outs.iloc[i]['value']),
                                'stockInID': stock_in['_id'],
                                'itemID': int(stock_outs.iloc[i]['itemID']),
                            })

                            quantity = 0
                            await mongo_stock_in_collection.update_one({'_id': stock_in['_id']}, {'$set': stock_in})
                        except Exception as e:
                            print(str(e))
                            raise
                        break
                    else:
                        try:
                            stock_in['residue'] = 0
                            mongo_stock_out_collection.insert_one({
                                'billCodeID': bill_code_id,
                                'billID': bill_id,
                                'adjustmentCaseID': adjustment_case_id,
                                'adjustmentCaseCodeID': adjustment_case_code_id,
                                'date': date_value,
                                'quantity': stock_in_residue,
                                'value': float(stock_outs.iloc[i]['value']),
                                'stockInID': stock_in['_id'],
                                'itemID': int(stock_outs.iloc[i]['itemID']),
                            })
                            quantity -= stock_in_residue
                            mongo_stock_in_collection.update_one({'_id': stock_in['_id']}, {'$set': stock_in})
                        except Exception as e:
                            print(str(e))
                            raise


# run the program
if __name__ == "__main__":
    import asyncio
    asyncio.run(sync_product_out_calculation())