"use strict";
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
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const product_package_model_1 = require("../model/product-package.model");
const queue_helper_1 = require("../helper/queue.helper");
const sales_return_model_1 = __importDefault(require("../model/sales_return.model"));
const receivable_controller_1 = __importDefault(require("./receivable.controller"));
const deposit_model_1 = __importDefault(require("../model/deposit.model"));
// import DepositModel from "../model/deposit.model";
class SalesInvoiceController {
}
_a = SalesInvoiceController;
/**
 * Create sales invoice data
 * @param req
 * @param res
 */
SalesInvoiceController.create = (req, res) => {
    const uuid = req.body.uuid;
    const customer_id = req.body.customer_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill;
    const payments = req.body.payments;
    const payment_term = req.body.payment_term;
    const date = !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);
    const userID = req.body.userID;
    const is_paid = req.body.is_paid;
    const type = req.body.type;
    if (type == "sales") {
        bill_code_model_1.default.create({
            name: bill_code_model_1.default.generateName(date),
            customer_id: customer_id,
            discount: discount,
            delivery: delivery,
            service: service,
            date: date,
            uuid: uuid,
            items: bill.map((x) => {
                if (x.package_code_id != undefined) {
                    return {
                        package_code_id: x.package_code_id,
                        item_id: null,
                        item_unit_id: null,
                        quantity: x.quantity,
                        price: x.price,
                        discount: 0,
                    };
                }
                else {
                    return {
                        package_code_id: null,
                        item_id: x.item_id,
                        item_unit_id: x.item_unit_id,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
            }),
            payments: payments.map((x) => {
                return {
                    date: date,
                    value: x.value,
                    payment_method_id: x.payment_method_id,
                };
            }),
            created_by: userID,
            payment_term: payment_term,
            is_paid: is_paid,
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            if (!is_paid) {
                receivable_controller_1.default.receivable += result.bill.reduce((a, b) => {
                    return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
                }, 0);
                receivable_controller_1.default.receivable -= discount + delivery + service;
                receivable_controller_1.default.receivable -= payments.reduce((a, b) => {
                    return a + Number(b.value);
                }, 0);
            }
            const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
                return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
            }, 0);
            const createSalesInvoiceNetTotal = createSalesInvoiceTotal - discount + delivery + service;
            try {
                yield item_price_model_1.default.updateMany(bill.filter((x) => x.save && x.item_id != null), req.body.userID);
                yield product_package_model_1.ProductPackageCodeModel.updatePrice(bill.filter((x) => x.save && x.package_code_id != null));
                for (let i = 0; i < result.bill.length; i++) {
                    if (result.bill[i].package_code != null) {
                        const packagePrice = Number(result.bill[i].price);
                        const packageQuantity = Number(result.bill[i].quantity);
                        const packageDiscount = Number(result.bill[i].discount);
                        const packageFinalPrice = ((packagePrice - packageDiscount) *
                            createSalesInvoiceNetTotal) /
                            createSalesInvoiceTotal;
                        const packageContentValue = result.bill[i].package_code.package_content.reduce((a, b) => {
                            return (a +
                                Number(b.quantity) * (Number(b.price) - Number(b.discount)));
                        }, 0);
                        for (let n = 0; n < result.bill[i].package_code.package_content.length; n++) {
                            const createSalesInvoicePackageContentItem = result.bill[i].package_code.package_content[n];
                            const createSalesInvoiceItemItemID = createSalesInvoicePackageContentItem.item_id;
                            const createSalesInvoiceItemQuantity = Number(createSalesInvoicePackageContentItem.quantity);
                            const createSalesInvoiceItemPrice = Number(createSalesInvoicePackageContentItem.price);
                            const createSalesInvoiceItemDiscount = Number(createSalesInvoicePackageContentItem.discount);
                            const createSalesInvoiceItemUnit = createSalesInvoicePackageContentItem.item_unit == null
                                ? createSalesInvoicePackageContentItem.item.unit
                                : createSalesInvoicePackageContentItem.item_unit.unit;
                            const createSalesInvoiceItemConversion = createSalesInvoicePackageContentItem.item_unit == null
                                ? 1
                                : Number(createSalesInvoicePackageContentItem.item_unit
                                    .conversion);
                            const finalUnitPrice = packageContentValue == 0
                                ? 0
                                : Number(((createSalesInvoiceItemPrice -
                                    createSalesInvoiceItemDiscount) *
                                    packageFinalPrice) /
                                    (packageContentValue *
                                        createSalesInvoiceItemConversion));
                            const stockOut = {
                                itemID: createSalesInvoiceItemItemID,
                                createdAt: result.created_at,
                                date: date,
                                document: result.name,
                                opponent: result.customer == null
                                    ? "Retail customer"
                                    : result.customer.name,
                                displayQuantity: packageQuantity * createSalesInvoiceItemQuantity * -1,
                                quantity: packageQuantity *
                                    -1 *
                                    createSalesInvoiceItemQuantity *
                                    createSalesInvoiceItemConversion,
                                unit: createSalesInvoiceItemUnit,
                                billID: result.bill[i].id,
                                billCodeID: result.id,
                                adjustmentCaseID: null,
                                adjustmentCaseCodeID: null,
                                goodReceiptID: null,
                                goodReceiptCodeID: null,
                                salesReturnID: null,
                                salesReturnCodeID: null,
                                customerID: result.customer_id,
                                supplierID: null,
                                companyID: null,
                                price: finalUnitPrice,
                            };
                            yield queue_helper_1.queue.add("insert-stock-out", stockOut);
                        }
                    }
                    else if (result.bill[i].item != null) {
                        const stockOut = {
                            itemID: result.bill[i].item.id,
                            createdAt: result.created_at,
                            date: date,
                            document: result.name,
                            opponent: result.customer == null
                                ? "Retail customer"
                                : result.customer.name,
                            displayQuantity: bill[i].quantity * -1,
                            quantity: parseFloat(result.bill[i].quantity.toString()) *
                                -1 *
                                (result.bill[i].item_unit != null
                                    ? parseFloat(result.bill[i].item_unit.conversion.toString())
                                    : 1),
                            unit: bill[i].item_unit == null
                                ? result.bill[i].item.unit
                                : result.bill[i].item_unit.unit,
                            billID: result.bill[i].id,
                            billCodeID: result.id,
                            adjustmentCaseID: null,
                            adjustmentCaseCodeID: null,
                            goodReceiptID: null,
                            goodReceiptCodeID: null,
                            salesReturnID: null,
                            salesReturnCodeID: null,
                            customerID: result.customer_id,
                            supplierID: null,
                            companyID: null,
                            price: ((Number(result.bill[i].price) -
                                Number(result.bill[i].discount)) *
                                createSalesInvoiceNetTotal) /
                                (createSalesInvoiceTotal *
                                    (result.bill[i].item_unit == null
                                        ? 1
                                        : Number(result.bill[i].item_unit.conversion))),
                        };
                        yield queue_helper_1.queue.add("insert-stock-out", stockOut);
                    }
                }
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating stock ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        }))
            .catch((error) => {
            console.error(`[error]: Error on creating bill ${error}`);
            return res.status(500).send(error);
        });
    }
    else if (type == "deposit") {
        deposit_model_1.default.create({
            name: deposit_model_1.default.generateName(date),
            customer_id: customer_id,
            discount: discount,
            delivery: delivery,
            service: service,
            date: date,
            uuid: uuid,
            items: bill.map((x) => {
                if (x.package_code_id != undefined) {
                    return {
                        package_code_id: x.package_code_id,
                        item_id: null,
                        item_unit_id: null,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
                else {
                    return {
                        package_code_id: null,
                        item_id: x.item_id,
                        item_unit_id: x.item_unit_id,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
            }),
            payments: payments.map((x) => {
                return {
                    date: date,
                    value: x.value,
                    payment_method_id: x.payment_method_id == 0 ? null : x.payment_method_id,
                };
            }),
            created_by: userID,
            type: "EXTERNAL",
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            return res.status(201).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on creating deposit ${error}`);
            return res.status(500).send(error);
        });
    }
    else if (type == "deposit-internal") {
        deposit_model_1.default.create({
            name: deposit_model_1.default.generateName(date),
            customer_id: null,
            discount: discount,
            delivery: delivery,
            service: service,
            date: date,
            uuid: uuid,
            items: bill.map((x) => {
                if (x.package_code_id != undefined) {
                    return {
                        package_code_id: x.package_code_id,
                        item_id: null,
                        item_unit_id: null,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
                else {
                    return {
                        package_code_id: null,
                        item_id: x.item_id,
                        item_unit_id: x.item_unit_id,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
            }),
            payments: payments.map((x) => {
                return {
                    date: date,
                    value: x.value,
                    payment_method_id: x.payment_method_id == 0 ? null : x.payment_method_id,
                };
            }),
            created_by: userID,
            type: "INTERNAL",
        })
            .then((result) => __awaiter(void 0, void 0, void 0, function* () {
            return res.status(201).send(result);
        }))
            .catch((error) => {
            console.error(`[error]: Error on creating deposit ${error}`);
            return res.status(500).send(error);
        });
    }
};
/**
 * Search sales invoice data
 * Can be narrowed down by customer, item, date, page, keyword
 * @param req
 * @param res
 */
SalesInvoiceController.fetchSearch = (req, res) => {
    const customers = req.body.customers;
    const items = req.body.items;
    const date = req.body.date;
    const page = req.body.page;
    const keyword = req.body.keyword;
    const status = req.body.status;
    // status 0 => active
    // status 1 => deleted
    // status 2 => all
    const formattedDate_1 = date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(new Date(date[0]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 = date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(new Date(date[1]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    bill_code_model_1.default.search(customers, items, [formattedDate_1, formattedDate_2], (0, escape_helper_1.mysql_real_escape_string)(keyword), page, status)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: parseInt(result[1][0].count.toString()),
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Search sales invoice data archive
 * @param req
 * @param res
 */
SalesInvoiceController.fetchArchive = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
        bill_code_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString().replace("n", "")),
                };
            })
                .sort((a, b) => {
                return a.year - b.year;
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        const year = req.body.year;
        bill_code_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString().replace("n", ""));
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const mode = req.body.mode;
        const page = req.body.limit.page;
        const keyword = req.body.search.keyword;
        bill_code_model_1.default.fetchArchive({
            year: year,
            month: month,
            mode: mode,
            limit: 10,
            offset: (page - 1) * 10,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
        })
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        customer_name: x.customer_name,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString().replace("n", "")),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Fetch bill by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        let subTotal = 0;
        for (let item of result.bill) {
            subTotal +=
                parseFloat(item.price.toString()) *
                    parseFloat(item.quantity.toString());
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { subTotal: subTotal, discount: parseFloat(result.discount.toString()), delivery: parseFloat(result.delivery.toString()), service: parseFloat(result.service.toString()) }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales invoice by ID ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch bill code by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchCodeByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching bill code ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete bill by ID
 * @param req
 * @param res
 * @returns
 */
SalesInvoiceController.deleteByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userID;
    const result = yield bill_code_model_1.default.fetchByID(id);
    if (!result) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (result.is_delete) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    // Check if there is any sales return on this bill
    const salesReturn = yield sales_return_model_1.default.fetchByBillIDs(result.bill.map((x) => {
        return x.id;
    }));
    if (salesReturn.length > 0) {
        return res
            .status(400)
            .send(error_list_1.default["Delete bill sales return constraint"]);
    }
    const socket = new socket_helper_1.default("deleteBill", result);
    socket.create();
    bill_code_model_1.default.deleteByID(id, userID)
        .then((updateBill) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < updateBill.bill.length; i++) {
            if (updateBill.bill[i].item != null) {
                const stockOut = {
                    itemID: updateBill.bill[i].item.id,
                    billID: updateBill.bill[i].id,
                    quantity: Number(updateBill.bill[i].quantity) *
                        -1 *
                        Number(updateBill.bill[i].item_unit != null
                            ? updateBill.bill[i].item_unit.conversion
                            : 1),
                    adjustmentCaseID: null,
                };
                yield queue_helper_1.queue.add("delete-stock-out", stockOut);
            }
            else if (updateBill.bill[i].package_code != null) {
                for (let n = 0; n < updateBill.bill[i].package_code.package_content.length; n++) {
                    const packageContent = updateBill.bill[i].package_code.package_content[n];
                    const stockOut = {
                        itemID: packageContent.item_id,
                        billID: updateBill.bill[i].id,
                        quantity: Number(updateBill.bill[i].quantity) *
                            -1 *
                            Number(packageContent.quantity) *
                            Number(packageContent.item_unit != null
                                ? packageContent.item_unit.conversion
                                : 1),
                        adjustmentCaseID: null,
                    };
                    yield queue_helper_1.queue.add("delete-stock-out", stockOut);
                }
            }
        }
        return res.status(201).send(updateBill);
    }))
        .catch((error) => {
        console.error(`[error]: Error on deleting bill ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = SalesInvoiceController;
//# sourceMappingURL=sales-invoice.controller.js.map