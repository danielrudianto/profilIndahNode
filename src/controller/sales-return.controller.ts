import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import SalesReturnModel from "../model/sales_return.model";
import { mongoStockOutModel } from "../mongo-model/mongo-stock-in.model";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import { StockInModel } from "../model/stock-in.model";
import { IStockOutFetch, StockOutModel } from "../model/stock-out.model";
import { SalesReturnRepository } from "../repositories/sales-return.repository";

class SalesReturnController {
  private salesReturnRepository: SalesReturnRepository;

  constructor(salesReturnRepository: SalesReturnRepository) {
    this.salesReturnRepository = salesReturnRepository;
  }

  /**
   * Create sales return data
   * @param req
   * @param res
   * @returns Sales return data
   */
  static create = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const payment_method_id =
        req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
      const items = req.body.sales_return as any[];
      const userID = req.body.userId;

      if (items.length == 0) {
        return res.status(400).send(ErrorList["Parameter error"]);
      }

      const billIDs: number[] = items.map((x) => x.bill_id);
      const billItems = await BillModel.fetchByIDs(billIDs);
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

      const sales_return = await SalesReturnModel.create({
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
      });

      for (let i = 0; i < sales_return.sales_return.length; i++) {
        if (sales_return.sales_return[i].bill.item != null) {
          const stockOut = await StockOutModel.fetch(
            IStockOutFetch.BY_REFERENCE,
            {
              bill_id: sales_return.sales_return[i].bill_id,
              bill_code_id: sales_return.sales_return[i].bill.bill_code.id,
              adjustment_case_id: null,
              adjustment_case_code_id: null,
              item_id: sales_return.sales_return[i].bill.item!.id,
            }
          );

          let quantity = Number(sales_return.sales_return[i].quantity);
          while (quantity > 0) {
            for (let j = 0; j < stockOut.length; j++) {
              if (stockOut[j].quantity >= quantity) {
                // rollback stockin
                if (stockOut[j].stock_in_id != null) {
                  await StockInModel.rollBack([
                    {
                      id: stockOut[j].id!,
                      quantity: quantity,
                    },
                  ]);
                }

                stockOut[j].quantity -= quantity;
                stockOut[j].update();

                quantity = 0;
                break;
              } else if (stockOut[j].quantity < quantity) {
                // rollback stockin
                if (stockOut[j].stock_in_id != null) {
                  await StockInModel.rollBack([
                    {
                      id: stockOut[j].id!,
                      quantity: stockOut[j].quantity,
                    },
                  ]);
                }

                stockOut[j].quantity = 0;
                stockOut[j].update();

                quantity -= stockOut[j].quantity;
              }
            }
          }
        } else {
          for (
            let n = 0;
            n <
            sales_return.sales_return[i].bill.package_code!.package_content
              .length;
            n++
          ) {
            const stockOut = await StockOutModel.fetch(
              IStockOutFetch.BY_REFERENCE,
              {
                bill_id: sales_return.sales_return[i].bill_id,
                bill_code_id: sales_return.sales_return[i].bill.bill_code.id,
                item_id:
                  sales_return.sales_return[i].bill.package_code!
                    .package_content[n].item.id,
                adjustment_case_id: null,
                adjustment_case_code_id: null,
              }
            );

            let quantity =
              Number(sales_return.sales_return[i].quantity) *
              Number(
                sales_return.sales_return[i].bill.package_code!.package_content[
                  n
                ].quantity
              );

            while (quantity > 0) {
              for (let j = 0; j < stockOut.length; j++) {
                if (stockOut[j].quantity >= quantity) {
                  // rollback stockin
                  if (stockOut[j].stock_in_id != null) {
                    await StockInModel.rollBack([
                      {
                        id: stockOut[j].id!,
                        quantity: quantity,
                      },
                    ]);
                  }

                  stockOut[j].quantity -= quantity;
                  stockOut[j].update();

                  quantity = 0;
                  break;
                } else if (stockOut[j].quantity < quantity) {
                  // rollback stockin
                  if (stockOut[j].stock_in_id != null) {
                    await StockInModel.rollBack([
                      {
                        id: stockOut[j].id!,
                        quantity: stockOut[j].quantity,
                      },
                    ]);
                  }

                  stockOut[j].quantity = 0;
                  stockOut[j].update();

                  quantity -= stockOut[j].quantity;
                }
              }
            }
          }
        }
      }

      return res.status(201).send(sales_return);
    } catch (error) {
      console.error(`[error]: Error on creating sales return: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

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

  static fetchArchivesV2 = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;

    if (year == null && month == null) {
      SalesReturnModel.fetchArchiveYearsV2()!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                month: x.month,
                count: Number(x.count.toString().replace("n", "")),
              };
            })
          );
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const keyword = req.body.keyword;
      const page = req.body.page ?? 1;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const type = req.body.type;
      const status = req.body.status;

      SalesReturnModel.fetchArchiveV2({
        year: Number(year),
        month: Number(month),
        mode: type,
        status: status,
        limit: 20,
        offset: (page - 1) * 20,
        keyword: mysql_real_escape_string(keyword ?? ""),
        startDate: startDate,
        endDate: endDate,
      })!
        .then(([result, count]) => {
          return res.status(200).send({
            data: result.map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
              };
            }),
            count:
              count == null || count.length == 0
                ? 0
                : parseInt(count[0].count.toString().replace("n", "")),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching adjustment archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

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
