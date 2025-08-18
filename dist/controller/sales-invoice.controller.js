"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const draft_bill_model_1 = require("../model/draft-bill.model");
const moment_1 = __importDefault(require("moment"));
const queue_helper_1 = require("../helper/queue.helper");
const sales_invoice_payment_model_1 = require("../model/sales-invoice-payment.model");
class SalesInvoiceController {
    constructor(salesInvoiceRepository, receivableRepository, salesReturnRepository, stockOutRepository, productStockRepository, salesInvoicePaymentRepository, stockCardRepository) {
        this.create = async (req, res, next) => {
            const userID = req.body.userId;
            const customerID = req.body.customer_id;
            const discount = Number(req.body.discount);
            const delivery = Number(req.body.delivery);
            const service = Number(req.body.service);
            const sales_invoice = req.body.sales_invoice;
            const sales_invoice_payment = req.body.sales_invoice_payment;
            const paymentTerm = req.body.payment_term;
            const date = (0, escape_helper_1.translateDate)(req.body.date);
            const isPaid = req.body.is_paid;
            const sales = (0, escape_helper_1.translateSalesName)(req.body.sales);
            const uuid = req.body.uuid;
            try {
                const billResult = await this.salesInvoiceRepository.create({
                    name: this.salesInvoiceRepository.generateName(date),
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
                    sales_invoice: sales_invoice,
                    sales_invoice_payment: sales_invoice_payment.map((x) => {
                        return new sales_invoice_payment_model_1.SalesInvoicePaymentModel({
                            date: (0, escape_helper_1.translateDate)(x.date),
                            payment_method_id: x.payment_method_id,
                            value: Number(x.value),
                            sales_invoice_code_id: 0,
                        });
                    }),
                    isDelete: false,
                });
                if (!billResult) {
                    return res.status(500).send(error_list_1.default["Sales invoice creation failed"]);
                }
                if (!isPaid) {
                    await this.receivableRepository.addReceivableValue(billResult.delivery +
                        billResult.service -
                        billResult.discount +
                        billResult.sales_invoice.reduce((a, b) => {
                            return a + (b.price - b.discount) * b.quantity;
                        }, 0) -
                        billResult.sales_invoice_payment.reduce((a, b) => {
                            return a + b.value;
                        }, 0));
                }
                await this.stockOutRepository.create(billResult.sales_invoice.map((x) => {
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
                        sales_invoice_code_id: billResult.id,
                    };
                }));
                await this.productStockRepository.updateMany(billResult.sales_invoice.map((x) => {
                    const conversion = x.product_unit == null ? 1 : x.product_unit.conversion;
                    return {
                        productID: x.product_id,
                        quantity: -1 * x.quantity * conversion,
                    };
                }));
                const stockCardResult = await this.stockCardRepository.createMany(billResult.sales_invoice.map((x) => {
                    const conversion = x.product_unit == null ? 1 : x.product_unit.conversion;
                    return {
                        product_id: x.product_id,
                        product_unit_id: x.product_unit_id,
                        quantity: -1 * x.quantity * conversion,
                        display_quantity: -1 * x.quantity,
                        date: billResult.date,
                        document_name: billResult.name,
                        sales_invoice_id: x.id,
                        sales_invoice_code_id: billResult.id,
                        adjustment_case_code_id: null,
                        adjustment_case_id: null,
                        good_receipt_code_id: null,
                        good_receipt_id: null,
                        sales_return_id: null,
                        sales_return_code_id: null,
                        stock: null,
                        customer_id: billResult.customerID,
                        supplier_id: null,
                        created_at: new Date(),
                    };
                }));
                stockCardResult.forEach(async (x) => {
                    await queue_helper_1.queue.add("stock-card-inserted", {
                        id: x.id,
                    });
                });
                return res.status(201).send(billResult);
            }
            catch (error) {
                console.error(`[error]: Error on creating bill ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            const salesInvoice = await this.salesInvoiceRepository.fetchByID(id);
            if (!salesInvoice) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            if (salesInvoice.isDelete) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            const salesReturn = await this.salesReturnRepository.fetchBySalesInvoiceCodeID(id);
            if (salesReturn) {
                return res.status(400).send(error_list_1.default["Sales return exists"]);
            }
            try {
                const result = await this.salesInvoiceRepository.deleteByID(id, userID);
                await this.productStockRepository.updateMany(salesInvoice.sales_invoice.map((x) => {
                    return {
                        productID: x.product_id,
                        quantity: (x.product_unit == null ? 1 : x.product_unit.conversion) *
                            x.quantity,
                    };
                }));
                await this.stockOutRepository.deleteMany(salesInvoice.sales_invoice.map((x) => {
                    return {
                        sales_invoice_id: x.id,
                        sales_invoice_code_id: salesInvoice.id,
                        adjustment_case_id: null,
                        adjustment_case_code_id: null,
                    };
                }));
                for (let i = 0; i < salesInvoice.sales_invoice.length; i++) {
                    await queue_helper_1.queue.add("stock-card-deleted", {
                        sales_invoice_code_id: salesInvoice.id,
                        sales_invoice_id: salesInvoice.sales_invoice[i].id,
                        adjustment_case_code_id: null,
                        adjustment_case_id: null,
                        sales_return_code_id: null,
                        sales_return_id: null,
                        good_receipt_code_id: null,
                        good_receipt_id: null,
                    });
                }
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting sales invoice ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAnnualArchives = async (req, res) => {
            try {
                const result = await this.salesInvoiceRepository.fetchAnnualArchives();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching archives ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchArchives = async (req, res) => {
            const year = req.body.year;
            const month = req.body.month;
            const keyword = (0, escape_helper_1.translateKeyword)(req.body.keyword);
            const page = (0, escape_helper_1.translatePage)(req.body.page);
            const pageSize = req.body.pageSize;
            const isActive = req.body.isActive;
            const isDelete = req.body.isDelete;
            const isPaid = req.body.isPaid;
            const isUnpaid = req.body.isUnpaid;
            const sortBy = req.body.sortBy;
            const sortDirection = req.body.sortDirection;
            const startDate = new Date(req.body.startDate);
            const endDate = new Date(req.body.endDate);
            try {
                const result = await this.salesInvoiceRepository.fetchArchives({
                    month: month,
                    year: year,
                    keyword: keyword,
                    limit: pageSize,
                    offset: (page - 1) * pageSize,
                    isPaid: isPaid,
                    isActive: isActive,
                    isUnpaid: isUnpaid,
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
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.salesInvoiceRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: error during fetching sales invoice by ID ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchPayments = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const payments = this.salesInvoicePaymentRepository.fetchPaymentsBySalesInvoiceCodeID(id);
                return res.status(200).send(payments);
            }
            catch (error) {
                console.error(`[error]: Error on fetching payments ${error}`);
                return res.status(500).send(error);
            }
        };
        this.searchSalesReturn = async (req, res) => {
            const date = new Date(req.body.date);
            const sales_invoice = req.body.sales_invoice;
            try {
                const result = await this.salesInvoiceRepository.searchByReturns(date, sales_invoice);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching sales return ${error}`);
                return res.status(500).send(error);
            }
        };
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.receivableRepository = receivableRepository;
        this.salesReturnRepository = salesReturnRepository;
        this.stockOutRepository = stockOutRepository;
        this.productStockRepository = productStockRepository;
        this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
        this.stockCardRepository = stockCardRepository;
    }
}
SalesInvoiceController.fetchByOTC = (req, res) => {
    const otc = req.params.otc;
    const date = (0, moment_1.default)().format("YYYY-MM-DD");
    draft_bill_model_1.DraftBillModel.fetchByOTC({
        otc: otc,
        date: date,
    })
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            return res.status(200).send(result);
        }
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching bill by OTC ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = SalesInvoiceController;
//# sourceMappingURL=sales-invoice.controller.js.map