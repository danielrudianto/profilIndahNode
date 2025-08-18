"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoicePaymentController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
class SalesInvoicePaymentController {
    constructor(salesInvoicePaymentRepository, receivableRepository, salesInvoiceRepository) {
        this.create = async (req, res) => {
            var _a;
            const sales_invoice_code_id = req.body.sales_invoice_code_id;
            const payment_method_id = req.body.payment_method_id;
            const value = req.body.value;
            const date = new Date(req.body.date);
            try {
                const salesInvoice = await this.salesInvoiceRepository.fetchByID(sales_invoice_code_id);
                if (!salesInvoice || salesInvoice.isDelete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const previousPayments = (_a = salesInvoice.sales_invoice_payment) === null || _a === void 0 ? void 0 : _a.reduce((a, b) => {
                    return a + b.value;
                }, 0);
                const salesInvoiceValue = salesInvoice.sales_invoice.reduce((a, b) => {
                    return a + b.quantity * (b.price - b.discount);
                }, 0) +
                    salesInvoice.delivery +
                    salesInvoice.service -
                    salesInvoice.discount;
                // may not be greater
                if (salesInvoiceValue < previousPayments + value) {
                    return res
                        .status(400)
                        .send(error_list_1.default["Sales invoice payment is greater than value"]);
                }
                const result = await this.salesInvoicePaymentRepository.create({
                    sales_invoice_code_id: sales_invoice_code_id,
                    value: value,
                    payment_method_id: payment_method_id,
                    date: date,
                });
                await this.receivableRepository.addReceivableValue(value * -1);
                return res.status(201).send(result);
            }
            catch (error) {
                return res.status(500).send(error);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const salesInvoicePayment = await this.salesInvoicePaymentRepository.fetchByID(id);
                if (!salesInvoicePayment) {
                    return res
                        .status(404)
                        .send(error_list_1.default["Sales invoice payment not found"]);
                }
                const result = await this.salesInvoicePaymentRepository.delete(id, salesInvoicePayment.sales_invoice_code_id);
                // add to receivable
                await this.receivableRepository.addReceivableValue(salesInvoicePayment.value);
                return res.status(200).send(salesInvoicePayment);
            }
            catch (error) {
                throw error;
            }
        };
        this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
        this.receivableRepository = receivableRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
    }
}
exports.SalesInvoicePaymentController = SalesInvoicePaymentController;
//# sourceMappingURL=sales-invoice-payment.controller.js.map