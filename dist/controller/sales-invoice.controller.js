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
    constructor(salesInvoiceRepository, receivableRepository, salesReturnRepository, stockOutRepository, stockRepository, salesInvoicePaymentRepository, stockCardRepository) {
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
                await this.stockRepository.updateMany(billResult.sales_invoice.map((x) => {
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
                await this.stockRepository.updateMany(salesInvoice.sales_invoice.map((x) => {
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
            const offset = req.body.pageSize;
            const isActive = req.body.isActive;
            const isDelete = req.body.isDelete;
            const isPaid = req.body.isPaid;
            const isUnpaid = req.body.isUnpaid;
            const sortBy = req.body.sortBy;
            const sortDirection = req.body.sortDirection;
            try {
                const result = await this.salesInvoiceRepository.fetchArchives({
                    month: month,
                    year: year,
                    keyword: keyword,
                    limit: offset,
                    offset: (page - 1) * offset,
                    isPaid: isPaid,
                    isActive: isActive,
                    isUnpaid: isUnpaid,
                    isDelete: isDelete,
                    sortBy: sortBy,
                    sortDirection: sortDirection,
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
        this.search = async (req, res) => {
            const filterObject = req.body.filterObject;
            const keyword = (0, escape_helper_1.translateKeyword)(req.body.keyword);
            const page = (0, escape_helper_1.translatePage)(req.body.page);
            const pageSize = Number(process.env.LIMIT);
            try {
                const result = await this.salesInvoiceRepository.search(this.validateSearch(filterObject), keyword, page, pageSize);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on searching sales invoice ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
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
        this.validateSearch = (filters) => {
            const { dateStart = null, dateEnd = null, customers = [], status = 2, } = filters;
            return { dateStart, dateEnd, customers, status };
        };
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.receivableRepository = receivableRepository;
        this.salesReturnRepository = salesReturnRepository;
        this.stockOutRepository = stockOutRepository;
        this.stockRepository = stockRepository;
        this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
        this.stockCardRepository = stockCardRepository;
    }
}
/**
 * Search sales invoice data archive
 * @param req
 * @param res
 */
SalesInvoiceController.fetchArchive = (req, res) => {
    // const year = req.body.year;
    // const month = req.body.month;
    // if (year == null && month == null) {
    //   BillCodeModel.fetchArchiveYears()!
    //     .then((result) => {
    //       return res.status(200).send(
    //         result
    //           .map((x) => {
    //             return {
    //               year: x.year,
    //               count: parseInt(x.count.toString().replace("n", "")),
    //             };
    //           })
    //           .sort((a, b) => {
    //             return a.year - b.year;
    //           })
    //       );
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else if (year != null && month == null) {
    //   const year = req.body.year;
    //   BillCodeModel.fetchArchiveMonths(year)
    //     .then((result) => {
    //       const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    //       result.forEach((x) => {
    //         response[x.month - 1] = parseInt(
    //           x.count.toString().replace("n", "")
    //         );
    //       });
    //       return res.status(200).send(response);
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else {
    //   const mode = req.body.mode;
    //   const page = req.body.limit.page;
    //   const keyword = req.body.search.keyword;
    //   BillCodeModel.fetchArchive({
    //     year: year,
    //     month: month,
    //     mode: mode,
    //     limit: 10,
    //     offset: (page - 1) * 10,
    //     keyword: mysql_real_escape_string(keyword),
    //   })!
    //     .then((result) => {
    //       return res.status(200).send({
    //         data: result[0].map((x) => {
    //           return {
    //             id: x.id,
    //             name: x.name,
    //             date: x.date,
    //             is_delete: x.is_delete == 1,
    //             is_confirm: x.is_confirm == 1,
    //             customer_name: x.customer_name,
    //             sales: x.sales,
    //           };
    //         }),
    //         count:
    //           result[1] == null || result[1].length == 0
    //             ? 0
    //             : parseInt(result[1][0].count.toString().replace("n", "")),
    //       });
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // }
};
SalesInvoiceController.fetchArchiveV2 = (req, res) => {
    // const year = req.body.year;
    // const month = req.body.month;
    // if (year == null && month == null) {
    //   BillCodeModel.fetchArchiveYearsV2()!
    //     .then((result) => {
    //       return res.status(200).send(
    //         result.map((x) => {
    //           return {
    //             year: x.year,
    //             month: x.month,
    //             count: Number(x.count.toString().replace("n", "")),
    //           };
    //         })
    //       );
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else {
    //   const keyword = req.body.keyword;
    //   const page = req.body.page ?? 1;
    //   const status = req.body.status;
    //   const paymentStatus = req.body.paymentStatus;
    //   const startDate = req.body.startDate;
    //   const endDate = req.body.endDate;
    //   BillCodeModel.fetchArchiveV2({
    //     year: Number(year),
    //     month: Number(month),
    //     mode: status,
    //     status: status,
    //     paymentStatus: paymentStatus,
    //     limit: 20,
    //     offset: (page - 1) * 20,
    //     keyword: mysql_real_escape_string(keyword ?? ""),
    //     startDate: startDate,
    //     endDate: endDate,
    //   })!
    //     .then((result) => {
    //       return res.status(200).send({
    //         data: result[0].map((x) => {
    //           return {
    //             id: x.id,
    //             name: x.name,
    //             date: x.date,
    //             is_delete: x.is_delete == 1,
    //             is_confirm: x.is_confirm == 1,
    //             customer_name: x.customer_name,
    //             sales: x.sales,
    //             is_paid: x.is_paid == 1,
    //           };
    //         }),
    //         count:
    //           result[1] == null || result[1].length == 0
    //             ? 0
    //             : parseInt(result[1][0].count.toString().replace("n", "")),
    //       });
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // }
};
/**
 * Fetch bill by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchByID = (req, res) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.fetchByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     let subTotal = 0;
    //     for (let item of result.bill) {
    //       subTotal += Number(item.price) * Number(item.quantity);
    //     }
    //     return res.status(200).send({
    //       ...result,
    //       subTotal: subTotal,
    //       discount: Number(result.discount),
    //       delivery: Number(result.delivery),
    //       service: Number(result.service),
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetching sales invoice by ID ${error}`
    //     );
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
SalesInvoiceController.fetchPaymentsByID = (req, res) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.fetchPaymentsByID(id)
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching payments by ID ${error}`);
    //     return res.status(500).send(error);
    //   });
};
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
SalesInvoiceController.deletePaymentByID = (req, res) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.deletePaymentByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     BillCodeModel.evaluateBill(result.bill_code_id)
    //       .then(() => {
    //         return res.status(201).send(result);
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on evaluating bill value ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on deleting payment by ID ${error}`);
    //     return res.status(500).send(error);
    //   });
};
/**
 * Fetch bill code by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchCodeByID = (req, res) => {
    // const id = parseInt(req.params.id.toString());
    // BillModel.fetchByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching bill code ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
exports.default = SalesInvoiceController;
//# sourceMappingURL=sales-invoice.controller.js.map