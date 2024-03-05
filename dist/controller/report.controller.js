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
const promotion_model_1 = __importDefault(require("../model/promotion.model"));
const adjustment_case_model_1 = __importDefault(require("../model/adjustment-case.model"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const receivable_controller_1 = __importDefault(require("./receivable.controller"));
const deposit_model_1 = __importDefault(require("../model/deposit.model"));
const mongo_stock_card_model_1 = require("../mongo-model/mongo-stock-card.model");
class ReportController {
}
_a = ReportController;
/**
 * Fetch money receipt
 * @param req
 * @param res
 */
ReportController.fetchMoneyReceipt = (req, res) => {
    bill_code_model_1.default.fetchMoneyReceipt(req.body.date)
        .then((result) => {
        const response = [];
        result.forEach((x) => {
            if ((x.bill != null && x.bill > 0) ||
                (x.sales_return != null && x.sales_return > 0) ||
                (x.deposit != null && x.deposit > 0)) {
                response.push({
                    id: x.id,
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
                        Number(purchase.value) - Number(purchase.discount);
                }
                return res.status(200).send({
                    purchase: purchase_dates,
                    purchase_detail: result[1]
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
            case purchase_invoice_model_1.CalculatePurchaseMode.Supplier:
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
            case purchase_invoice_model_1.CalculatePurchaseMode.Type:
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
            case purchase_invoice_model_1.CalculatePurchaseMode.Brand:
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
                        Number(sales.value) - Number(sales.discount);
                }
                return res.status(200).send({
                    sales: sales_dates,
                    sales_detail: result[1]
                        .map((x) => {
                        return {
                            name: x.customer_name,
                            value: x.value - x.discount + x.delivery + x.service,
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
                            value: x.value - x.discount,
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
                return res.status(200).send(result.map((x) => {
                    return Object.assign(Object.assign({}, x), { value: x.value, discount: x.discount, delivery: x.delivery, service: x.service });
                }));
            case "sales":
                return res.status(200).send({
                    sales_detail: result
                        .map((x) => {
                        return {
                            name: x.sales_name,
                            value: x.value,
                            discount: x.discount,
                            delivery: x.delivery,
                            service: x.service,
                        };
                    })
                        .sort((a, b) => {
                        return b.value - a.value;
                    }),
                });
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
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const items = yield item_model_1.ItemModel.fetchByIDs(result.map((x) => {
            return x._id;
        }));
        return res.status(200).send(result
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
            return a.reference.localeCompare(b.reference);
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
        mongo_stock_in_model_1.mongoStockOutModel.aggregate([
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
                    delivery: bills[0].delivery,
                    discount: bills[0].discount,
                    value: bills[0].value,
                    service: bills[0].service,
                },
            purchases: purchases.map((x) => {
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
                    delivery: bills[0].delivery,
                    discount: bills[0].discount,
                    value: bills[0].value,
                    service: bills[0].service,
                },
            purchases: purchases.map((x) => {
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
        mongo_stock_card_model_1.mongoStockCardModel
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
                $sort: {
                    date: -1,
                    itemID: 1,
                },
            },
        ])
            .then((stocks) => {
            // Adjust the stocks, if it has more than 1 itemID, then select the first one
            stocks = stocks.filter((x, i, self) => self.findIndex((y) => y.itemID == x.itemID) == i);
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
                                    adjustment_input: Number(y.adjustmentQuantityPlus),
                                    adjustment_output: Number(y.adjustmentQuantityMinus),
                                    good_receipt_input: Number(y.goodReceiptQuantity),
                                    bill_output: Number(y.billQuantity),
                                    initialStock: stockIndex == -1
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
                                const stockIndex = stocks.findIndex((z) => z.itemID == y.id);
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
                                    initialStock: stockIndex == -1
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
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
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
                        return a + b.value;
                    }, 0),
                };
            }),
            value: expenses
                .filter((y) => y.id == x.id)
                .reduce((a, b) => {
                return a + b.value;
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
                    return a + b.value;
                }, 0),
            };
        }),
        types: typeResponse,
    });
});
/**
 * Fetch dashboard data
 * @param req
 * @param res
 */
ReportController.fetchSalesDashboard = (req, res) => {
    const today = new Date();
    const yesterday = new Date();
    const lastMonth = new Date();
    yesterday.setDate(today.getDate() - 1);
    lastMonth.setMonth(today.getMonth() - 1);
    Promise.all([
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        bill_code_model_1.default.fetchByDate(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate()),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, null),
        bill_code_model_1.default.fetchByDate(lastMonth.getFullYear(), lastMonth.getMonth() + 1, null),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth(), today.getDate()),
        promotion_model_1.default.countActive(),
        deposit_model_1.default.countActive(),
    ])
        .then(([sales1, sales2, sales3, sales4, sales5, countPromotion, countDeposit,]) => {
        return res.status(200).send({
            today: sales1[0].value == null ? 0 : Number(sales1[0].value),
            yesterday: sales2[0].value == null ? 0 : Number(sales2[0].value),
            thisMonth: sales3[0].value == null ? 0 : Number(sales3[0].value),
            lastMonth: sales4[0].value == null ? 0 : Number(sales4[0].value),
            monthOnMonth: sales5[0].value == null ? 0 : Number(sales5[0].value),
            count: countPromotion,
            receivable: receivable_controller_1.default.receivable,
            deposit: countDeposit,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch administrator dashboard data
 * @param req
 * @param res
 */
ReportController.fetchAdministratorDashboardV2 = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const items = req.body.items;
    const response = [];
    for (let i = 0; i < items.length; i++) {
        switch (items[i]) {
            case 0:
                const billCurrentValue = yield bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
                const billPreviousValue = yield bill_code_model_1.default.fetchByDate(today.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate());
                response.push({
                    title: "Sales",
                    compare: true,
                    current: billCurrentValue == null
                        ? 0
                        : billCurrentValue[0].value == null
                            ? 0
                            : billCurrentValue[0].value,
                    previous: billPreviousValue == null
                        ? 0
                        : billPreviousValue[0].value == null
                            ? 0
                            : billPreviousValue[0].value,
                    code: items[i],
                });
                break;
            case 1:
                const purchaseCurrentValue = yield purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
                const purchasePreviousValue = yield purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate());
                response.push({
                    title: "Purchase",
                    compare: true,
                    current: purchaseCurrentValue == null
                        ? 0
                        : purchaseCurrentValue[0].value == null
                            ? 0
                            : purchaseCurrentValue[0].value,
                    previous: purchasePreviousValue == null
                        ? 0
                        : purchasePreviousValue[0].value == null
                            ? 0
                            : purchasePreviousValue[0].value,
                    code: items[i],
                });
                break;
            case 2:
                const receivableCurrentValue = yield receivable_controller_1.default.receivable;
                response.push({
                    title: "Receivable",
                    compare: false,
                    current: receivableCurrentValue,
                    code: items[i],
                });
                break;
            case 3:
                const depositCurrentValue = yield deposit_model_1.default.countActive();
                response.push({
                    title: "Deposit",
                    compare: false,
                    current: depositCurrentValue,
                    code: items[i],
                });
                break;
            case 4:
                const promotionCurrentValue = yield promotion_model_1.default.countActive();
                response.push({
                    title: "Promotion",
                    compare: false,
                    current: promotionCurrentValue,
                    code: items[i],
                });
                break;
            case 5:
                const inadequateCurrentValue = yield mongo_product_model_1.mongoProductModel.countDocuments({
                    $expr: {
                        $lt: ["$currentStock", "$minimumStock"],
                    },
                });
                response.push({
                    title: "Inadequate Stock",
                    compare: false,
                    current: inadequateCurrentValue,
                    code: items[i],
                });
                break;
            case 6:
                // Internal deposit, now just calculate the deposit
                const internalDepositCurrentValue = yield deposit_model_1.default.countActive();
                response.push({
                    title: "Internal Deposit",
                    compare: false,
                    current: internalDepositCurrentValue,
                    code: items[i],
                });
                break;
        }
    }
    return res.status(200).send(response);
});
ReportController.fetchAdministratorDashboardV1 = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    Promise.all([
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate()),
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        purchase_invoice_model_1.default.fetchByDate(yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate()),
        promotion_model_1.default.countActive(),
        deposit_model_1.default.countActive(),
    ])
        .then(([sales1, sales2, purchase1, purchase2, countPromotion, countDeposit,]) => {
        return res.status(200).send({
            todaySales: sales1[0].value == null ? 0 : Number(sales1[0].value),
            yesterdaySales: sales2[0].value == null ? 0 : Number(sales2[0].value),
            todayPurchase: purchase1[0].value == null ? 0 : Number(purchase1[0].value),
            yesterdayPurchase: purchase2[0].value == null ? 0 : Number(purchase2[0].value),
            count: countPromotion,
            receivable: receivable_controller_1.default.receivable,
            deposit: countDeposit,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching administrator data. ${error}`);
        return res.status(500).send(error);
    });
});
ReportController.fetchOutputReportCompany = (req, res) => {
    const date = req.body.date;
    const company_id = req.body.company_id;
    mongo_stock_in_model_1.mongoStockOutModel
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
                    $lt: new Date((0, moment_1.default)(date).add(1, "days").toISOString()),
                },
            },
        },
        {
            $match: {
                "stockIn.companyID": company_id,
            },
        },
    ])
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const billNames = yield bill_code_model_1.default.fetchGeneralByIDs(result.filter((x) => x.billCodeID != null).map((x) => x.billCodeID));
        const adjustmentCaseNames = yield adjustment_case_model_1.default.fetchGeneralByIDs(result
            .filter((x) => x.adjustmentCaseCodeID != null)
            .map((x) => x.adjustmentCaseCodeID));
        const goodReceipts = yield good_receipt_model_1.default.fetchByCompanyID(company_id, date);
        const adjustmentCases = yield adjustment_case_model_1.default.fetchByCompanyID(company_id, date);
        return res.status(200).send({
            output: result
                .map((x) => {
                if (x.billCodeID != null) {
                    const billIndex = billNames.findIndex((y) => y.id == x.billCodeID);
                    return {
                        reference: x.product.reference,
                        description: x.product.description,
                        quantity: x.quantity * -1,
                        unit: x.product.unit,
                        document: billIndex == -1 ? "" : billNames[billIndex].name,
                        opponent: billIndex == -1 ? "" : billNames[billIndex].opponent,
                    };
                }
                else if (x.adjusmtnentCaseCodeID != null) {
                    const adjustmentCaseIndex = adjustmentCaseNames.findIndex((y) => y.id == x.adjustmentCaseCodeID);
                    return {
                        reference: x.product.reference,
                        description: x.product.description,
                        quantity: x.quantity * -1,
                        unit: x.product.unit,
                        document: adjustmentCaseIndex == -1
                            ? ""
                            : adjustmentCaseNames[adjustmentCaseIndex].name,
                        opponent: "Internal",
                    };
                }
            })
                .sort((a, b) => {
                return a.reference.localeCompare(b.reference);
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
    }))
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ReportController;
//# sourceMappingURL=report.controller.js.map