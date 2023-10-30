import { Request, Response } from "express";
import PdfPrinter from "pdfmake";
import BillCodeModel from "../model/bill_code.model";
import ExpenseModel from "../model/expense.model";
import PurchaseInvoiceModel, {
  CalculatePurchaseMode,
} from "../model/purchase-invoice.model";
import SalesDistributionModel from "../model/sales_distribution.model";
import path from "path";
import ExcelJS from "exceljs";
import {
  Alignment,
  Margins,
  PageBreak,
  PageOrientation,
  PageSize,
} from "pdfmake/interfaces";
import StockValueHelper from "../helper/stock_value.helper";
import { BrandModel } from "../model/brand.model";
import ItemTypeModel from "../model/item_type.model";
import SupplierModel from "../model/supplier.model";
import { ItemModel } from "../model/item.model";
import CompanyModel from "../model/company.model";
import StockCardHelper from "../helper/stock_card.helper";
import ProductStockModel from "../model/product-stock.model";
import DistributionStockModel from "../model/distribution_stock.model";
import { fetchMode } from "../interface/fetch.interface";
import { mongoStockInModel } from "../mongo-model/mongo-stock-in.model";
import ErrorList from "../assets/error_list";
import moment from "moment";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";

var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IDR",
});

var percentage_formatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

interface COGSModel {
  _id: number;
  totalStockoutValue: number;
  totalCOGS: number;
}

