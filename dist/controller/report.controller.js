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
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
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
    const [bills, purchases, companies, [expenses, expenseType], cogs, overflows,] = yield Promise.all([
        bill_code_model_1.default.fetchSum(month, year),
        purchase_invoice_model_1.default.calculateTotalPurchase(month, year, purchase_invoice_model_1.CalculatePurchaseMode.Sum),
        company_model_1.default.fetch("", 0, 0, fetch_interface_1.fetchMode.All),
        expense_model_1.default.fetchSum(month, year),
        mongo_stock_in_model_1.mongoStockInModel.aggregate([
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
        mongo_overflow_model_1.mongoOverflowModel.aggregate([
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
    }
    else {
        const [billAppendix, purchaseAppendix, expenseAppendix] = yield Promise.all([
            bill_code_model_1.default.fetchAppendix(month, year),
            purchase_invoice_model_1.default.fetchAppendix(month, year),
            expense_model_1.default.fetchAppendix(month, year),
        ]);
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
});
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