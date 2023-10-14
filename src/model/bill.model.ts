import { prisma } from "../app";

class BillModel {
  /**
   * Fetch bill based on ID array
   * To check if bill is already returned
   * @param ids
   * @returns
   */
  static fetchByIDs(ids: number[]) {
    // Need to calculate previously returned quantity
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT bill.id, bill_code_id, bill.quantity, 
      COALESCE(salesReturn.return_quantity, 0) AS return_quantity
      FROM bill
      LEFT JOIN (
        SELECT bill_id, SUM(quantity) AS return_quantity
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        WHERE sales_return_code.is_confirm = 1
        AND sales_return_code.is_delete = 0
        GROUP BY bill_id
      ) salesReturn
      ON bill.id = salesReturn.bill_id
      WHERE bill.id IN (${ids.join(",")})
    `);
  }

  /**
   * Fetch bill document based on bill ID only
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.bill.findUnique({
      where: {
        id: id,
      },
      select: {
        bill_code: {
          select: {
            name: true,
            date: true,
            discount: true,
            delivery: true,
            service: true,
            user_bill_code_created_byTouser: {
              select: {
                name: true,
              },
            },
            customer: {
              select: {
                name: true,
                address: true,
                npwp: true,
                pic: true,
              },
            },
            bill: {
              select: {
                item: {
                  select: {
                    reference: true,
                    description: true,
                    item_brand: {
                      select: {
                        name: true,
                      },
                    },
                    unit: true,
                  },
                },
                item_unit: {
                  select: {
                    unit: true,
                    conversion: true,
                  },
                },
                quantity: true,
                id: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Calculate salesman's sales
   * @param id
   */
  static fetchSalesByUserID(userID: number) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery, SUM(bill_code.service) AS service
      FROM bill
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND bill_code.created_by = ${userID}
    `);
  }
}

export default BillModel;