class ReportController {
  static monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  static fontDescriptors = {
    Roboto: {
      normal: path.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
      bold: path.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
      italics: path.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
      bolditalics: path.join(
        __dirname,
        "..",
        "assets",
        "/fonts/Roboto-MediumItalic.ttf"
      ),
    },
    Cairo: {
      normal: path.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
      bold: path.join(__dirname, "..", "assets", "/fonts/Cairo-Bold.ttf"),
    },
  };

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
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()),
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
                    value:
                      parseFloat(x.value.toString()) -
                      parseFloat(x.discount.toString()),
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
            break;
          case "package":
            return res.status(200).send(result);
            break;
          case "download":
            const workbook = new ExcelJS.Workbook();
            // Setting up workbook properties
            workbook.creator = "Toko Profil Indah";
            workbook.created = new Date();
            workbook.modified = new Date();
            workbook.lastModifiedBy = "Toko Profil Indah";

            const customerSheet = workbook.addWorksheet("Customers", {
              state: "visible",
            });

            customerSheet.addRow([
              "Name",
              "Value",
              "Discount",
              "Delivery",
              "Service",
            ]);

            (result[0] as any[]).forEach((data) => {
              customerSheet.addRow([
                data.customer_name,
                parseFloat(data.value.toString()),
                parseFloat(data.discount.toString()),
                parseFloat(data.delivery.toString()),
                parseFloat(data.service.toString()),
              ]);
            });

            customerSheet.getColumn(2).numFmt = "#,###.00";
            customerSheet.getColumn(3).numFmt = "#,###.00";
            customerSheet.getColumn(4).numFmt = "#,###.00";
            customerSheet.getColumn(5).numFmt = "#,###.00";

            customerSheet.getColumn(1).width = 18;
            customerSheet.getColumn(2).width = 25;
            customerSheet.getColumn(3).width = 25;
            customerSheet.getColumn(4).width = 25;
            customerSheet.getColumn(5).width = 25;

            const typeSheet = workbook.addWorksheet("Types", {
              state: "visible",
            });

            typeSheet.addRow(["Name", "Value"]);
            (result[1] as any[]).forEach((data) => {
              typeSheet.addRow([
                data.item_type_name,
                parseFloat(data.value.toString()),
              ]);
            });

            typeSheet.getColumn(2).numFmt = "#,###.00";

            typeSheet.getColumn(1).width = 18;
            typeSheet.getColumn(2).width = 25;

            const brandSheet = workbook.addWorksheet("Brands", {
              state: "visible",
            });

            brandSheet.addRow(["Name", "Value"]);
            (result[2] as any[]).forEach((data) => {
              brandSheet.addRow([
                data.item_brand_name,
                parseFloat(data.value.toString()),
              ]);
            });

            brandSheet.getColumn(2).numFmt = "#,###.00";

            brandSheet.getColumn(1).width = 18;
            brandSheet.getColumn(2).width = 25;

            workbook.xlsx
              .writeBuffer()
              .then((buffer) => {
                return res.status(200).send({
                  data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                    buffer
                  ).toString("base64")}`,
                });
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
            break;
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
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
          result.map((x) => {
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
        );
      })
      .catch((error) => {
        console.error(
          `[error]: Error on downloading inventory report ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

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

  static fetchQuickStats = (req: Request, res: Response) => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
      BillCodeModel.fetchTodaySales(todayDate),
      BillCodeModel.fetchTodaySales(yesterdayDate),
      PurchaseInvoiceModel.calculateTotalPurchase(
        todayDate.getFullYear(),
        todayDate.getMonth() + 1,
        CalculatePurchaseMode.Sum,
        todayDate.getDate()
      ),
      PurchaseInvoiceModel.calculateTotalPurchase(
        yesterdayDate.getFullYear(),
        yesterdayDate.getMonth() + 1,
        CalculatePurchaseMode.Sum,
        yesterdayDate.getDate()
      ),
      ExpenseModel.fetchTodaySum(),
    ])
      .then((result) => {
        const response = {
          sales:
            (result[0] as any[]).length == 0
              ? {
                  value: 0,
                  discount: 0,
                  service: 0,
                  delivery: 0,
                }
              : {
                  value:
                    (result[0] as any[])[0].value == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].value),
                  discount:
                    (result[0] as any[])[0].discount == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].discount),
                  delivery:
                    (result[0] as any[])[0].delivery == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].delivery),
                  service:
                    (result[0] as any[])[0].service == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].service),
                },
          sales_prev:
            (result[1] as any[]).length == 0
              ? {
                  value: 0,
                  discount: 0,
                  service: 0,
                  delivery: 0,
                }
              : {
                  value:
                    (result[1] as any[])[0].value == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].value),
                  discount:
                    (result[1] as any[])[0].discount == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].discount),
                  delivery:
                    (result[1] as any[])[0].delivery == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].delivery),
                  service:
                    (result[1] as any[])[0].service == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].service),
                },
          purchase: {
            value:
              (result[2] as any[])[0].value == null
                ? 0
                : parseFloat((result[2] as any[])[0].value),
            discount:
              (result[2] as any[])[0].discount == null
                ? 0
                : parseFloat((result[2] as any[])[0].discount),
          },
          purchase_prev: {
            value:
              (result[3] as any[])[0].value == null
                ? 0
                : parseFloat((result[3] as any[])[0].value),
            discount:
              (result[3] as any[])[0].discount == null
                ? 0
                : parseFloat((result[3] as any[])[0].discount),
          },
          expense: (result[4] as any[])[0].value,
        };

        return res.status(200).send(response);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
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
      ([result, brands, types]) => {
        switch (group) {
          case "brand":
            const brandResponse = brands.map((x) => {
              return {
                id: x.id,
                name: x.name,
                items: result
                  .filter((y) => y.item_brand_id == x.id)
                  .map((y) => {
                    return {
                      id: y.id,
                      reference: y.reference,
                      description: y.description,
                      brand: y.item_brand_name,
                      type: y.item_type_name,
                      input: y.adjustmentQuantityPlus + y.goodReceiptQuantity,
                      output:
                        y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
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
                    return {
                      id: y.id,
                      reference: y.reference,
                      description: y.description,
                      brand: y.item_brand_name,
                      type: y.item_type_name,
                      input: y.adjustmentQuantityPlus + y.goodReceiptQuantity,
                      output:
                        y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
                    };
                  }),
              };
            });

            return res.status(200).send(typeResponse);
        }
      }
    );

    // ItemModel.fetchValueByBrandType(brand, type, month, year)
    //   .then((result) => {
    // StockCardHelper.createStockReport(
    //       format,
    //       group,
    //       brand,
    //       type,
    //       result,
    //       function (buffer: any) {
    //         if (format == "xlsx") {
    //           return res.status(200).send({
    //             data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
    //               buffer
    //             ).toString("base64")}`,
    //           });
    //         } else if (format == "PDF") {
    //           return res.status(200).send({
    //             data: `data:application/pdf;base64,${Buffer.from(
    //               buffer
    //             ).toString("base64")}`,
    //           });
    //         }
    //       },
    //       function (error: any) {
    //         return res.status(500).send(error);
    //       }
    //     );
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
  };

  static fetchProductStockProblem = (req: Request, res: Response) => {
    const mode = req.body.mode;
    ProductStockModel.fetchProblematic().then((result) => {
      if (mode == "excel") {
        const rows: any[] = [["No", "Referensi", "Deskripsi", "Stock"]];
        result.forEach((data, index) => {
          rows.push([
            index + 1,
            data.item.reference,
            data.item.description,
            parseFloat(data.stock.toString()),
          ]);
        });
        // Create an excel file
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Toko Profil Indah";
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.lastModifiedBy = "Toko Profil Indah";

        const sheet = workbook.addWorksheet("Stock bermasalah", {
          state: "visible",
          views: [
            {
              state: "frozen",
              xSplit: 9,
              ySplit: 1,
            },
          ],
        });
        sheet.state = "visible";
        rows.forEach((data) => {
          sheet.addRow(data);
        });

        sheet.columns = [
          { header: "No", key: "no", width: 5 },
          { header: "Referensi", key: "reference", width: 20 },
          { header: "Deskripsi", key: "description", width: 50 },
          { header: "Stock", key: "stock", width: 10 },
        ];

        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { horizontal: "center" };
        sheet.getRow(1).height = 20;

        workbook.xlsx
          .writeBuffer()
          .then((buffer) => {
            return res.status(200).send({
              data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                buffer
              ).toString("base64")}`,
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      } else {
        // Create PDF
        const content = [];
        content.push({
          text: "Laporan Stok Bermasalah",
          bold: true,
          fontSize: 16,
          font: "Roboto",
          alignment: "center" as Alignment,
          margin: [0, 0, 0, 15] as Margins,
        });

        const table = [];
        table.push([
          {
            text: "No",
            bold: true,
            alignment: "center" as Alignment,
          },
          {
            text: "Referensi",
            bold: true,
            alignment: "center" as Alignment,
          },
          {
            text: "Deskripsi",
            bold: true,
            alignment: "center" as Alignment,
          },
          {
            text: "Stock",
            bold: true,
            alignment: "center" as Alignment,
          },
        ]);

        if (result.length > 0) {
          result.forEach((item, index) => {
            table.push([
              {
                text: index + 1,
                bold: false,
                alignment: "center" as Alignment,
              },
              {
                text: item.item.reference,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: item.item.description,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: `${item.stock} ${item.item.unit}`,
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);
          });

          content.push({
            layout: "lightHorizontalLines",
            table: {
              headerRows: 1,
              widths: ["auto", "auto", "*", "auto"],
              body: table,
            },
            margin: [0, 0, 0, 15] as Margins,
            pageBreak: "after" as PageBreak,
          });

          let documentDefinition = {
            pageSize: "A4" as PageSize,
            content: content,
          };

          const fontDescriptors = {
            Roboto: {
              normal: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Regular.ttf"
              ),
              bold: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Medium.ttf"
              ),
              italics: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Italic.ttf"
              ),
              bolditalics: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-MediumItalic.ttf"
              ),
            },
          };

          const printer = new PdfPrinter(fontDescriptors);
          const pdfDocument = printer.createPdfKitDocument(documentDefinition);
          let chunks: any[] = [];
          pdfDocument.on("data", function (chunk) {
            chunks.push(chunk);
          });
          pdfDocument.on("end", function () {
            var doc = Buffer.concat(chunks);
            return res.status(200).send({
              data: `data:application/pdf;base64,${doc.toString("base64")}`,
            });
          });
          pdfDocument.end();
        }
      }
    });
  };

  /**
   * Fetch expense report by month and year
   * @param req
   * @param res
   */
  static fetchExpenseReport = (req: Request, res: Response) => {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);

    ExpenseModel.fetchReport(month, year)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching expense report ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default ReportController;
