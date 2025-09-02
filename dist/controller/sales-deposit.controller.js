"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesDepositController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
const sales_deposit_payment_model_1 = require("../model/sales-deposit-payment.model");
class SalesDepositController {
    constructor(salesDepositRepository, salesInvoiceRepository, stockCardRepository, productStockRepository, stockOutRepository, receivableRepository, overpaymentRepository) {
        this.create = async (req, res) => {
            const userID = req.body.userId;
            const customerID = req.body.customer_id;
            const discount = Number(req.body.discount);
            const delivery = Number(req.body.delivery);
            const service = Number(req.body.service);
            const sales_invoice = req.body.sales_invoice;
            const sales_invoice_payment = req.body.sales_invoice_payment;
            const payment_term = req.body.payment_term;
            const date = (0, escape_helper_1.translateDate)(req.body.date);
            const isPaid = req.body.is_paid;
            const sales = (0, escape_helper_1.translateSalesName)(req.body.sales);
            const uuid = req.body.uuid;
            const type = req.body.type;
            try {
                const billResult = await this.salesDepositRepository.create({
                    name: this.salesDepositRepository.generateName(date),
                    uuid: uuid,
                    customerID: customerID,
                    discount: discount,
                    delivery: delivery,
                    service: service,
                    sales: sales,
                    isPaid: isPaid,
                    date: date,
                    createdBy: userID,
                    createdAt: new Date(),
                    isConfirm: true,
                    confirmedBy: userID,
                    confirmedAt: new Date(),
                    sales_deposit: sales_invoice,
                    sales_deposit_payment: sales_invoice_payment.map((x) => {
                        return new sales_deposit_payment_model_1.SalesDepositPaymentModel({
                            date: (0, escape_helper_1.translateDate)(x.date),
                            payment_method_id: x.payment_method_id,
                            value: Number(x.value),
                            sales_deposit_code_id: 0,
                        });
                    }),
                    isDelete: false,
                    type: type,
                });
                if (!billResult) {
                    return res.status(500).send(error_list_1.default["Sales deposit creation failed"]);
                }
                return res.status(201).send(billResult);
            }
            catch (error) {
                console.error(`[error]: Error on creating bill ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const pageSize = Number(process.env.LIMIT);
            try {
                const result = await this.salesDepositRepository.fetch({
                    page: page,
                    pageSize: pageSize,
                    keyword: keyword,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching sales deposit ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchByID = async (req, res) => {
            try {
                const id = Number(req.params.id);
                const result = await this.salesDepositRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Sales deposit not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching sales deposit ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchAnnualArchives = async (req, res) => {
            try {
                const result = await this.salesDepositRepository.fetchAnnualArchives();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching annual archive ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchArchives = async (req, res) => {
            const year = req.body.year;
            const month = req.body.month;
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const offset = Number(process.env.LIMIT);
            const isPending = req.body.isPending;
            const isDelete = req.body.isDelete;
            const startDate = new Date(`${req.body.startDate}T00:00:00+08:00`);
            const endDate = new Date(`${req.body.endDate}T23:59:59+08:00`);
            const sortBy = req.body.sortBy;
            const sortDirection = req.body.sortDirection;
            try {
                const result = await this.salesDepositRepository.fetchArchives({
                    month: month,
                    year: year,
                    keyword: keyword,
                    limit: offset,
                    offset: (page - 1) * offset,
                    isPending: isPending,
                    isDelete: isDelete,
                    sortBy: sortBy,
                    sortDirection: sortDirection,
                    startDate: startDate,
                    endDate: endDate,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching archive ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.confirm = async (req, res) => {
            var _a, _b;
            const id = Number(req.body.id);
            const date = new Date(req.body.date);
            const userID = req.body.userId;
            const sales_invoice_payment = req.body.sales_invoice_payment;
            try {
                const deposit = await this.salesDepositRepository.fetchByID(id);
                if (!deposit) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (deposit.isDelete || deposit.isConfirm) {
                    return res.status(400).send(error_list_1.default["Deposit already confirmed"]);
                }
                const value = ((_b = (_a = deposit.sales_deposit) === null || _a === void 0 ? void 0 : _a.reduce((a, b) => {
                    return a + b.quantity * (b.price - b.discount);
                }, 0)) !== null && _b !== void 0 ? _b : 0) +
                    deposit.delivery +
                    deposit.service -
                    deposit.discount;
                const payment = sales_invoice_payment.reduce((a, b) => {
                    return a + b.value;
                }, 0);
                if (payment > value) {
                    return res
                        .status(400)
                        .send(error_list_1.default["Sales deposit payment is greater than value"]);
                }
                const customerID = deposit.customerID;
                const result = await this.salesInvoiceRepository.create({
                    name: this.salesDepositRepository.generateName(date),
                    date: new Date(date),
                    customerID: customerID,
                    sales: deposit.sales,
                    createdAt: new Date(),
                    createdBy: userID,
                    discount: deposit.discount,
                    delivery: deposit.delivery,
                    service: deposit.service,
                    uuid: deposit.uuid,
                    sales_invoice: deposit.sales_deposit.map((x) => {
                        return {
                            product_id: x.product_id,
                            product_unit_id: x.product_unit_id,
                            quantity: x.quantity,
                            price: x.price,
                            discount: x.discount,
                        };
                    }),
                    sales_invoice_payment: sales_invoice_payment.map((x) => {
                        return {
                            payment_method_id: x.payment_method_id,
                            value: x.value,
                            date: new Date(x.date),
                            sales_invoice_code_id: 0,
                        };
                    }),
                    isPaid: deposit.isPaid,
                    isConfirm: true,
                    isDelete: false,
                    confirmedAt: new Date(),
                    confirmedBy: userID,
                });
                await this.salesDepositRepository.confirmByID(id, userID);
                if (!deposit.isPaid) {
                    await this.receivableRepository.addReceivableValue(value - payment);
                }
                await this.stockOutRepository.create(result.sales_invoice.map((x) => {
                    const conversion = x.product_unit == null ? 1 : x.product_unit.conversion;
                    return {
                        stock_in_id: null,
                        product_id: x.product_id,
                        adjustment_case_code_id: null,
                        adjustment_case_id: null,
                        date: date,
                        quantity: Number(x.quantity * conversion),
                        price: Number(x.price / conversion),
                        sales_invoice_id: x.id,
                        sales_invoice_code_id: result.id,
                    };
                }));
                await this.productStockRepository.updateMany(result.sales_invoice.map((x) => {
                    const conversion = x.product_unit == null ? 1 : x.product_unit.conversion;
                    return {
                        productID: x.product_id,
                        quantity: -1 * x.quantity * conversion,
                    };
                }));
                const stockCardResult = await this.stockCardRepository.createMany(result.sales_invoice.map((x) => {
                    const conversion = x.product_unit == null ? 1 : x.product_unit.conversion;
                    return {
                        product_id: x.product_id,
                        product_unit_id: x.product_unit_id,
                        quantity: -1 * x.quantity * conversion,
                        display_quantity: -1 * x.quantity,
                        date: result.date,
                        document_name: result.name,
                        sales_invoice_id: x.id,
                        sales_invoice_code_id: result.id,
                        adjustment_case_code_id: null,
                        adjustment_case_id: null,
                        good_receipt_code_id: null,
                        good_receipt_id: null,
                        sales_return_id: null,
                        sales_return_code_id: null,
                        stock: null,
                        customer_id: result.customerID,
                        supplier_id: null,
                        created_at: new Date(),
                    };
                }));
                stockCardResult.forEach(async (x) => {
                    await queue_helper_1.queue.add("stock-card-inserted", {
                        id: x.id,
                    });
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on confirming sales deposit ${error}`);
            }
        };
        this.reject = async (req, res) => {
            const id = Number(req.body.id);
            const userID = req.body.userId;
            const date = new Date(req.body.date);
            const return_payment_date = new Date(req.body.return_payment_date);
            const return_payment_method = req.body.return_payment_method;
            const return_payment_number = req.body.return_payment_number;
            const return_payment_bank = req.body.return_payment_bank;
            const return_payment_name = req.body.return_payment_name;
            try {
                const salesDeposit = await this.salesDepositRepository.fetchByID(id);
                if (!salesDeposit) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (salesDeposit.isConfirm || salesDeposit.isDelete) {
                    return res.status(400).send(error_list_1.default["Deposit already confirmed"]);
                }
                const result = await this.salesDepositRepository.delete(id, userID);
                await this.overpaymentRepository.createMany(salesDeposit.sales_deposit_payment.map((x) => {
                    return {
                        date: x.date,
                        sales_deposit_code_id: id,
                        customer_id: salesDeposit.customerID,
                        payment_method_id: x.payment_method_id,
                        return_payment_date: return_payment_date,
                        return_payment_bank: return_payment_bank,
                        return_payment_name: return_payment_name,
                        return_payment_method: return_payment_method,
                        return_payment_number: return_payment_number,
                        created_by: userID,
                        created_at: new Date(),
                        value: Number(x.value),
                    };
                }));
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting sales deposit ${error}`);
            }
        };
        this.salesDepositRepository = salesDepositRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.stockCardRepository = stockCardRepository;
        this.productStockRepository = productStockRepository;
        this.stockOutRepository = stockOutRepository;
        this.receivableRepository = receivableRepository;
        this.overpaymentRepository = overpaymentRepository;
    }
}
exports.SalesDepositController = SalesDepositController;
//# sourceMappingURL=sales-deposit.controller.js.map