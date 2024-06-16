import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";
import ExpenseModel from "../model/expense.model";
import PurchaseInvoiceModel, {
  CalculatePurchaseMode,
} from "../model/purchase-invoice.model";
import { ItemModel } from "../model/item.model";
import CompanyModel from "../model/company.model";
import { fetchMode } from "../interface/fetch.interface";
import {
  mongoStockInModel,
  mongoStockOutModel,
} from "../mongo-model/mongo-stock-in.model";
import ErrorList from "../assets/error_list";
import moment from "moment";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import { mongoProductModel } from "../mongo-model/mongo-product.model";
import PromotionModel from "../model/promotion.model";
import AdjustmentCaseModel from "../model/adjustment-case.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ReceivableController from "./receivable.controller";
import DepositModel from "../model/deposit.model";
import { mongoStockCardModel } from "../mongo-model/mongo-stock-card.model";
import SalesReturnModel from "../model/sales_return.model";

interface AdministratorDashboard {
  title: string;
  compare: boolean;
  current: number;
  previous?: number;
  code: number;
}

class ReportController {
  /**
   * Fetch money receipt
   * @param req
   * @param res
   */
  static fetchMoneyReceipt = (req: Request, res: Response) => {
    BillCodeModel.fetchMoneyReceipt(req.body.date)
      .then((result) => {
        const response: any[] = [];
        (result as any[]).forEach((x) => {
          if (
            (x.bill != null && x.bill > 0) ||
            (x.sales_return != null && x.sales_return > 0) ||
            (x.deposit != null && x.deposit > 0)
          ) {
            response.push({
              id: Number(x.id.toString().replace("n", "")),
              name: x.name,
              bill_payment: Number(x.bill),
              sales_return_payment: Number(x.sales_return),
              deposit_payment: Number(x.deposit),
            });
          }
        });

        return res
          .status(200)
          .send(response.sort((a, b) => a.name.localeCompare(b.name)));
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
                Number(purchase.value) - Number(purchase.discount);
            }
            return res.status(200).send({
              purchase: purchase_dates,
              purchase_detail: (result[1] as any[])
                .map((x) => {
                  return {
                    name: x.name,
                    value: x.value - x.discount,
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
                    name: x.name,
                    value: x.value - x.discount,
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
                    value: x.value,
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
                    value: x.value,
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case CalculatePurchaseMode.V2:
            const brandMap: any = {};
            const typeMap: any = {};
            const supplierMap: any = {};
            const dateMap: any = {};
            let total = 0;
            const codeID: number[] = [];

            result.forEach((item) => {
              total += Number(item.value);
              // Aggregate by brand
              if (!brandMap[item.item_brand_id]) {
                brandMap[item.item_brand_id] = {
                  name: item.item_brand_name,
                  item_brand_id: item.item_brand_id,
                  value: 0,
                };
              }
              brandMap[item.item_brand_id].value += Number(item.value);

              // Aggregate by type
              if (!typeMap[item.item_type_id]) {
                typeMap[item.item_type_id] = {
                  name: item.item_type_name,
                  item_type_id: item.item_type_id,
                  value: 0,
                };
              }
              typeMap[item.item_type_id].value += Number(item.value);

              // Aggregate by customer
              if (!supplierMap[item.supplier_id]) {
                supplierMap[item.supplier_id] = {
                  name: item.supplier_name,
                  supplier_id: item.supplier_id,
                  value: 0,
                };
              }
              supplierMap[item.supplier_id].value += Number(item.value);

              // Aggregate by date
              if (!dateMap[item.day]) {
                dateMap[item.day] = {
                  date: item.day,
                  delivery: 0,
                  service: 0,
                  discount: 0,
                  value: 0,
                };
              }

              dateMap[item.day].value += Number(item.value);

              if (!codeID.includes(item.id)) {
                dateMap[item.day].delivery += Number(item.delivery);
                dateMap[item.day].service += Number(item.service);
                dateMap[item.day].discount += Number(item.discount);
              }
            });

            const brands = Object.values(brandMap);
            const types = Object.values(typeMap);
            const suppliers = Object.values(supplierMap);
            const dates = Object.values(dateMap);
            const discount = dates.reduce((a, b: any) => a + b.discount, 0);

            return res.status(200).send({
              brand: brands.sort((a: any, b: any) => b.value - a.value),
              type: types.sort((a: any, b: any) => b.value - a.value),
              supplier: suppliers.sort((a: any, b: any) => b.value - a.value),
              discount: discount,
              date: dates.map((x: any) => {
                const date = Number(x.date.toString().replace("n", ""));
                return {
                  date: date,
                  value: Number(x.value),
                  discount: Number(x.discount),
                  count: new Set(
                    result.filter((z) => z.day == date).map((z) => z.id)
                  ).size,
                };
              }),
              count: result.length,
              total: total,
              // Transactions if the distinct bill_code_id number
              transactions: new Set(result.map((x) => x.id)).size,
            });
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching purchase report ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch dashboard purchase items
   */
  static fetchPurchaseDashboardV2 = (req: Request, res: Response) => {
    Promise.all([
      PurchaseInvoiceModel.fetchRecentPurchase(),
      PurchaseInvoiceModel.fetchOlderPurchase(),
    ])
      .then(
        ([
          [purchaseCurrentValue, purchasePreviousValue],
          [purchaseMonthCurrentValye, purchaseMonthPreviousValue],
        ]) => {}
      )
      .catch((error) => {
        console.error(`[error]: Error on fetching purchase report ${error}`);
        return res.status(500).send(error);
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
                Number(sales.value) - Number(sales.discount);
            }
            return res.status(200).send({
              sales: sales_dates,
              sales_detail: (result[1] as any[])
                .map((x) => {
                  return {
                    name: x.customer_name,
                    value:
                      Number(x.value) -
                      Number(x.discount) +
                      Number(x.delivery) +
                      Number(x.service),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case "customer":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.customer_name,
                    value: x.value - x.discount,
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case "type":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.item_type_name,
                    value: x.value,
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
                    value: x.value,
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
                  value: x.value,
                };
              }),
            });
          case "download":
            return res.status(200).send(
              (result as any[]).map((x) => {
                return {
                  ...x,
                  value: Number(x.value),
                  discount: Number(x.discount),
                  delivery: Number(x.delivery),
                  service: Number(x.service),
                };
              })
            );
          case "sales":
            return res.status(200).send({
              sales_detail: result
                .map((x) => {
                  return {
                    name: x.sales_name,
                    value: Number(x.value),
                    discount: Number(x.discount),
                    delivery: Number(x.delivery),
                    service: Number(x.service),
                    count: Number(x.count.toString()),
                  };
                })
                .sort((a, b) => {
                  return b.value - a.value;
                }),
            });
          case "V2":
            const brandMap: any = {};
            const typeMap: any = {};
            const customerMap: any = {};
            const salesMap: any = {};
            const dateMap: any = {};
            let total = 0;
            const codeID: number[] = [];

            SalesReturnModel.fetchValueByMonthYear(month, year)
              .then((returns) => {
                result.forEach((item) => {
                  total += Number(item.value);
                  // Aggregate by brand
                  if (!brandMap[item.item_brand_id]) {
                    brandMap[item.item_brand_id] = {
                      name: item.item_brand_name,
                      item_brand_id: item.item_brand_id,
                      value: 0,
                    };
                  }
                  brandMap[item.item_brand_id].value += Number(item.value);

                  // Aggregate by type
                  if (!typeMap[item.item_type_id]) {
                    typeMap[item.item_type_id] = {
                      name: item.item_type_name,
                      item_type_id: item.item_type_id,
                      value: 0,
                    };
                  }
                  typeMap[item.item_type_id].value += Number(item.value);

                  // Aggregate by customer
                  if (!customerMap[item.customer_id]) {
                    customerMap[item.customer_id] = {
                      name: item.customer_name,
                      customer_id: item.customer_id,
                      value: 0,
                    };
                  }
                  customerMap[item.customer_id].value += Number(item.value);

                  // Aggregate by sales
                  if (!salesMap[item.sales]) {
                    salesMap[item.sales] = {
                      name: item.sales,
                      value: 0,
                    };
                  }
                  salesMap[item.sales].value += Number(item.value);

                  // Aggregate by date
                  if (!dateMap[item.day]) {
                    dateMap[item.day] = {
                      date: item.day,
                      delivery: 0,
                      service: 0,
                      discount: 0,
                      value: 0,
                    };
                  }

                  dateMap[item.day].value += Number(item.value);

                  if (!codeID.includes(item.id)) {
                    dateMap[item.day].delivery += Number(item.delivery);
                    dateMap[item.day].service += Number(item.service);
                    dateMap[item.day].discount += Number(item.discount);
                  }
                });

                const brands = Object.values(brandMap);
                const types = Object.values(typeMap);
                const customers = Object.values(customerMap);
                const sales = Object.values(salesMap);
                const dates = Object.values(dateMap);
                const delivery = dates.reduce((a, b: any) => a + b.delivery, 0);
                const service = dates.reduce((a, b: any) => a + b.service, 0);
                const discount = dates.reduce((a, b: any) => a + b.discount, 0);

                return res.status(200).send({
                  brand: brands.sort((a: any, b: any) => b.value - a.value),
                  type: types.sort((a: any, b: any) => b.value - a.value),
                  customer: customers.sort(
                    (a: any, b: any) => b.value - a.value
                  ),
                  sales: sales,
                  delivery: delivery,
                  discount: discount,
                  service: service,
                  date: dates.map((x: any) => {
                    const date = Number(x.date.toString().replace("n", ""));
                    return {
                      date: date,
                      value: Number(x.value),
                      delivery: Number(x.delivery),
                      discount: Number(x.discount),
                      service: Number(x.service),
                      count: new Set(
                        result.filter((z) => z.day == date).map((z) => z.id)
                      ).size,
                    };
                  }),
                  count: result.length,
                  total: total,
                  // Transactions if the distinct bill_code_id number
                  transactions: new Set(result.map((x) => x.id)).size,
                  returns: new Set(returns.map((x) => x.bill_code_id)).size,
                  returned_value: returns.reduce(
                    (a, b) => a + Number(b.value),
                    0
                  ),
                });
              })
              .catch((error) => {
                console.error(
                  `[error]: Error on fetching sales report ${error}`
                );
                return res.status(500).send(ErrorList["Internal server error"]);
              });
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

    Promise.all([
      BillCodeModel.fetchSum(month, year),
      PurchaseInvoiceModel.calculateTotalPurchase(
        month,
        year,
        CalculatePurchaseMode.Sum
      ),
      CompanyModel.fetch("", 0, 0, fetchMode.All),
      ExpenseModel.fetchSum(month, year),
      mongoStockOutModel.aggregate([
        // Find the stock in value
        {
          $lookup: {
            from: "stock-ins",
            localField: "stockInID",
            foreignField: "_id",
            as: "stockIn",
          },
        },
        {
          $unwind: {
            path: "$stockIn",
          },
        },
        {
          $project: {
            companyID: "$stockIn.companyID",
            stockIn: "$stockIn",
            price: "$price",
            month: { $month: "$date" },
            year: { $year: "$date" },
            quantity: "$quantity",
            value: "$value",
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
              $sum: { $multiply: ["$quantity", "$value"] },
            },
            totalCOGS: {
              $sum: { $multiply: ["$quantity", "$stockIn.price"] },
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
    ]).then(
      ([
        bills,
        purchases,
        companies,
        [expenses, expenseType],
        cogs,
        overflows,
      ]) => {
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
                    delivery: bills[0].delivery,
                    discount: bills[0].discount,
                    value: bills[0].value,
                    service: bills[0].service,
                  },
            purchases:
              purchases == undefined
                ? []
                : purchases.map((x) => {
                    return {
                      value: x.value,
                      discount: x.discount,
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
          Promise.all([
            BillCodeModel.fetchAppendix(month, year),
            PurchaseInvoiceModel.fetchAppendix(month, year),
            ExpenseModel.fetchAppendix(month, year),
          ]).then(([billAppendix, purchaseAppendix, expenseAppendix]) => {
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
                      delivery: bills[0].delivery,
                      discount: bills[0].discount,
                      value: bills[0].value,
                      service: bills[0].service,
                    },
              purchases:
                purchases == undefined
                  ? []
                  : purchases.map((x) => {
                      return {
                        value: x.value,
                        discount: x.discount,
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
          });
        }
      }
    );
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
        mongoStockCardModel
          .aggregate([
            {
              $match: {
                itemID: {
                  $in: result.map((x) => x.id),
                },
                date: {
                  $lt: new Date(year, month - 1, 1),
                },
              },
            },
            {
              $group: {
                _id: "$itemID",
                currentStock: {
                  $sum: "$quantity",
                },
              },
            },
          ])
          .then((stocks) => {
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
                          (z) => z._id == y.id
                        );

                        return {
                          id: y.id,
                          reference: y.reference,
                          description: y.description,
                          unit: y.unit,
                          brand: y.item_brand_name,
                          type: y.item_type_name,
                          adjustment_input: Number(y.adjustmentQuantityPlus),
                          adjustment_output: Number(y.adjustmentQuantityMinus),
                          good_receipt_input: Number(y.goodReceiptQuantity),
                          bill_output: Number(y.billQuantity),
                          sales_return: Number(y.salesReturnQuantity),
                          initialStock:
                            stockIndex == -1
                              ? 0
                              : stocks[stockIndex].currentStock,
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
                          (z) => z._id == y.id
                        );

                        return {
                          id: y.id,
                          reference: y.reference,
                          description: y.description,
                          unit: y.unit,
                          brand: y.item_brand_name,
                          type: y.item_type_name,
                          adjustment_input: Number(y.adjustmentQuantityPlus),
                          adjustment_output: Number(y.adjustmentQuantityMinus),
                          good_receipt_input: Number(y.goodReceiptQuantity),
                          bill_output: Number(y.billQuantity),
                          sales_return: Number(y.salesReturnQuantity),
                          initialStock:
                            stockIndex == -1
                              ? 0
                              : stocks[stockIndex].currentStock,
                        };
                      }),
                  };
                });

                return res.status(200).send(typeResponse);
            }
          })
          .catch((error) => {
            console.error(`[error]: Error on fetching stock ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      }
    );
  };

  static fetchSalesItemDailyReport = (req: Request, res: Response) => {
    const day = req.body.day;
    const month = req.body.month;
    const year = req.body.year;

    const type = req.body.type as number[];

    const group = req.body.group;

    ItemModel.fetchValueByBrandTypeDaily(type, day, month, year).then(
      async ([result, types]) => {
        mongoStockCardModel
          .aggregate([
            {
              $match: {
                itemID: {
                  $in: result.map((x) => x.id),
                },
                date: {
                  $lt: new Date(year, month - 1, day),
                },
              },
            },
            {
              $group: {
                _id: "$itemID",
                currentStock: {
                  $sum: "$quantity",
                },
              },
            },
          ])
          .then((stocks) => {
            const typeResponse = types.map((x) => {
              return {
                id: x.id,
                name: x.name,
                items: result
                  .filter((y) => y.item_type_id == x.id)
                  .map((y) => {
                    const stockIndex = stocks.findIndex((z) => z._id == y.id);

                    return {
                      id: y.id,
                      reference: y.reference,
                      description: y.description,
                      unit: y.unit,
                      brand: y.item_brand_name,
                      type: y.item_type_name,
                      adjustment_input: Number(y.adjustmentQuantityPlus),
                      adjustment_output: Number(y.adjustmentQuantityMinus),
                      good_receipt_input: Number(y.goodReceiptQuantity),
                      bill_output: Number(y.billQuantity),
                      sales_return: Number(y.salesReturnQuantity),
                      initialStock:
                        stockIndex == -1 ? 0 : stocks[stockIndex].currentStock,
                    };
                  }),
              };
            });

            return res.status(200).send(typeResponse);
          })
          .catch((error) => {
            console.error(`[error]: Error on fetching stock ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
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
                    return a + Number(b.value);
                  }, 0),
              };
            }),
          value: expenses
            .filter((y) => y.id == x.id)
            .reduce((a, b) => {
              return a + Number(b.value);
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
              return a + Number(b.value);
            }, 0),
        };
      }),
      types: typeResponse,
    });
  };

  static fetchSalesDashboardV2 = (req: Request, res: Response) => {
    Promise.all([
      BillCodeModel.fetchRecentSales(),
      BillCodeModel.fetchOlderSales(),
      DepositModel.countActive(),
      PromotionModel.countActive(),
    ]).then(
      ([
        [billCurrentValue, billPreviousValue],
        [billCurrentMonthValue, billPreiousMonthValue],
        depositCurrentValue,
        promotionCurrentValue,
      ]) => {
        return res.status(200).send({
          sales: {
            current:
              billCurrentValue == null
                ? 0
                : billCurrentValue[0].value == null
                ? 0
                : Number(billCurrentValue[0].value),
            previous:
              billPreviousValue == null
                ? 0
                : billPreviousValue[0].value == null
                ? 0
                : Number(billPreviousValue[0].value),
          },
          sales_month: {
            current:
              billCurrentMonthValue == null
                ? 0
                : billCurrentMonthValue[0].value == null
                ? 0
                : Number(billCurrentMonthValue[0].value),
            previous:
              billPreiousMonthValue == null
                ? 0
                : billPreiousMonthValue[0].value == null
                ? 0
                : Number(billPreiousMonthValue[0].value),
          },
          deposit: depositCurrentValue,
          promotion: promotionCurrentValue,
        });
      }
    );
  };

  /**
   * Fetch dashboard data
   * @param req
   * @param res
   */
  static fetchSalesDashboard = (req: Request, res: Response) => {
    const today = new Date();
    const yesterday = new Date();

    const lastMonth = new Date();
    yesterday.setDate(today.getDate() - 1);
    lastMonth.setMonth(today.getMonth() - 1);

    Promise.all([
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      ),
      BillCodeModel.fetchByDate(
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      ),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        null
      ),
      BillCodeModel.fetchByDate(
        lastMonth.getFullYear(),
        lastMonth.getMonth() + 1,
        null
      ),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ),
      PromotionModel.countActive(),
      DepositModel.countActive(),
    ])
      .then(
        ([
          sales1,
          sales2,
          sales3,
          sales4,
          sales5,
          countPromotion,
          countDeposit,
        ]: any[]) => {
          return res.status(200).send({
            today: sales1[0].value == null ? 0 : Number(sales1[0].value),
            yesterday: sales2[0].value == null ? 0 : Number(sales2[0].value),
            thisMonth: sales3[0].value == null ? 0 : Number(sales3[0].value),
            lastMonth: sales4[0].value == null ? 0 : Number(sales4[0].value),
            monthOnMonth: sales5[0].value == null ? 0 : Number(sales5[0].value),
            count: countPromotion,
            receivable: ReceivableController.receivable,
            deposit: countDeposit,
          });
        }
      )
      .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch administrator dashboard data
   * @param req
   * @param res
   */
  static fetchAdministratorDashboardV2 = async (
    req: Request,
    res: Response
  ) => {
    Promise.all([
      BillCodeModel.fetchRecentSales(),
      PurchaseInvoiceModel.fetchRecentPurchase(),
      DepositModel.countActive(),
      PromotionModel.countActive(),
    ]).then(
      ([
        [billCurrentValue, billPreviousValue],
        [purchaseCurrentValue, purchasePreviousValue],
        depositCurrentValue,
        promotionCurrentValue,
      ]) => {
        return res.status(200).send({
          sales: {
            current:
              billCurrentValue == null
                ? 0
                : billCurrentValue[0].value == null
                ? 0
                : Number(billCurrentValue[0].value),
            previous:
              billPreviousValue == null
                ? 0
                : billPreviousValue[0].value == null
                ? 0
                : Number(billPreviousValue[0].value),
          },
          purchase: {
            current:
              purchaseCurrentValue == null
                ? 0
                : purchaseCurrentValue[0].value == null
                ? 0
                : Number(purchaseCurrentValue[0].value),
            previous:
              purchasePreviousValue == null
                ? 0
                : purchasePreviousValue[0].value == null
                ? 0
                : Number(purchasePreviousValue[0].value),
          },
          receivable: ReceivableController.receivable,
          deposit: depositCurrentValue,
          promotion: promotionCurrentValue,
        });
      }
    );
  };

  static fetchAdministratorDashboardV1 = async (
    req: Request,
    res: Response
  ) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    Promise.all([
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      ),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      ),
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      ),
      PurchaseInvoiceModel.fetchByDate(
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
      ),
      PromotionModel.countActive(),
      DepositModel.countActive(),
    ])
      .then(
        ([
          sales1,
          sales2,
          purchase1,
          purchase2,
          countPromotion,
          countDeposit,
        ]: any[]) => {
          return res.status(200).send({
            todaySales: sales1[0].value == null ? 0 : Number(sales1[0].value),
            yesterdaySales:
              sales2[0].value == null ? 0 : Number(sales2[0].value),
            todayPurchase:
              purchase1[0].value == null ? 0 : Number(purchase1[0].value),
            yesterdayPurchase:
              purchase2[0].value == null ? 0 : Number(purchase2[0].value),
            count: countPromotion,
            receivable: ReceivableController.receivable,
            deposit: countDeposit,
          });
        }
      )
      .catch((error) => {
        console.error(
          `[error]: Error on fetching administrator data. ${error}`
        );
        return res.status(500).send(error);
      });
  };

  static fetchOutputReportCompany = (req: Request, res: Response) => {
    const date = req.body.date;
    const company_id = req.body.company_id;
    mongoStockOutModel
      .aggregate([
        {
          // Look up the stock in
          $lookup: {
            from: "stock-ins",
            localField: "stockInID",
            foreignField: "_id",
            as: "stockIn",
          },
          // match the stock out date with parameter date
        },
        {
          $lookup: {
            from: "products",
            localField: "itemID",
            foreignField: "itemID",
            as: "product",
          },
        },
        {
          $unwind: {
            path: "$stockIn",
          },
        },
        {
          $unwind: {
            path: "$product",
          },
        },
        {
          $match: {
            date: {
              $gte: new Date(date),
              $lt: new Date(moment(date).add(1, "days").toISOString()),
            },
          },
        },
        {
          $match: {
            "stockIn.companyID": company_id,
          },
        },
      ])
      .then(async (result) => {
        const billNames = await BillCodeModel.fetchGeneralByIDs(
          result.filter((x) => x.billCodeID != null).map((x) => x.billCodeID)
        );

        const adjustmentCaseNames = await AdjustmentCaseModel.fetchGeneralByIDs(
          result
            .filter((x) => x.adjustmentCaseCodeID != null)
            .map((x) => x.adjustmentCaseCodeID)
        );

        const goodReceipts = await GoodReceiptModel.fetchByCompanyID(
          company_id,
          date
        );

        const adjustmentCases = await AdjustmentCaseModel.fetchByCompanyID(
          company_id,
          date
        );

        return res.status(200).send({
          output: result
            .map((x) => {
              if (x.billCodeID != null) {
                const billIndex = billNames.findIndex(
                  (y) => y.id == x.billCodeID
                );

                return {
                  reference: x.product.reference,
                  description: x.product.description,
                  quantity: x.quantity * -1,
                  unit: x.product.unit,
                  document: billIndex == -1 ? "" : billNames[billIndex].name,
                  opponent:
                    billIndex == -1 ? "" : billNames[billIndex].opponent,
                };
              } else if (x.adjusmtnentCaseCodeID != null) {
                const adjustmentCaseIndex = adjustmentCaseNames.findIndex(
                  (y) => y.id == x.adjustmentCaseCodeID
                );

                return {
                  reference: x.product.reference,
                  description: x.product.description,
                  quantity: x.quantity * -1,
                  unit: x.product.unit,
                  document:
                    adjustmentCaseIndex == -1
                      ? ""
                      : adjustmentCaseNames[adjustmentCaseIndex].name,
                  opponent: "Internal",
                };
              }
            })
            .sort((a, b) => {
              return a!.reference.localeCompare(b!.reference);
            }),
          input: [
            ...goodReceipts.map((x) => {
              return {
                reference: x.reference,
                description: x.description,
                quantity: Number(x.quantity),
                unit: x.unit,
                document: x.name,
                opponent: x.opponent,
              };
            }),
            ...adjustmentCases.map((x) => {
              return {
                reference: x.reference,
                description: x.description,
                quantity: Number(x.quantity),
                unit: x.unit,
                document: x.name,
                opponent: "Internal",
              };
            }),
          ].sort((a, b) => {
            return a.reference.localeCompare(b.reference);
          }),
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ReportController;
