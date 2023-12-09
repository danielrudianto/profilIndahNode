import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";
import ExpenseModel from "../model/expense.model";
import PurchaseInvoiceModel, {
  CalculatePurchaseMode,
} from "../model/purchase-invoice.model";
import { ItemModel } from "../model/item.model";
import CompanyModel from "../model/company.model";
import { fetchMode } from "../interface/fetch.interface";
import { mongoStockInModel } from "../mongo-model/mongo-stock-in.model";
import ErrorList from "../assets/error_list";
import moment from "moment";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import { mongoProductModel } from "../mongo-model/mongo-product.model";

class ReportController {
  /**
   * Fetch money receipt
   * @param req
   * @param res
   */
  static fetchMoneyReceipt = (req: Request, res: Response) => {
    const date = new Date(req.body.date);

    BillCodeModel.fetchMoneyReceipt(moment(date).format("YYYY-MM-DD"))
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching money receipt ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch purchase report
   * Can be fetched by plain, supplier, type, brand
   * @param req
   * @param res
   */
  static fetchPurchaseReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;
    const calculatePurchaseMode =
      PurchaseInvoiceModel.calculatePurchaseMode(mode);

    if (calculatePurchaseMode == null) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    PurchaseInvoiceModel.calculateTotalPurchase(
      month,
      year,
      calculatePurchaseMode
    )!
      .then((result) => {
        switch (calculatePurchaseMode) {
          case CalculatePurchaseMode.Plain:
            const date = new Date(year, month, 0).getDate();
            const purchase_dates = new Array(date).fill(0);
            for (let purchase of result[0]) {
              purchase_dates[purchase.day - 1] =
                parseFloat(purchase.value) - parseFloat(purchase.discount);
            }
            return res.status(200).send({
              purchase: purchase_dates,
              purchase_detail: (result[1] as any[])
                .map((x) => {
                  return {
                    name: x.name,
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case CalculatePurchaseMode.Supplier:
            return res.status(200).send({
              purchase_detail: result
                .map((x) => {
                  return {
                    name: x.supplier_name,
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case CalculatePurchaseMode.Type:
            return res.status(200).send({
              purchase_detail: result
                .map((x) => {
                  return {
                    name: x.item_type_name,
                    value: parseFloat(x.value.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case CalculatePurchaseMode.Brand:
            return res.status(200).send({
              purchase_detail: result
                .map((x) => {
                  return {
                    name: x.item_brand_name,
                    value: parseFloat(x.value.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching purchase report ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Download purchase report
   * This report will then be converted to PDF or Excel
   * Defined by user, rendered by client-side application
   * @param req
   * @param res
   */
  static downloadPurchaseReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;

    PurchaseInvoiceModel.fetchReport({
      month: month,
      year: year,
    })
      .then(([goodReceiptResult, goodReceiptItemsResult]) => {
        return res.status(200).send({
          document: goodReceiptResult,
          items: goodReceiptItemsResult,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching purchase report ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch sales report
   * Can be fetched by plain, customer, type, brand, package
   * @param req
   * @param res
   */
  static fetchSalesReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;

    BillCodeModel.calculateTotalSales(month, year, mode)!
      .then((result) => {
        switch (mode) {
          case "plain":
            const date = new Date(year, month, 0).getDate();
            const sales_dates = new Array(date).fill(0);
            for (let sales of result[0]) {
              sales_dates[sales.day - 1] =
                parseFloat(sales.value) - parseFloat(sales.discount);
            }
            return res.status(200).send({
              sales: sales_dates,
              sales_detail: (result[1] as any[])
                .map((x) => {
                  return {
                    name: x.customer_name,
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()) +
                      parseFloat(x.delivery.toString()) +
                      parseFloat(x.service.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
            break;
          case "customer":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.customer_name,
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
            break;
          case "type":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.item_type_name,
                    value: parseFloat(x.value.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
            break;
          case "brand":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.item_brand_name,
                    value: parseFloat(x.value.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case "package":
            return res.status(200).send({
              sales_detail: result.map((x) => {
                return {
                  name: x.name,
                  description: x.description,
                  value: parseFloat(x.value.toString()),
                };
              }),
            });
          case "download":
            return res.status(200).send(
              (result as any[]).map((x) => {
                return {
                  ...x,
                  value: parseFloat(x.value.toString()),
                  discount: parseFloat(x.discount.toString()),
                  delivery: parseFloat(x.delivery.toString()),
                  service: parseFloat(x.service.toString()),
                };
              })
            );
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching sales report ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch current inventory value
   * @param req
   * @param res
   */
  static fetchInventoryReport = (req: Request, res: Response) => {
    mongoStockInModel
      .aggregate([
        {
          $group: {
            _id: "$companyID",
            value: {
              $sum: {
                $multiply: ["$price", "$residue"],
              },
            },
          },
        },
      ])
      .then(async (result) => {
        const companies = await CompanyModel.fetchAll();
        return res.status(200).send({
          value: result.reduce((a, b) => {
            return a + b.value;
          }, 0),
          company: companies.map((x) => {
            const index = result.findIndex((y) => {
              return y._id == x.id;
            });
            return {
              name: x.name,
              value: index == -1 ? 0 : result[index].value,
            };
          }),
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching inventory report. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Download list of items
   * In inventory report to acknowledge more about the items
   * @param req
   * @param res
   */
  static downloadInventoryReport = (req: Request, res: Response) => {
    mongoStockInModel
      .aggregate([
        // Match where residue > 0
        {
          $match: {
            $expr: {
              $gt: ["$residue", 0],
            },
          },
        },
        {
          $group: {
            _id: "$itemID",
            value: {
              $sum: {
                $multiply: ["$price", "$residue"],
              },
            },
            quantity: {
              $sum: "$residue",
            },
          },
        },
      ])
      .then(async (result) => {
        const items = await ItemModel.fetchByIDs(
          result.map((x) => {
            return x._id;
          })
        );

        return res.status(200).send(
          result
            .map((x) => {
              const itemIndex = items.findIndex((y) => y.id == x._id);
              if (itemIndex != -1) {
                return {
                  reference: items[itemIndex].reference,
                  description: items[itemIndex].description,
                  quantity: x.quantity,
                  unit: items[itemIndex].unit,
                  value: x.quantity == 0 ? 0 : x.value / x.quantity,
                  brand: items[itemIndex].item_brand_name,
                  type: items[itemIndex].item_type_name,
                };
              }
            })
            .filter((x) => x != undefined)
            .sort((a, b) => {
              return a!.reference.localeCompare(b!.reference);
            })
        );
      })
      .catch((error) => {
        console.error(
          `[error]: Error on downloading inventory report ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch profit and loss report data
   * @param req
   * @param res
   * @returns
   */
  static fetchPLStats = async (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);

    const [
      bills,
      purchases,
      companies,
      [expenses, expenseType],
      cogs,
      overflows,
    ] = await Promise.all([
      BillCodeModel.fetchSum(month, year),
      PurchaseInvoiceModel.calculateTotalPurchase(
        month,
        year,
        CalculatePurchaseMode.Sum
      ),
      CompanyModel.fetch("", 0, 0, fetchMode.All),
      ExpenseModel.fetchSum(month, year),
      mongoStockInModel.aggregate([
        {
          $unwind: {
            path: "$stockOut",
          },
        },
        {
          $project: {
            companyID: "$companyID",
            stockOut: "$stockOut",
            price: "$price",
            month: { $month: "$stockOut.date" },
            year: { $year: "$stockOut.date" },
          },
        },
        month == 0
          ? {
              $match: {
                year: year,
              },
            }
          : {
              $match: {
                month: month,
                year: year,
              },
            },
        {
          $group: {
            _id: "$companyID",
            totalStockoutValue: {
              $sum: { $multiply: ["$stockOut.quantity", "$stockOut.value"] },
            },
            totalCOGS: {
              $sum: { $multiply: ["$stockOut.quantity", "$price"] },
            },
          },
        },
      ]),
      mongoOverflowModel.aggregate([
        {
          $project: {
            month: { $month: "$date" },
            year: { $year: "$date" },
            value: "$value",
            quantity: "$quantity",
          },
        },
        month == 0
          ? {
              $match: {
                year: year,
              },
            }
          : {
              $match: {
                month: month,
                year: year,
              },
            },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: ["$value", "$quantity"],
              },
            },
          },
        },
      ]),
    ]);

    if (report == 0) {
      return res.status(200).send({
        companies: companies,
        bills:
          bills.length == 0
            ? {
                delivery: 0,
                discount: 0,
                value: 0,
                service: 0,
              }
            : {
                delivery: parseFloat(bills[0].delivery.toString()),
                discount: parseFloat(bills[0].discount.toString()),
                value: parseFloat(bills[0].value.toString()),
                service: parseFloat(bills[0].service.toString()),
              },
        purchases: purchases.map((x) => {
          return {
            value: parseFloat(x.value.toString()),
            discount: parseFloat(x.discount.toString()),
            name: x.name,
            company_id: x.company_id,
          };
        }),
        expenses: expenses,
        expenseType: expenseType
          .filter((x) => x.parent_id == null)
          .map((x) => {
            return {
              name: x.name,
              id: x.id,
              children: expenseType
                .filter((y) => y.parent_id == x.id)
                .map((y) => {
                  return {
                    name: y.name,
                    id: y.id,
                  };
                }),
            };
          }),
        cogs: cogs,
        overflows: overflows.length == 0 ? 0 : overflows[0].totalValue,
      });
    } else {
      const [billAppendix, purchaseAppendix, expenseAppendix] =
        await Promise.all([
          BillCodeModel.fetchAppendix(month, year),
          PurchaseInvoiceModel.fetchAppendix(month, year),
          ExpenseModel.fetchAppendix(month, year),
        ]);

      return res.status(200).send({
        companies: companies,
        bills:
          bills.length == 0
            ? {
                delivery: 0,
                discount: 0,
                value: 0,
                service: 0,
              }
            : {
                delivery: parseFloat(bills[0].delivery.toString()),
                discount: parseFloat(bills[0].discount.toString()),
                value: parseFloat(bills[0].value.toString()),
                service: parseFloat(bills[0].service.toString()),
              },
        purchases: purchases.map((x) => {
          return {
            value: parseFloat(x.value.toString()),
            discount: parseFloat(x.discount.toString()),
            name: x.name,
            company_id: x.company_id,
          };
        }),
        expenses: expenses,
        expenseType: expenseType
          .filter((x) => x.parent_id == null)
          .map((x) => {
            return {
              name: x.name,
              id: x.id,
              children: expenseType
                .filter((y) => y.parent_id == x.id)
                .map((y) => {
                  return {
                    name: y.name,
                    id: y.id,
                  };
                }),
            };
          }),
        cogs: cogs,
        appendix: {
          bills: billAppendix,
          purchases: purchaseAppendix,
          expenses: expenseAppendix,
        },
      });
    }
  };

  /**
   * Fetch sales item report
   * Get output report (item quantity)
   * @param req
   * @param res
   */
  static fetchSalesItemReport = (req: Request, res: Response) => {
    const brand = req.body.brand as number[];
    const type = req.body.type as number[];
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;

    ItemModel.fetchValueByBrandType(brand, type, month, year).then(
      async ([result, brands, types]) => {
        const stocks = await mongoProductModel.aggregate([
          {
            $match: {
              "stockCard.date": {
                $lt: new Date(`2023-${month}-01T00:00:00.000Z`),
              },
              itemTypeID: {
                $in: type,
              },
              itemBrandID: {
                $in: brand,
              },
            },
          },
          {
            $unwind: "$stockCard",
          },
          {
            $match: {
              "stockCard.date": {
                $lt: new Date(`2023-${month}-01T00:00:00.000Z`),
              },
            },
          },
          {
            $sort: {
              "stockCard.date": -1,
            },
          },
          {
            $group: {
              _id: "$_id",
              product: { $first: "$$ROOT" },
            },
          },
          {
            $replaceRoot: {
              newRoot: "$product",
            },
          },
        ]);
        switch (group) {
          case "brand":
            const brandResponse = brands.map((x) => {
              return {
                id: x.id,
                name: x.name,
                items: result
                  .filter((y) => y.item_brand_id == x.id)
                  .map((y) => {
                    const stockIndex = stocks.findIndex(
                      (z) => z.itemID == y.id
                    );
                    return {
                      id: y.id,
                      reference: y.reference,
                      description: y.description,
                      unit: y.unit,
                      brand: y.item_brand_name,
                      type: y.item_type_name,
                      input:
                        parseFloat(y.adjustmentQuantityPlus.toString()) +
                        parseFloat(y.goodReceiptQuantity.toString()),
                      output:
                        y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
                      initialStock:
                        stockIndex == -1
                          ? 0
                          : stocks[stockIndex].stockCard.currentStock,
                    };
                  }),
              };
            });

            return res.status(200).send(brandResponse);
          case "type":
            const typeResponse = types.map((x) => {
              return {
                id: x.id,
                name: x.name,
                items: result
                  .filter((y) => y.item_type_id == x.id)
                  .map((y) => {
                    const stockIndex = stocks.findIndex(
                      (z) => z.itemID == y.id
                    );
                    return {
                      id: y.id,
                      reference: y.reference,
                      description: y.description,
                      brand: y.item_brand_name,
                      type: y.item_type_name,
                      input:
                        parseFloat(y.adjustmentQuantityPlus.toString()) +
                        parseFloat(y.goodReceiptQuantity.toString()),
                      output:
                        y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
                      initialStock:
                        stockIndex == -1
                          ? 0
                          : stocks[stockIndex].stockCard.currentStock,
                    };
                  }),
              };
            });

            return res.status(200).send(typeResponse);
        }
      }
    );
  };

  static fetchProductStockProblem = (req: Request, res: Response) => {
    Promise.all([
      mongoProductModel
        .find({
          currentStock: {
            $lt: 0,
          },
        })
        .sort({ reference: 1 }),
    ])
      .then((result) => {
        return res.status(200).send(
          result[0].map((x) => {
            return {
              id: x.itemID,
              reference: x.reference,
              description: x.description,
              stock: x.currentStock,
              unit: x.unit,
            };
          })
        );
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching problematic stock data: ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch expense report by month and year
   * @param req
   * @param res
   */
  static fetchExpenseReport = async (req: Request, res: Response) => {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    const [expenses, expenseTypes, companies] = await ExpenseModel.fetchReport(
      month,
      year
    );

    const typeResponse = expenseTypes
      .filter((x) => x.parent_id == null)
      .map((x) => {
        return {
          name: x.name,
          id: x.id,
          children: expenseTypes
            .filter((y) => y.parent_id == x.id)
            .map((y) => {
              return {
                name: y.name,
                value: expenses
                  .filter((z) => z.expense_type_id == y.id)
                  .reduce((a, b) => {
                    return a + parseFloat(b.value.toString());
                  }, 0),
              };
            }),
          value: expenses
            .filter((y) => y.id == x.id)
            .reduce((a, b) => {
              return a + parseFloat(b.value.toString());
            }, 0),
        };
      });

    return res.status(200).send({
      companies: companies.map((company) => {
        return {
          name: company.name,
          value: expenses
            .filter((x) => x.company_id == company.id)
            .reduce((a, b) => {
              return a + parseFloat(b.value.toString());
            }, 0),
        };
      }),
      types: typeResponse,
    });
  };
}

export default ReportController;
