import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import SalesReturnModel from "../model/sales_return.model";
import { StockReturnInterface } from "../interface/stock-in.interface";
import { mongoStockOutModel } from "../mongo-model/mongo-stock-in.model";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";

class SalesReturnController {
  /**
   * Create sales return data
   * @param req
   * @param res
   * @returns Sales return data
   */
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const payment_method_id =
      req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const items = req.body.sales_return as any[];
    const userID = req.body.userId;

    if (items.length == 0) {
      return res.status(400).send(ErrorList["Parameter error"]);
    }

    // Add checker for bill id
    const billIDs = items.map((x) => x.bill_id);
    BillModel.fetchByIDs(billIDs).then((billItems) => {
      for (let i = 0; i < billItems.length; i++) {
        const itemIndex = items.findIndex((x) => x.bill_id == billItems[i].id);

        if (itemIndex == -1) {
          return res.status(400).send(ErrorList["Parameter error"]);
        }

        if (
          billItems[i].quantity - billItems[i].return_quantity <
          items[itemIndex].quantity
        ) {
          return res.status(400).send(ErrorList["Parameter error"]);
        }
      }

      const name = `RJ-${date.getFullYear()}-${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}`;

      SalesReturnModel.create({
        name: name,
        date: date,
        created_by: userID,
        payment_method_id: payment_method_id,
        sales_return: items.map((x: any) => {
          return {
            bill_id: x.bill_id,
            quantity: x.quantity,
          };
        }),
      })
        .then(async (result) => {
          for (let i = 0; i < result.sales_return.length; i++) {
            if (result.sales_return[i].bill.item != null) {
              const stockReturn: StockReturnInterface = {
                itemID: result.sales_return[i].bill.item!.id,
                createdAt: result.created_at!,
                date: date,
                document: name,
                opponent:
                  result.sales_return[i].bill.bill_code.customer == null
                    ? "Retail customer"
                    : result.sales_return[i].bill.bill_code.customer!.name,
                displayQuantity: Number(result.sales_return[i].quantity),
                unit:
                  result.sales_return[i].bill.item_unit == null
                    ? result.sales_return[i].bill.item!.unit
                    : result.sales_return[i].bill.item_unit!.unit,
                quantity:
                  Number(result.sales_return[i].quantity) *
                  (result.sales_return[i].bill.item_unit == null
                    ? 1
                    : Number(
                        result.sales_return[i].bill.item_unit!.conversion
                      )),
                billID: result.sales_return[i].bill_id,
                billCodeID: result.sales_return[i].bill.bill_code.id,
                salesReturnCodeID: result.id,
                salesReturnID: result.sales_return[i].id,
                customerID:
                  result.sales_return[i].bill.bill_code.customer == null
                    ? null
                    : result.sales_return[i].bill.bill_code.customer!.id,
              };
              await queue.add("insert-stock-return", stockReturn);
            } else if (result.sales_return[i].bill.package_code != null) {
              for (
                let n = 0;
                n <
                result.sales_return[i].bill.package_code!.package_content
                  .length;
                n++
              ) {
                const stockReturn: StockReturnInterface = {
                  itemID:
                    result.sales_return[i].bill.package_code!.package_content[n]
                      .item.id,
                  createdAt: result.created_at!,
                  date: date,
                  document: name,
                  opponent:
                    result.sales_return[i].bill.bill_code.customer == null
                      ? "Retail customer"
                      : result.sales_return[i].bill.bill_code.customer!.name,
                  displayQuantity:
                    Number(result.sales_return[i].bill.quantity) *
                    Number(
                      result.sales_return[i].bill.package_code!.package_content[
                        n
                      ].quantity
                    ),
                  unit:
                    result.sales_return[i].bill.package_code!.package_content[n]
                      .item_unit == null
                      ? result.sales_return[i].bill.package_code!
                          .package_content[n].item!.unit
                      : result.sales_return[i].bill.package_code!
                          .package_content[n].item_unit!.unit,
                  quantity:
                    Number(result.sales_return[i].quantity) *
                    Number(
                      result.sales_return[i].bill.package_code!.package_content[
                        n
                      ].quantity
                    ) *
                    (result.sales_return[i].bill.item_unit == null
                      ? 1
                      : Number(
                          result.sales_return[i].bill.item_unit!.conversion
                        )),
                  billID: result.sales_return[i].bill_id,
                  billCodeID: result.sales_return[i].bill.bill_code.id,
                  salesReturnCodeID: result.id,
                  salesReturnID: result.sales_return[i].id,
                  customerID:
                    result.sales_return[i].bill.bill_code.customer == null
                      ? null
                      : result.sales_return[i].bill.bill_code.customer!.id,
                };
                await queue.add("insert-stock-return", stockReturn);
              }
            }
          }
          return res.status(201).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on creating sales return ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };

  /**
   * Search for a bill that can be returned
   * @param req
   * @param res
   * @returns Bill data
   */
  static fetchSearch = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const items = req.body.items as any[];
    const packages = req.body.packages as any[];

    SalesReturnModel.fetchSearch(date, items, packages)
      .then((result) => {
        return res.status(200).send(
          (result as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              date: x.date,
              customer: {
                name: x.customer_name,
              },
            };
          })
        );
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching sales return search ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch sales return archive
   * @param req
   * @param res
   * @return Sales return archive
   */
  static fetchArchives = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
      SalesReturnModel.fetchArchiveYears()
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                count: parseInt(x.count.toString()),
              };
            })
          );
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (year != null && month == null) {
      SalesReturnModel.fetchArchiveMonths(year)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      const page = req.body.limit.page;
      const keyword = req.body.search == null ? "" : req.body.search.keyword;
      const mode = req.body.mode;

      SalesReturnModel.fetchArchive({
        year: year,
        month: month,
        limit: 10,
        offset: (page - 1) * 10,
        keyword: mysql_real_escape_string(keyword),
        mode: mode,
      })!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                customer:
                  (x.customer_id == null) == null
                    ? null
                    : {
                        id: x.customer_id,
                        name: x.customer_name,
                      },
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString()),
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  /**
   * Fetch sales return by ID
   * @param req
   * @param res
   * @returns Sales return data
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        // Take the first bill to determine the bill code ID
        const bill_code_id = result.sales_return[0].bill.bill_code_id;
        BillCodeModel.fetchByID(bill_code_id).then((bill) => {
          if (!bill) {
            return res.status(404).send(ErrorList["Not found"]);
          }

          let total = 0;
          for (let item of result.sales_return) {
            total +=
              Number(item.quantity) *
              (Number(item.bill.price) - Number(item.bill.discount));
          }
          return res.status(200).send({
            ...result,
            bill: bill,
            customer:
              result?.sales_return.length == 0 ||
              result?.sales_return[0].bill.bill_code.customer == null
                ? null
                : {
                    name: result.sales_return[0].bill.bill_code.customer.name,
                  },
            total: total,
          });
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Delete sales return by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;
    SalesReturnModel.fetchByID(id).then((salesReturn) => {
      if (!salesReturn) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (salesReturn.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      SalesReturnModel.deleteByID(id, userID)
        .then(async (result) => {
          for (let i = 0; i < result.sales_return.length; i++) {
            await queue.add("delete-stock-return", {
              salesReturnID: result.sales_return[i].id,
            });

            if (result.sales_return[i].bill.item != null) {
              const overflowBill = await mongoOverflowModel.findOne({
                billID: result.sales_return[i].bill_id,
                itemID: result.sales_return[i].bill.item!.id,
              });

              if (overflowBill) {
                const itemUnit = result.sales_return[i].bill.item_unit;
                const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                await queue.add("insert-stock-out-plain", {
                  itemID: overflowBill.itemID,
                  billID: result.sales_return[i].bill_id,
                  billCodeID: result.sales_return[i].bill.bill_code.id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  date: result.date,
                  quantity:
                    Number(result.sales_return[i].quantity) * conversion,
                  value: overflowBill.value,
                });
              } else {
                const bill = await mongoStockOutModel.findOne({
                  billID: result.sales_return[i].bill_id,
                  itemID: result.sales_return[i].bill.item!.id,
                });

                if (!bill) {
                  console.error(`[error]: Bill not found`);
                } else {
                  const itemUnit = result.sales_return[i].bill.item_unit;
                  const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                  await queue.add("insert-stock-out-plain", {
                    itemID: bill.itemID,
                    billID: result.sales_return[i].bill_id,
                    billCodeID: result.sales_return[i].bill.bill_code.id,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    date: result.date,
                    quantity:
                      Number(result.sales_return[i].quantity) * conversion,
                    value: bill.value,
                  });
                }
              }
            } else if (result.sales_return[i].bill.package_code != null) {
              for (
                let n = 0;
                n <
                result.sales_return[i].bill.package_code!.package_content
                  .length;
                n++
              ) {
                const bill = await mongoStockOutModel.findOne({
                  billID: result.sales_return[i].bill_id,
                  itemID:
                    result.sales_return[i].bill.package_code!.package_content[n]
                      .item.id,
                });

                if (!bill) {
                  console.error(`[error]: Bill not found`);
                } else {
                  const itemUnit =
                    result.sales_return[i].bill.package_code!.package_content[n]
                      .item_unit;
                  const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
                  await queue.add("insert-stock-out", {
                    itemID: bill.itemID,
                    billID: result.sales_return[i].bill_id,
                    billCodeID: result.sales_return[i].bill.bill_code.id,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    date: result.date,
                    quantity:
                      Number(result.sales_return[i].quantity) *
                      Number(
                        result.sales_return[i].bill.package_code!
                          .package_content[n].quantity
                      ) *
                      conversion,
                    value: bill.value,
                  });
                }
              }
            }
          }
          return res.status(201).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    });
  };

  /**
   * Fetch sales return code by ID
   * @param req
   * @param res
   * @returns sales return code document
   */
  static fetchCodeByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchCodeByID(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default SalesReturnController;
