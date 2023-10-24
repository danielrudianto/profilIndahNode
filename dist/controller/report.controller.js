"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const pdfmake_1 = __importDefault(require("pdfmake"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const purchase_invoice_model_1 = __importStar(require("../model/purchase-invoice.model"));
const path_1 = __importDefault(require("path"));
const exceljs_1 = __importDefault(require("exceljs"));
const item_model_1 = require("../model/item.model");
const company_model_1 = __importDefault(require("../model/company.model"));
const stock_card_helper_1 = __importDefault(require("../helper/stock_card.helper"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const fetch_interface_1 = require("../interface/fetch.interface");
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
const error_list_1 = __importDefault(require("../assets/error_list"));
const moment_1 = __importDefault(require("moment"));
var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
});
var percentage_formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});
class ReportController {
}
_a = ReportController;
ReportController.monthNames = [
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
ReportController.fontDescriptors = {
    Roboto: {
        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
        italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
        bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
    },
    Cairo: {
        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Bold.ttf"),
    },
};
/**
 * Fetch money receipt
 * @param req
 * @param res
 */
ReportController.fetchMoneyReceipt = (req, res) => {
    const date = new Date(req.body.date);
    bill_code_model_1.default.fetchMoneyReceipt((0, moment_1.default)(date).format("YYYY-MM-DD"))
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching money receipt ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch purchase report
 * Can be fetched by plain, supplier, type, brand
 * @param req
 * @param res
 */
ReportController.fetchPurchaseReport = (req, res) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;
    const calculatePurchaseMode = purchase_invoice_model_1.default.calculatePurchaseMode(mode);
    if (calculatePurchaseMode == null) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    purchase_invoice_model_1.default.calculateTotalPurchase(month, year, calculatePurchaseMode)
        .then((result) => {
        switch (calculatePurchaseMode) {
            case purchase_invoice_model_1.CalculatePurchaseMode.Plain:
                const date = new Date(year, month, 0).getDate();
                const purchase_dates = new Array(date).fill(0);
                for (let purchase of result[0]) {
                    purchase_dates[purchase.day - 1] =
                        parseFloat(purchase.value) - parseFloat(purchase.discount);
                }
                return res.status(200).send({
                    purchase: purchase_dates,
                    purchase_detail: result[1]
                        .map((x) => {
                        return {
                            name: x.supplier_name,
                            value: parseFloat(x.value.toString()) -
                                parseFloat(x.discount.toString()),
                        };
                    })
                        .sort((a, b) => {
                        return b.value - a.value;
                    }),
                });
            case purchase_invoice_model_1.CalculatePurchaseMode.Supplier:
                return res.status(200).send({
                    purchase_detail: result
                        .map((x) => {
                        return {
                            name: x.supplier_name,
                            value: parseFloat(x.value.toString()) -
                                parseFloat(x.discount.toString()),
                        };
                    })
                        .sort((a, b) => {
                        return b.value - a.value;
                    }),
                });
            case purchase_invoice_model_1.CalculatePurchaseMode.Type:
                return res.status(200).send({
                    purchase_detail: result
                        .map((x) => {
                        return {
                            name: x.item_type_name,
                            value: parseFloat(x.value.toString()) -
                                parseFloat(x.discount.toString()),
                        };
                    })
                        .sort((a, b) => {
                        return b.value - a.value;
                    }),
                });
            case purchase_invoice_model_1.CalculatePurchaseMode.Brand:
                return res.status(200).send({
                    purchase_detail: result
                        .map((x) => {
                        return {
                            name: x.item_brand_name,
                            value: parseFloat(x.value.toString()) -
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
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Download purchase report
 * This report will then be converted to PDF or Excel
 * Defined by user, rendered by client-side application
 * @param req
 * @param res
 */
ReportController.downloadPurchaseReport = (req, res) => {
    const month = req.body.month;
    const year = req.body.year;
    purchase_invoice_model_1.default.fetchReport({
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
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch sales report
 * Can be fetched by plain, customer, type, brand, package
 * @param req
 * @param res
 */
ReportController.fetchSalesReport = (req, res) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;
    bill_code_model_1.default.calculateTotalSales(month, year, mode)
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
                    sales_detail: result[1]
                        .map((x) => {
                        return {
                            name: x.customer_name,
                            value: parseFloat(x.value.toString()) -
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
                            value: parseFloat(x.value.toString()) -
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
                const workbook = new exceljs_1.default.Workbook();
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
                result[0].forEach((data) => {
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
                result[1].forEach((data) => {
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
                result[2].forEach((data) => {
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
                        data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
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
ReportController.fetchInventoryReport = (req, res) => {
    mongo_stock_in_model_1.mongoStockInModel
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
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const companies = yield company_model_1.default.fetchAll();
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
    }))
        .catch((error) => {
        console.error(`[error]: Error on fetching inventory report. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Download list of items
 * In inventory report to acknowledge more about the items
 * @param req
 * @param res
 */
ReportController.downloadInventoryReport = (req, res) => {
    mongo_stock_in_model_1.mongoStockInModel
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
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const items = yield item_model_1.ItemModel.fetchByIDs(result.map((x) => {
            return x._id;
        }));
        return res.status(200).send(result.map((x) => {
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
        }));
    }))
        .catch((error) => {
        console.error(`[error]: Error on downloading inventory report ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
ReportController.fetchPLStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);
    const startCOGSDate = month == 0 ? new Date(year - 1, 11, 31) : new Date(year, month - 1, 0);
    const endCOGSDate = month == 0 ? new Date(year, 11, 31) : new Date(year, month, 0);
    const [bills, purchases, companies, expenses, cogs] = yield Promise.all([
        bill_code_model_1.default.fetchSum(month, year),
        purchase_invoice_model_1.default.calculateTotalPurchase(month, year, purchase_invoice_model_1.CalculatePurchaseMode.Sum),
        company_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.All),
        expense_model_1.default.fetchSum(month, year),
        mongo_stock_in_model_1.mongoStockInModel.aggregate([
            {
                $match: {
                    date: {
                        $lt: endCOGSDate,
                    },
                    "stockOut.date": {
                        $gte: startCOGSDate,
                        $lte: endCOGSDate,
                    },
                },
            },
            {
                $unwind: {
                    path: "$stockOut",
                },
            },
            {
                $group: {
                    _id: "$companyID",
                    totalStockoutValue: {
                        $sum: { $multiply: ["$stockOut.quantity", "$stockOut.value"] },
                    },
                    totalCOGS: {
                        $sum: { $multiply: ["$stockIn.price", "$stockOut.quantity"] },
                    },
                },
            },
        ]),
    ]);
    if (report == 0) {
        return res.status(200).send({
            companies: companies,
            bills: bills.length == 0
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
            expenses: expenses.map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    parent_id: x.parent_id,
                    value: parseFloat(x.value.toString()),
                    company_id: x.company_id,
                };
            }),
            cogs: cogs,
        });
    }
    else {
        const [billAppendix, purchaseAppendix, expenseAppendix] = yield Promise.all([
            bill_code_model_1.default.fetchAppendix(month, year),
            purchase_invoice_model_1.default.fetchAppendix(month, year),
            expense_model_1.default.fetchAppendix(month, year),
        ]);
        return res.status(200).send({
            data: {
                companies: companies,
                bills: bills.length == 0
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
                expenses: expenses.map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        parent_id: x.parent_id,
                        value: parseFloat(x.value.toString()),
                        company_id: x.company_id,
                    };
                }),
                cogs: cogs,
            },
            appendix: {
                bills: billAppendix,
                purchases: purchaseAppendix,
                expenses: expenseAppendix,
            },
        });
    }
});
//   if (report == 0) {
//     Promise.all([
//       BillCodeModel.fetchSum(month, year),
//       SalesDistributionModel.fetchSum(month, year),
//       PurchaseInvoiceModel.calculateTotalPurchase(
//         month,
//         year,
//         CalculatePurchaseMode.Sum
//       ),
//       CompanyModel.fetch("", 0, 0, fetchMode.All),
//       ExpenseModel.fetchSum(month, year),
//       month == 0
//         ? StockValueHelper.fetchCOGS(
//             new Date(year - 1, 11, 31),
//             new Date(year, 11, 31)
//           )
//         : StockValueHelper.fetchCOGS(
//             new Date(year, month - 1, 0),
//             new Date(year, month, 0)
//           ),
//     ])
//       .then((result) => {
//         const sales_table = [];
//         let total_sales_value: any[] = [];
//         const sales_value =
//           (result[0] as any[])[0].value == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].value.toString());
//         const sales_discount =
//           (result[0] as any[])[0].discount == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].discount.toString());
//         const sales_delivery =
//           (result[0] as any[])[0].delivery == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].delivery.toString());
//         const sales_service =
//           (result[0] as any[])[0].service == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].service.toString());
//         // Sales table
//         sales_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Jasa",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Pengiriman Barang",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         let total_value = 0;
//         (result[1] as any[]).forEach((x) => {
//           total_value += parseFloat(x.value.toString());
//           total_sales_value.push({
//             id: x.company_id,
//             value: parseFloat(x.value.toString()),
//           });
//           sales_table.push([
//           ]);
//         });
//         sales_table.push([
//         ]);
//         sales_table.push([
//         ]);
//         const purchase_table = [];
//         let total_purchase_value = 0;
//         let total_purchase_discount = 0;
//         purchase_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Potongan Harga",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         (result[2] as any[]).forEach((x) => {
//           purchase_table.push([
//             {
//               text: `${x.name}`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.value.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.discount.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(
//                 parseFloat(x.value.toString()) -
//                   parseFloat(x.discount.toString())
//               ),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//           total_purchase_value += parseFloat(x.value.toString());
//           total_purchase_discount += parseFloat(x.discount.toString());
//         });
//         purchase_table.push([
//           {
//             text: "Keseluruhan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(total_purchase_value),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(total_purchase_discount),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               total_purchase_value - total_purchase_discount
//             ),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         const expense_section: any[] = [
//           {
//             text: "Pengeluaran",
//             bold: true,
//             fontSize: 14,
//             alignment: "center" as Alignment,
//             margin: [0, 0, 0, 15] as Margins,
//             tocItem: true,
//             pageOrientation: "landscape" as PageOrientation,
//           },
//         ];
//         let total_expense_value: any[] = [];
//         (result[3] as any[]).forEach((company, companyIndex) => {
//           const expense_table: any[] = [];
//           const expenses: any[] = [];
//           total_expense_value.push({
//             id: company.id,
//             value: 0,
//           });
//           expense_section.push({
//             text: company.name,
//             bold: true,
//             fontSize: 14,
//             alignment: "left" as Alignment,
//             margin: [0, 0, 0, 15] as Margins,
//             pageOrientation: "landscape" as PageOrientation,
//           });
//           let expense_value = 0;
//           expense_table.push([
//             {
//               text: "Tipe",
//               bold: true,
//               alignment: "left" as Alignment,
//               fontSize: 12,
//             },
//             {
//               text: "Nominal",
//               bold: true,
//               alignment: "left" as Alignment,
//               fontSize: 12,
//             },
//           ]);
//           (result[4] as any[])
//             .filter((x) => x.parent_id == null && x.company_id == company.id)
//             .forEach((y) => {
//               expenses.push({
//                 ...y,
//                 value: 0,
//                 children: [],
//               });
//               const child_expenses = (result[4] as any[]).filter(
//                 (z) => z.parent_id == y.id && z.company_id == company.id
//               );
//               child_expenses.forEach((child_expense) => {
//                 const index = expenses.findIndex(
//                   (expense) => expense.id == child_expense.parent_id
//                 );
//                 if (index != -1) {
//                   expenses[index].children.push(child_expense);
//                   expenses[index].value += parseFloat(
//                     child_expense.value.toString()
//                   );
//                   expense_value += parseFloat(child_expense.value.toString());
//                   total_expense_value[companyIndex].value += parseFloat(
//                     child_expense.value.toString()
//                   );
//                 }
//               });
//             });
//           expenses.forEach((expense) => {
//             expense_table.push([
//               {
//                 text: expense.name,
//                 bold: true,
//                 alignment: "left" as Alignment,
//                 fontSize: 12,
//               },
//               {
//                 text: formatter.format(parseFloat(expense.value.toString())),
//                 bold: true,
//                 alignment: "left" as Alignment,
//                 fontSize: 12,
//               },
//             ]);
//             if (expense.children.length > 0) {
//               (expense.children as any[]).forEach((child_expense) => {
//                 expense_table.push([
//                   {
//                     text: `${expense.name}/${child_expense.name}`,
//                     bold: false,
//                     alignment: "left" as Alignment,
//                     fontSize: 12,
//                   },
//                   {
//                     text: formatter.format(
//                       parseFloat(child_expense.value.toString())
//                     ),
//                     bold: false,
//                     alignment: "left" as Alignment,
//                     fontSize: 12,
//                   },
//                 ]);
//               });
//             }
//           });
//           expense_table.push([
//             {
//               text: "Total",
//               bold: true,
//               alignment: "left" as Alignment,
//               fontSize: 12,
//             },
//             {
//               text: formatter.format(expense_value),
//               bold: true,
//               alignment: "left" as Alignment,
//               fontSize: 12,
//             },
//           ]);
//           expense_section.push({
//             layout: "lightHorizontalLines",
//             table: {
//               headerRows: 1,
//               widths: ["*", "*"],
//               body: expense_table,
//             },
//             margin: [0, 0, 0, 15] as Margins,
//             pageOrientation: "landscape" as PageOrientation,
//           });
//         });
//         const hpp_table = [];
//         let hpp_value = 0;
//         hpp_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         let cogs_value: any[] = [];
//         (result[5] as any[]).forEach((x) => {
//           const name = x.f2;
//           const value = parseFloat(x.f0);
//           const company_id = x.f1;
//           cogs_value.push({
//             id: company_id,
//             name: name,
//             value: value,
//           });
//         });
//         cogs_value.forEach((cogs) => {
//           hpp_value += cogs.value;
//           hpp_table.push([
//             {
//               text: cogs.name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(cogs.value),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         hpp_table.push([
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(hpp_value),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         const summary_section: any[] = [
//           {
//             text: "Laba / Rugi",
//             bold: true,
//             fontSize: 14,
//             alignment: "center" as Alignment,
//             margin: [0, 0, 0, 10] as Margins,
//             pageBreak: "before" as PageBreak,
//             tocItem: true,
//             pageOrientation: "landscape" as PageOrientation,
//           },
//         ];
//         // result[3]!.forEach((x) => {
//         //   summary_section.push({
//         //     text: x.name!,
//         //     bold: true,
//         //     fontSize: 14,
//         //     alignment: "left" as Alignment,
//         //     margins: [0, 0, 0, 15] as Margins,
//         //     pageOrientation: "landscape" as PageOrientation,
//         //   });
//         //   const summary_table: any[] = [
//         //     [
//         //       {
//         //         text: "Keterangan",
//         //         bold: true,
//         //         alignment: "left" as Alignment,
//         //         fontSize: 12,
//         //       },
//         //       {
//         //         text: "Nominal",
//         //         bold: true,
//         //         alignment: "left" as Alignment,
//         //         fontSize: 12,
//         //       },
//         //       {
//         //         text: "Persentase",
//         //         bold: true,
//         //         alignment: "left" as Alignment,
//         //         fontSize: 12,
//         //       },
//         //     ],
//         //   ];
//         //   const sales_value_company_index = total_sales_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let sales_value_company = 0;
//         //   if (sales_value_company_index != -1) {
//         //     sales_value_company =
//         //       total_sales_value[sales_value_company_index].value;
//         //   }
//         //   const cogs_value_company_index = cogs_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let cogs_value_company = 0;
//         //   if (cogs_value_company_index != -1) {
//         //     cogs_value_company = cogs_value[cogs_value_company_index].value;
//         //   }
//         //   const expense_value_company_index = total_expense_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let expense_value_company = 0;
//         //   if (expense_value_company_index != -1) {
//         //     expense_value_company =
//         //       total_expense_value[expense_value_company_index].value;
//         //   }
//         //   summary_table.push([
//         //     {
//         //       text: "Laba kotor",
//         //       bold: true,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text: formatter.format(
//         //         sales_value_company - cogs_value_company
//         //       ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text:
//         //         sales_value_company == 0
//         //           ? "0.00%"
//         //           : percentage_formatter.format(
//         //               (sales_value_company - cogs_value_company) /
//         //                 sales_value_company
//         //             ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //   ]);
//         //   summary_table.push([
//         //     {
//         //       text: "Laba bersih",
//         //       bold: true,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text: formatter.format(
//         //         sales_value_company -
//         //           cogs_value_company -
//         //           expense_value_company
//         //       ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text:
//         //         sales_value_company == 0
//         //           ? "0.00%"
//         //           : percentage_formatter.format(
//         //               (sales_value_company -
//         //                 cogs_value_company -
//         //                 expense_value_company) /
//         //                 sales_value_company
//         //             ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //   ]);
//         //   summary_section.push({
//         //     layout: "lightHorizontalLines",
//         //     table: {
//         //       headerRows: 1,
//         //       widths: ["*", "*", "*"],
//         //       body: summary_table,
//         //     },
//         //     margin: [0, 0, 0, 15] as Margins,
//         //     pageOrientation: "landscape" as PageOrientation,
//         //   });
//         // });
//
//             {
//               text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Pembelian",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "*", "*", "*"],
//                 body: purchase_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Harga Pokok Penjualan",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               tocItem: true,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["*", "*"],
//                 body: hpp_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//             },
//             {
//               text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//             },
//             ...expense_section,
//             ...summary_section,
//           ],
//           footer: (currentPage: number, pageCount: number) => {
//             return {
//               text: currentPage.toString() + " of " + pageCount,
//               alignment: "center" as Alignment,
//               bold: false,
//               fontSize: 8,
//             };
//           },
//           pageMargins: [20, 60, 20, 20] as Margins,
//         };
//         const printer = new PdfPrinter(this.fontDescriptors);
//         const pdfDocument = printer.createPdfKitDocument(documentDefinition);
//         let chunks: any[] = [];
//         var pdfResult;
//         pdfDocument.on("data", function (chunk: any) {
//           chunks.push(chunk);
//         });
//         pdfDocument.on("end", function () {
//           pdfResult = Buffer.concat(chunks);
//           return res.status(200).send({
//             data: `data:application/pdf;base64,${pdfResult.toString(
//               "base64"
//             )}`,
//           });
//         });
//         pdfDocument.end();
//       })
//       .catch((error) => {
//         return res.status(500).send(error);
//       });
//   } else {
//     Promise.all([
//       BillCodeModel.fetchSum(month, year),
//       SalesDistributionModel.fetchSum(month, year),
//       PurchaseInvoiceModel.calculateTotalPurchase(
//         month,
//         year,
//         CalculatePurchaseMode.Sum
//       ),
//       CompanyModel.fetch("", 0, 0, fetchMode.All),
//       ExpenseModel.fetchSum(month, year),
//       month == 0
//         ? StockValueHelper.fetchCOGS(
//             new Date(year - 1, 11, 31),
//             new Date(year, 11, 31)
//           )
//         : StockValueHelper.fetchCOGS(
//             new Date(year, month - 1, 0),
//             new Date(year, month, 0)
//           ),
//       BillCodeModel.fetchAppendix(month, year),
//       PurchaseInvoiceModel.fetchAppendix(month, year),
//       ExpenseModel.fetchAppendix(month, year),
//     ])
//       .then((result) => {
//         const sales_table = [];
//         let total_sales_value: any[] = [];
//         const sales_value =
//           (result[0] as any[])[0].value == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].value.toString());
//         const sales_discount =
//           (result[0] as any[])[0].discount == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].discount.toString());
//         const sales_delivery =
//           (result[0] as any[])[0].delivery == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].delivery.toString());
//         const sales_service =
//           (result[0] as any[])[0].service == null
//             ? 0
//             : parseFloat((result[0] as any[])[0].service.toString());
//         // Sales table
//         sales_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Jasa",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Pengiriman Barang",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         let total_value = 0;
//         (result[1] as any[]).forEach((x) => {
//           total_value += parseFloat(x.value.toString());
//           total_sales_value.push({
//             id: x.company_id,
//             value: parseFloat(x.value.toString()),
//           });
//           sales_table.push([
//             {
//               text: x.name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.value.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: "N/A",
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: "N/A",
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.value.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         sales_table.push([
//           {
//             text: "Total penjualan teralokasi",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(total_value),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(sales_delivery),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(sales_service),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               total_value + sales_delivery + sales_service
//             ),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         sales_table.push([
//           {
//             text: "Penjualan tidak teralokasi",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               sales_value - sales_discount - total_value
//             ),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "N/A",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "N/A",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               sales_value - sales_discount - total_value
//             ),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         sales_table.push([
//           {
//             text: "Keseluruhan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(sales_value - sales_discount),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(sales_service),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(sales_delivery),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               sales_value - sales_discount + sales_delivery + sales_service
//             ),
//             bold: true,
//             aligment: "left" as Alignment,
//           },
//         ]);
//         const purchase_table = [];
//         let total_purchase_value = 0;
//         let total_purchase_discount = 0;
//         purchase_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Potongan Harga",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         (result[2] as any[]).forEach((x) => {
//           purchase_table.push([
//             {
//               text: `${x.name}`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.value.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(parseFloat(x.discount.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(
//                 parseFloat(x.value.toString()) -
//                   parseFloat(x.discount.toString())
//               ),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//           total_purchase_value += parseFloat(x.value.toString());
//           total_purchase_discount += parseFloat(x.discount.toString());
//         });
//         purchase_table.push([
//           {
//             text: "Keseluruhan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(total_purchase_value),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(total_purchase_discount),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(
//               total_purchase_value - total_purchase_discount
//             ),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         const expense_section: any[] = [];
//         let total_expense_value: any[] = [];
//         (result[3] as any[]).forEach((company, companyIndex) => {
//           const expense_table: any[] = [];
//           const expenses: any[] = [];
//           total_expense_value.push({
//             id: company.id,
//             value: 0,
//           });
//           const index = (result[4] as any[]).findIndex(
//             (expense) => expense.company_id == company.id
//           );
//           if (index != -1) {
//             expense_section.push({
//               text: company.name,
//               bold: true,
//               fontSize: 14,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             });
//             let expense_value = 0;
//             expense_table.push([
//               {
//                 text: "Tipe",
//                 bold: true,
//                 alignment: "left" as Alignment,
//               },
//               {
//                 text: "Nominal",
//                 bold: true,
//                 alignment: "left" as Alignment,
//               },
//             ]);
//             (result[4] as any[])
//               .filter(
//                 (x) => x.parent_id == null && x.company_id == company.id
//               )
//               .forEach((y) => {
//                 expenses.push({
//                   ...y,
//                   value: 0,
//                   children: [],
//                 });
//                 const child_expenses = (result[4] as any[]).filter(
//                   (x) => x.parent_id == y.id && x.company_id == company.id
//                 );
//                 child_expenses.forEach((child_expense) => {
//                   const index = expenses.findIndex(
//                     (expense) => expense.id == child_expense.parent_id
//                   );
//                   if (index != -1) {
//                     expenses[index].children.push(child_expense);
//                     expenses[index].value += parseFloat(
//                       child_expense.value.toString()
//                     );
//                     expense_value += parseFloat(
//                       child_expense.value.toString()
//                     );
//                     total_expense_value[companyIndex].value += parseFloat(
//                       child_expense.value.toString()
//                     );
//                   }
//                 });
//               });
//             expenses.forEach((expense) => {
//               expense_table.push([
//                 {
//                   text: expense.name,
//                   bold: true,
//                   alignment: "left" as Alignment,
//                 },
//                 {
//                   text: formatter.format(
//                     parseFloat(expense.value.toString())
//                   ),
//                   bold: true,
//                   alignment: "left" as Alignment,
//                 },
//               ]);
//               if (expense.children.length > 0) {
//                 (expense.children as any[]).forEach((child_expense) => {
//                   expense_table.push([
//                     {
//                       text: `${expense.name}/${child_expense.name}`,
//                       bold: false,
//                       alignment: "left" as Alignment,
//                     },
//                     {
//                       text: formatter.format(
//                         parseFloat(child_expense.value.toString())
//                       ),
//                       bold: false,
//                       alignment: "left" as Alignment,
//                     },
//                   ]);
//                 });
//               }
//             });
//             expense_table.push([
//               {
//                 text: "Total",
//                 bold: true,
//                 alignment: "left" as Alignment,
//               },
//               {
//                 text: formatter.format(expense_value),
//                 bold: true,
//                 alignment: "left" as Alignment,
//               },
//             ]);
//             expense_section.push({
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["*", "*"],
//                 body: expense_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//             });
//           }
//         });
//         const hpp_table = [];
//         let hpp_value = 0;
//         hpp_table.push([
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         let cogs_value: any[] = [];
//         (result[5] as any[]).forEach((x) => {
//           const name = x.f2;
//           const value = parseFloat(x.f0);
//           const company_id = x.f1;
//           cogs_value.push({
//             id: company_id,
//             value: value,
//           });
//           hpp_value += value;
//           hpp_table.push([
//             {
//               text: name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(value),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         hpp_table.push([
//           {
//             text: "Total",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: formatter.format(hpp_value),
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         const sales_appendix_table = [];
//         sales_appendix_table.push([
//           {
//             text: "Tanggal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Konsumen",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Dokumen",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         (result[6] as any[]).forEach((x) => {
//           sales_appendix_table.push([
//             {
//               text: `${new Date(x.date).getDate()} ${
//                 this.monthNames[new Date(x.date).getMonth()]
//               }`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.customer_name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(x.value),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         const purchase_appendix_table = [];
//         purchase_appendix_table.push([
//           {
//             text: "Tanggal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Supplier",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Dokumen",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         (result[7] as any[]).forEach((x) => {
//           purchase_appendix_table.push([
//             {
//               text: `${new Date(x.date).getDate()} ${
//                 this.monthNames[new Date(x.date).getMonth()]
//               }`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.supplier_name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.company_name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.purchase_invoice_name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: formatter.format(x.value),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         const expense_appendix_table = [];
//         expense_appendix_table.push([
//           {
//             text: "Tanggal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Perusahaan",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Tipe Pengeluaran",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Deskripsi",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//           {
//             text: "Nominal",
//             bold: true,
//             alignment: "left" as Alignment,
//           },
//         ]);
//         result[8].forEach((x) => {
//           expense_appendix_table.push([
//             {
//               text: `${new Date(x.date).getDate()} ${
//                 this.monthNames[new Date(x.date).getMonth()]
//               }`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.company.name,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: `${x.expense_type.expense_type?.name} / ${x.expense_type.name}`,
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//             {
//               text: x.description,
//             },
//             {
//               text: formatter.format(parseFloat(x.value.toString())),
//               bold: false,
//               alignment: "left" as Alignment,
//             },
//           ]);
//         });
//         const summary_section: any[] = [
//           {
//             text: "Laba / Rugi",
//             bold: true,
//             fontSize: 14,
//             alignment: "center" as Alignment,
//             margin: [0, 0, 0, 10] as Margins,
//             pageBreak: "before" as PageBreak,
//             tocItem: true,
//           },
//         ];
//         // result[3].forEach((x) => {
//         //   summary_section.push({
//         //     text: x.name,
//         //     fontSize: 14,
//         //     bold: true,
//         //     alignment: "left" as Alignment,
//         //     margins: [0, 0, 0, 15] as Margins,
//         //   });
//         //   const summary_table: any[] = [
//         //     [
//         //       {
//         //         text: "Keterangan",
//         //         bold: true,
//         //         fontSize: 12,
//         //       },
//         //       {
//         //         text: "Nominal",
//         //         bold: true,
//         //         fontSize: 12,
//         //       },
//         //       {
//         //         text: "Persentase",
//         //         bold: true,
//         //         fontSize: 12,
//         //       },
//         //     ],
//         //   ];
//         //   const sales_value_company_index = total_sales_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let sales_value_company = 0;
//         //   if (sales_value_company_index != -1) {
//         //     sales_value_company =
//         //       total_sales_value[sales_value_company_index].value;
//         //   }
//         //   const cogs_value_company_index = cogs_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let cogs_value_company = 0;
//         //   if (cogs_value_company_index != -1) {
//         //     cogs_value_company = cogs_value[cogs_value_company_index].value;
//         //   }
//         //   const expense_value_company_index = total_expense_value.findIndex(
//         //     (y) => y.id == x.id
//         //   );
//         //   let expense_value_company = 0;
//         //   if (expense_value_company_index != -1) {
//         //     expense_value_company =
//         //       total_expense_value[expense_value_company_index].value;
//         //   }
//         //   summary_table.push([
//         //     {
//         //       text: "Laba kotor",
//         //       bold: true,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text: formatter.format(
//         //         sales_value_company - cogs_value_company
//         //       ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text:
//         //         sales_value_company == 0
//         //           ? "0.00%"
//         //           : percentage_formatter.format(
//         //               (sales_value_company - cogs_value_company) /
//         //                 sales_value_company
//         //             ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //   ]);
//         //   summary_table.push([
//         //     {
//         //       text: "Laba bersih",
//         //       bold: true,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text: formatter.format(
//         //         sales_value_company -
//         //           cogs_value_company -
//         //           expense_value_company
//         //       ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //     {
//         //       text: percentage_formatter.format(
//         //         (sales_value_company -
//         //           cogs_value_company -
//         //           expense_value_company) /
//         //           sales_value_company
//         //       ),
//         //       bold: false,
//         //       fontSize: 12,
//         //     },
//         //   ]);
//         //   summary_section.push({
//         //     layout: "lightHorizontalLines",
//         //     table: {
//         //       headerRows: 1,
//         //       widths: ["*", "*", "*"],
//         //       body: summary_table,
//         //     },
//         //     margin: [0, 0, 0, 15] as Margins,
//         //   });
//         // });
//         let documentDefinition = {
//           pageSize: "A4" as PageSize,
//           content: [
//             {
//               text: "Laporan Laba Rugi",
//               bold: true,
//               fontSize: 20,
//               alignment: "center" as Alignment,
//             },
//             {
//               text:
//                 month == 0
//                   ? `Tahun ${year}`
//                   : `${this.monthNames[month - 1]} ${year}`,
//               bold: true,
//               fontSize: 16,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 20] as Margins,
//             },
//             {
//               text: "Daftar isi",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//             },
//             {
//               toc: {
//                 title: { text: "" },
//               },
//             },
//             {
//               text: "Penjualan",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               tocItem: true,
//               pageBreak: "before" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "*", "*", "*", "*"],
//                 body: sales_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Pembelian",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "*", "*", "*"],
//                 body: purchase_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Harga Pokok Penjualan",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 10] as Margins,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["*", "*"],
//                 body: hpp_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
//               fontSize: 10,
//               color: "#333333",
//               margin: [0, 0, 0, 20] as Margins,
//               pageBreak: "after" as PageBreak,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Pengeluaran",
//               bold: true,
//               fontSize: 14,
//               alignment: "center" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             ...expense_section,
//             ...summary_section,
//             {
//               text: "Lampiran I",
//               bold: true,
//               fontSize: 14,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 5] as Margins,
//               pageBreak: "before" as PageBreak,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Rincian Penjualan",
//               bold: true,
//               fontSize: 10,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "auto", "*", "*"],
//                 body: sales_appendix_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Lampiran II",
//               bold: true,
//               fontSize: 14,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 5] as Margins,
//               pageBreak: "before" as PageBreak,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Rincian Pembelian",
//               bold: true,
//               fontSize: 10,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "auto", "auto", "*", "*"],
//                 body: purchase_appendix_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Lampiran III",
//               bold: true,
//               fontSize: 14,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 5] as Margins,
//               pageBreak: "before" as PageBreak,
//               tocItem: true,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               text: "Rincian Pengeluaran",
//               bold: true,
//               fontSize: 10,
//               alignment: "left" as Alignment,
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//             {
//               layout: "lightHorizontalLines",
//               table: {
//                 headerRows: 1,
//                 widths: ["auto", "auto", "auto", "*", "*"],
//                 body: expense_appendix_table,
//               },
//               margin: [0, 0, 0, 15] as Margins,
//               pageOrientation: "landscape" as PageOrientation,
//             },
//           ],
//           footer: (currentPage: number, pageCount: number) => {
//             return {
//               text: currentPage.toString() + " of " + pageCount,
//               alignment: "center" as Alignment,
//               bold: false,
//               fontSize: 8,
//             };
//           },
//           pageMargins: [20, 60, 20, 20] as Margins,
//         };
//         const printer = new PdfPrinter(this.fontDescriptors);
//         const pdfDocument = printer.createPdfKitDocument(documentDefinition);
//         let chunks: any[] = [];
//         var pdfResult;
//         pdfDocument.on("data", function (chunk: any) {
//           chunks.push(chunk);
//         });
//         pdfDocument.on("end", function () {
//           pdfResult = Buffer.concat(chunks);
//           return res.status(200).send({
//             data: `data:application/pdf;base64,${pdfResult.toString(
//               "base64"
//             )}`,
//           });
//         });
//         pdfDocument.end();
//       })
//       .catch((error) => {
//         return res.status(500).send(error);
//       });
//   }
// };
ReportController.fetchQuickStats = (req, res) => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
        bill_code_model_1.default.fetchTodaySales(todayDate),
        bill_code_model_1.default.fetchTodaySales(yesterdayDate),
        purchase_invoice_model_1.default.calculateTotalPurchase(todayDate.getFullYear(), todayDate.getMonth() + 1, purchase_invoice_model_1.CalculatePurchaseMode.Sum, todayDate.getDate()),
        purchase_invoice_model_1.default.calculateTotalPurchase(yesterdayDate.getFullYear(), yesterdayDate.getMonth() + 1, purchase_invoice_model_1.CalculatePurchaseMode.Sum, yesterdayDate.getDate()),
        expense_model_1.default.fetchTodaySum(),
    ])
        .then((result) => {
        const response = {
            sales: result[0].length == 0
                ? {
                    value: 0,
                    discount: 0,
                    service: 0,
                    delivery: 0,
                }
                : {
                    value: result[0][0].value == null
                        ? 0
                        : parseFloat(result[0][0].value),
                    discount: result[0][0].discount == null
                        ? 0
                        : parseFloat(result[0][0].discount),
                    delivery: result[0][0].delivery == null
                        ? 0
                        : parseFloat(result[0][0].delivery),
                    service: result[0][0].service == null
                        ? 0
                        : parseFloat(result[0][0].service),
                },
            sales_prev: result[1].length == 0
                ? {
                    value: 0,
                    discount: 0,
                    service: 0,
                    delivery: 0,
                }
                : {
                    value: result[1][0].value == null
                        ? 0
                        : parseFloat(result[1][0].value),
                    discount: result[1][0].discount == null
                        ? 0
                        : parseFloat(result[1][0].discount),
                    delivery: result[1][0].delivery == null
                        ? 0
                        : parseFloat(result[1][0].delivery),
                    service: result[1][0].service == null
                        ? 0
                        : parseFloat(result[1][0].service),
                },
            purchase: {
                value: result[2][0].value == null
                    ? 0
                    : parseFloat(result[2][0].value),
                discount: result[2][0].discount == null
                    ? 0
                    : parseFloat(result[2][0].discount),
            },
            purchase_prev: {
                value: result[3][0].value == null
                    ? 0
                    : parseFloat(result[3][0].value),
                discount: result[3][0].discount == null
                    ? 0
                    : parseFloat(result[3][0].discount),
            },
            expense: result[4][0].value,
        };
        return res.status(200).send(response);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchSalesItemReport = (req, res) => {
    const brand = req.body.brand;
    const type = req.body.type;
    const format = req.body.format;
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;
    item_model_1.ItemModel.fetchValueByBrandType(brand, type, month, year)
        .then((result) => {
        stock_card_helper_1.default.createStockReport(format, group, brand, type, result, function (buffer) {
            if (format == "xlsx") {
                return res.status(200).send({
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            }
            else if (format == "PDF") {
                return res.status(200).send({
                    data: `data:application/pdf;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            }
        }, function (error) {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchProductStockProblem = (req, res) => {
    const mode = req.body.mode;
    product_stock_model_1.default.fetchProblematic().then((result) => {
        if (mode == "excel") {
            const rows = [["No", "Referensi", "Deskripsi", "Stock"]];
            result.forEach((data, index) => {
                rows.push([
                    index + 1,
                    data.item.reference,
                    data.item.description,
                    parseFloat(data.stock.toString()),
                ]);
            });
            // Create an excel file
            const workbook = new exceljs_1.default.Workbook();
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
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
        else {
            // Create PDF
            const content = [];
            content.push({
                text: "Laporan Stok Bermasalah",
                bold: true,
                fontSize: 16,
                font: "Roboto",
                alignment: "center",
                margin: [0, 0, 0, 15],
            });
            const table = [];
            table.push([
                {
                    text: "No",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Referensi",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Deskripsi",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Stock",
                    bold: true,
                    alignment: "center",
                },
            ]);
            if (result.length > 0) {
                result.forEach((item, index) => {
                    table.push([
                        {
                            text: index + 1,
                            bold: false,
                            alignment: "center",
                        },
                        {
                            text: item.item.reference,
                            bold: false,
                            alignment: "left",
                        },
                        {
                            text: item.item.description,
                            bold: false,
                            alignment: "left",
                        },
                        {
                            text: `${item.stock} ${item.item.unit}`,
                            bold: false,
                            alignment: "left",
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
                    margin: [0, 0, 0, 15],
                    pageBreak: "after",
                });
                let documentDefinition = {
                    pageSize: "A4",
                    content: content,
                };
                const fontDescriptors = {
                    Roboto: {
                        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                        italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                        bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                    },
                };
                const printer = new pdfmake_1.default(fontDescriptors);
                const pdfDocument = printer.createPdfKitDocument(documentDefinition);
                let chunks = [];
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
ReportController.fetchExpenseReport = (req, res) => {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    expense_model_1.default.fetchReport(month, year)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching expense report ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = ReportController;
//# sourceMappingURL=report.controller.js.map