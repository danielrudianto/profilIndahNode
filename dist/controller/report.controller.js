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
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const purchase_invoice_model_1 = __importStar(require("../model/purchase-invoice.model"));
const item_model_1 = require("../model/item.model");
const company_model_1 = __importDefault(require("../model/company.model"));
const fetch_interface_1 = require("../interface/fetch.interface");
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
const error_list_1 = __importDefault(require("../assets/error_list"));
const moment_1 = __importDefault(require("moment"));
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
const mongo_product_model_1 = require("../mongo-model/mongo-product.model");
class ReportController {
}
_a = ReportController;
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
                            name: x.name,
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
                            value: parseFloat(x.value.toString()),
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
                return res.status(200).send(result.map((x) => {
                    return Object.assign(Object.assign({}, x), { value: parseFloat(x.value.toString()), discount: parseFloat(x.discount.toString()), delivery: parseFloat(x.delivery.toString()), service: parseFloat(x.service.toString()) });
                }));
        }
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales report ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
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
/**
 * Fetch profit and loss report data
 * @param req
 * @param res
 * @returns
 */
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
/**
 * Fetch sales item report
 * Get output report (item quantity)
 * @param req
 * @param res
 */
ReportController.fetchSalesItemReport = (req, res) => {
    const brand = req.body.brand;
    const type = req.body.type;
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;
    item_model_1.ItemModel.fetchValueByBrandType(brand, type, month, year).then(([result, brands, types]) => __awaiter(void 0, void 0, void 0, function* () {
        const stocks = yield mongo_product_model_1.mongoProductModel.aggregate([
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
                            const stockIndex = stocks.findIndex((z) => z.itemID == y.id);
                            return {
                                id: y.id,
                                reference: y.reference,
                                description: y.description,
                                unit: y.unit,
                                brand: y.item_brand_name,
                                type: y.item_type_name,
                                input: parseFloat(y.adjustmentQuantityPlus.toString()) +
                                    parseFloat(y.goodReceiptQuantity.toString()),
                                output: y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
                                initialStock: stockIndex == -1
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
                            const stockIndex = stocks.findIndex((z) => z.itemID == y.id);
                            return {
                                id: y.id,
                                reference: y.reference,
                                description: y.description,
                                brand: y.item_brand_name,
                                type: y.item_type_name,
                                input: parseFloat(y.adjustmentQuantityPlus.toString()) +
                                    parseFloat(y.goodReceiptQuantity.toString()),
                                output: y.billQuantity * -1 + y.adjustmentQuantityMinus * -1,
                                initialStock: stockIndex == -1
                                    ? 0
                                    : stocks[stockIndex].stockCard.currentStock,
                            };
                        }),
                    };
                });
                return res.status(200).send(typeResponse);
        }
    }));
};
ReportController.fetchProductStockProblem = (req, res) => {
    Promise.all([
        mongo_product_model_1.mongoProductModel
            .find({
            currentStock: {
                $lt: 0,
            },
        })
            .sort({ reference: 1 }),
    ])
        .then((result) => {
        return res.status(200).send(result[0].map((x) => {
            return {
                id: x.itemID,
                reference: x.reference,
                description: x.description,
                stock: x.currentStock,
                unit: x.unit,
            };
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching problematic stock data: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch expense report by month and year
 * @param req
 * @param res
 */
ReportController.fetchExpenseReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const month = parseInt(req.params.month);
    const year = parseInt(req.params.year);
    const [expenses, expenseTypes, companies] = yield expense_model_1.default.fetchReport(month, year);
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
});
exports.default = ReportController;
//# sourceMappingURL=report.controller.js.map