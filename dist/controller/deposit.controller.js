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
const deposit_model_1 = __importDefault(require("../model/deposit.model"));
const escape_helper_1 = require("../helper/escape.helper");
const error_list_1 = __importDefault(require("../assets/error_list"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const uuid_1 = require("uuid");
const queue_helper_1 = require("../helper/queue.helper");
class DepositController {
}
_a = DepositController;
/**
 * Fetch deposit by ID
 * @param req
 * @param res
 */
DepositController.fetchByID = (req, res) => {
    const id = Number(req.params.id);
    deposit_model_1.default.fetchByID(id).then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        let subTotal = 0;
        for (let item of result.deposit) {
            subTotal += Number(item.price) * Number(item.quantity);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { is_confirm: true, subTotal: subTotal, discount: Number(result.discount), delivery: Number(result.delivery), service: Number(result.service), total: subTotal -
                Number(result.discount) +
                Number(result.delivery) +
                Number(result.service) }));
    });
};
/**
 * Fetch deposit
 * @param req
 * @param res
 */
DepositController.fetch = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page = !req.query.page ? 1 : Number(req.query.page);
    deposit_model_1.default.fetch(keyword, page)
        .then(([result, count]) => {
        return res.status(200).send({
            data: result,
            count: count,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching deposit ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Fetch deposit
 * @param req
 * @param res
 */
DepositController.fetchV2 = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page ? 1 : Number(req.query.page);
    deposit_model_1.default.fetchIdsV2(keyword).then((ids) => {
        deposit_model_1.default.fetchV2(ids.map((x) => {
            return x.id;
        }), page)
            .then((result) => {
            return res.status(200).send({
                data: result,
                count: ids.length,
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching deposit ${error}`);
            return res.status(500).send(error);
        });
    });
};
/**
 * Delete deposit by ID
 * @param req
 * @param res
 * @returns
 */
DepositController.deleteByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const result = yield deposit_model_1.default.fetchByID(id);
    if (!result) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (result.is_delete) {
        return res.status(400).send(error_list_1.default["Not found"]);
    }
    deposit_model_1.default.deleteByID(id)
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on deleting deposit ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
DepositController.fetchArchive = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    const mode = req.body.mode;
    if (year == null && month == null) {
        deposit_model_1.default.fetchArchiveYears(mode)
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
            console.error(`[error]: Error on fetching deposit archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        const year = req.body.year;
        deposit_model_1.default.fetchArchiveMonths(year, mode)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString().replace("n", ""));
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching deposit archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const page = req.body.limit.page;
        const keyword = req.body.search.keyword;
        deposit_model_1.default.fetchArchive({
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
                        customer_name: x.customer_name,
                        value: x.value,
                        payment: x.payment,
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
 * Confirm by ID
 * @param req
 * @param res
 */
DepositController.confirmByID = (req, res) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const deposit = req.body.deposit;
    const deposit_payment = req.body.deposit_payment;
    const deposit_bill_payment = req.body.deposit_bill_payment;
    const userID = req.body.userId;
    const is_paid = req.body.is_paid;
    const paymentTerm = req.body.payment_term;
    deposit_model_1.default.fetchByID(id)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.is_delete) {
            return res.status(400).send(error_list_1.default["Not found"]);
        }
        // First we need to do some validation
        // Check if checked items is more than 1
        if (deposit.filter((x) => x.checked).length == 0) {
            return res.status(400).send(error_list_1.default["Item is required"]);
        }
        if (deposit.filter((x) => !x.checked).length > 0) {
            // Create a new deposit with the new unchecked items
            yield deposit_model_1.default.confirmByID({
                id: id,
            });
            yield deposit_model_1.default.create({
                sales: result.sales,
                name: deposit_model_1.default.generateName(date),
                customer_id: result.customer_id,
                date: date,
                uuid: (0, uuid_1.v4)(),
                created_by: userID,
                discount: 0,
                delivery: 0,
                service: 0,
                items: deposit
                    .filter((y) => !y.checked)
                    .map((x) => {
                    const depositIndex = result.deposit.findIndex((y) => y.id == x.id);
                    const depositObject = result.deposit[depositIndex];
                    return {
                        item_id: depositObject.item_id,
                        item_unit_id: depositObject.item_unit_id,
                        package_code_id: depositObject.package_code_id,
                        quantity: Number(depositObject.quantity),
                        price: Number(depositObject.price),
                        discount: Number(depositObject.discount),
                    };
                }),
                payments: [
                    // Create from deposit payment where unusedAmount > 0
                    ...deposit_payment
                        .filter((x) => x.unused_value > 0)
                        .map((x) => {
                        return {
                            date: new Date(x.date),
                            value: x.unused_value,
                            payment_method_id: x.payment_method_id,
                        };
                    }),
                ],
                type: result.type,
            });
            // Create a new bill code
            bill_code_model_1.default.create({
                sales: result.sales,
                uuid: (0, uuid_1.v4)(),
                name: bill_code_model_1.default.generateName(date),
                date: date,
                customer_id: result.customer_id,
                created_by: userID,
                discount: Number(result.discount),
                delivery: Number(result.delivery),
                service: Number(result.service),
                items: deposit
                    .filter((y) => y.checked)
                    .map((x) => {
                    const depositIndex = result.deposit.findIndex((y) => y.id == x.id);
                    const depositObject = result.deposit[depositIndex];
                    return {
                        item_id: depositObject.item_id,
                        item_unit_id: depositObject.item_unit_id,
                        package_code_id: depositObject.package_code_id,
                        quantity: Number(depositObject.quantity),
                        price: Number(depositObject.price),
                        discount: Number(depositObject.discount),
                    };
                }),
                is_paid: is_paid,
                payments: [
                    ...deposit_payment
                        .filter((x) => x.value > 0)
                        .map((x) => {
                        return {
                            date: new Date(x.date),
                            value: x.value,
                            payment_method_id: x.payment_method_id,
                        };
                    }),
                    ...deposit_bill_payment.map((x) => {
                        return {
                            date: new Date(x.date),
                            value: x.value,
                            payment_method_id: x.payment_method_id,
                        };
                    }),
                ],
                payment_term: paymentTerm,
            }).then((result) => __awaiter(void 0, void 0, void 0, function* () {
                const delivery = Number(result.delivery);
                const discount = Number(result.discount);
                const service = Number(result.service);
                const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
                    return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
                }, 0);
                const createSalesInvoiceNetTotal = createSalesInvoiceTotal - discount + delivery + service;
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
                            displayQuantity: Number(result.bill[i].quantity) * -1,
                            quantity: Number(result.bill[i].quantity) *
                                -1 *
                                (result.bill[i].item_unit != null
                                    ? Number(result.bill[i].item_unit.conversion)
                                    : 1),
                            unit: result.bill[i].item_unit == null
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
            }));
        }
        else {
            // Every thing is checked, just update the deposit
            yield deposit_model_1.default.confirmByID({
                id: id,
            });
            bill_code_model_1.default.create({
                sales: result.sales,
                uuid: (0, uuid_1.v4)(),
                name: bill_code_model_1.default.generateName(date),
                date: date,
                customer_id: result.customer_id,
                created_by: userID,
                discount: Number(result.discount),
                delivery: Number(result.delivery),
                service: Number(result.service),
                items: deposit.map((x) => {
                    const depositIndex = result.deposit.findIndex((y) => y.id == x.id);
                    const depositObject = result.deposit[depositIndex];
                    return {
                        item_id: depositObject.item_id,
                        item_unit_id: depositObject.item_unit_id,
                        package_code_id: depositObject.package_code_id,
                        quantity: Number(depositObject.quantity),
                        price: Number(depositObject.price),
                        discount: Number(depositObject.discount),
                    };
                }),
                is_paid: is_paid,
                payments: [
                    ...deposit_payment
                        .filter((x) => x.value > 0)
                        .map((x) => {
                        return {
                            date: new Date(x.date),
                            value: x.value,
                            payment_method_id: x.payment_method_id,
                        };
                    }),
                    ...deposit_bill_payment.map((x) => {
                        return {
                            date: new Date(x.date),
                            value: x.value,
                            payment_method_id: x.payment_method_id,
                        };
                    }),
                ],
                payment_term: paymentTerm,
            }).then((result) => __awaiter(void 0, void 0, void 0, function* () {
                const delivery = Number(result.delivery);
                const discount = Number(result.discount);
                const service = Number(result.service);
                const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
                    return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
                }, 0);
                const createSalesInvoiceNetTotal = createSalesInvoiceTotal - discount + delivery + service;
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
                            displayQuantity: Number(result.bill[i].quantity) * -1,
                            quantity: Number(result.bill[i].quantity) *
                                -1 *
                                (result.bill[i].item_unit != null
                                    ? Number(result.bill[i].item_unit.conversion)
                                    : 1),
                            unit: result.bill[i].item_unit == null
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
            }));
        }
    }))
        .catch((error) => {
        console.error(`[error]: Error on fetching deposit ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = DepositController;
//# sourceMappingURL=deposit.controller.js.map