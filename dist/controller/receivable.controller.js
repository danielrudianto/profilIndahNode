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
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const customer_model_1 = __importDefault(require("../model/customer.model"));
const bill_payment_model_1 = __importDefault(require("../model/bill_payment.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
class ReceivableController {
}
_a = ReceivableController;
ReceivableController.receivable = 0;
/**
 * Fetch all receivable
 * @param req
 * @param res
 */
ReceivableController.fetch = (req, res) => {
    bill_code_model_1.default.fetchReceivableIDs().then((result) => __awaiter(void 0, void 0, void 0, function* () {
        bill_code_model_1.default.fetchReceivableByIDs(result.map((x) => {
            return x.id;
        }))
            .then((receivables) => {
            return res.status(200).send(receivables);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching receivable ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }));
};
ReceivableController.fetchByCustomerID = (req, res) => {
    const customerID = req.params.id;
    bill_code_model_1.default.fetchBillIDByCustomerID(Number(customerID))
        .then((result) => {
        bill_code_model_1.default.fetchReceivableDetailByIDs(result.map((x) => {
            return x.id;
        })).then((receivables) => __awaiter(void 0, void 0, void 0, function* () {
            return res.status(200).send({
                data: receivables,
                customer: Number(customerID) == 0
                    ? {
                        name: "Retail Customer",
                        address: "Retail Customer",
                        phone: "Retail Customer",
                        email: "Retail Customer",
                    }
                    : yield customer_model_1.default.fetchByID(Number(customerID)),
            });
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch receivable by customer id ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
ReceivableController.fetchPaymentsHistory = (req, res) => {
    const id = req.params.id;
    bill_payment_model_1.default.fetchByBillCodeID(Number(id))
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch payments history by bill code id [${id}]`);
        return res.status(500).send(error);
    });
};
ReceivableController.createPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const payment_method_id = req.body.payment_method_id;
    const full_payment = req.body.full_payment;
    const sales_invoice_id = req.body.sales_invoice_id;
    const date = new Date(req.body.date);
    const salesInvoice = yield bill_code_model_1.default.fetchByID(sales_invoice_id);
    if (!salesInvoice) {
        return res.status(404).send({
            message: "Sales invoice not found",
        });
    }
    else if (salesInvoice.is_delete) {
        return res.status(400).send({
            message: "Sales invoice is already deleted",
        });
    }
    else if (salesInvoice.is_paid) {
        return res.status(400).send({
            message: "Sales invoice is already paid",
        });
    }
    else {
        const totalInvoice = salesInvoice.bill.reduce((a, b) => {
            return (a +=
                Number(b.quantity) * (Number(b.price) - Number(b.discount)));
        }, 0);
        const totalInvoiceValue = totalInvoice -
            Number(salesInvoice.discount) +
            Number(salesInvoice.delivery) +
            Number(salesInvoice.service);
        const totalPayment = salesInvoice.bill_payment.reduce((a, b) => {
            return (a += Number(b.value));
        }, 0);
        if (full_payment == true) {
            const payment = {
                bill_code_id: sales_invoice_id,
                payment_method_id: payment_method_id == 0 ? null : payment_method_id,
                value: totalInvoiceValue - totalPayment,
                date: date,
                is_paid: true,
            };
            bill_payment_model_1.default.create(payment)
                .then(([result, _]) => {
                _a.receivable -= totalInvoiceValue - totalPayment;
                return res.status(200).send(result);
            })
                .catch((error) => {
                console.error(`[error]: Error on creating payment ${error}`);
                return res.status(500).send(error);
            });
        }
        else {
            const value = req.body.amount;
            if (value > totalInvoiceValue - totalPayment) {
                return res.status(400).send({
                    message: "Payment amount is greater than the remaining invoice value",
                });
            }
            else if (value + totalPayment < totalInvoiceValue) {
                const payment = {
                    bill_code_id: sales_invoice_id,
                    payment_method_id: payment_method_id == 0 ? null : payment_method_id,
                    value: value,
                    date: date,
                    is_paid: false,
                };
                bill_payment_model_1.default.create(payment)
                    .then(([result, _]) => {
                    _a.receivable -= value;
                    return res.status(200).send(result);
                })
                    .catch((error) => {
                    console.error(`[error]: Error on creating payment ${error}`);
                    return res.status(500).send(error);
                });
            }
            else if (value + totalPayment == totalInvoiceValue) {
                const payment = {
                    bill_code_id: sales_invoice_id,
                    payment_method_id: payment_method_id == 0 ? null : payment_method_id,
                    value: value,
                    date: date,
                    is_paid: true,
                };
                bill_payment_model_1.default.create(payment)
                    .then(([result, _]) => {
                    _a.receivable -= value;
                    return res.status(200).send(result);
                })
                    .catch((error) => {
                    console.error(`[error]: Error on creating payment ${error}`);
                    return res.status(500).send(error);
                });
            }
        }
    }
});
ReceivableController.deletePayment = (req, res) => {
    const id = req.params.id;
    bill_payment_model_1.default.deleteByID(Number(id))
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on delete payment ${error}`);
        return res.status(500).send(error);
    });
};
ReceivableController.checkReceivable = () => {
    bill_code_model_1.default.calculateReceivables()
        .then((result) => {
        _a.receivable = result.length == 0 ? 0 : Number(result[0].value);
    })
        .catch((error) => {
        console.error(`[error]: Error on check receivable ${error}`);
    });
};
exports.default = ReceivableController;
//# sourceMappingURL=receivable.controller.js.map