"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoicePaymentRepository = void 0;
const sales_invoice_payment_model_1 = require("../model/sales-invoice-payment.model");
class SalesInvoicePaymentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.sales_invoice_payment.create({
                data: {
                    value: data.value,
                    payment_method_id: data.payment_method_id,
                    date: data.date,
                    sales_invoice_code_id: data.sales_invoice_code_id,
                },
            });
            return sales_invoice_payment_model_1.SalesInvoicePaymentModel.fromMap(result);
        }
        catch (error) {
            throw error;
        }
    }
    async fetchPaymentsBySalesInvoiceCodeID(id) {
        try {
            const result = await this.prisma.sales_invoice_payment.findMany({
                where: {
                    sales_invoice_code_id: id,
                },
                include: {
                    payment_method: true,
                },
            });
            return result.map((x) => {
                return sales_invoice_payment_model_1.SalesInvoicePaymentModel.fromMap(x);
            });
        }
        catch (error) {
            throw error;
        }
    }
    async fetchPaymentsByDate(date) {
        try {
            const result = await this.prisma.sales_invoice_payment.groupBy({
                by: ["payment_method_id"],
                _sum: {
                    value: true,
                },
                where: {
                    date: date,
                    sales_invoice_code: {
                        is_delete: false,
                    },
                },
            });
            return result.map((x) => {
                return {
                    payment_method_id: x.payment_method_id,
                    value: Number(x._sum.value),
                };
            });
        }
        catch (error) {
            throw error;
        }
    }
    async fetchDORPaymentsByDate(date) {
        try {
            const result = await this.prisma.sales_invoice_payment.findMany({
                where: {
                    date: date,
                    sales_invoice_code: {
                        is_delete: false,
                    },
                    payment_method_id: 0,
                },
                select: {
                    value: true,
                    sales_invoice_code: {
                        select: {
                            sales: true,
                        },
                    },
                },
            });
            const salesNames = Array.from(new Set(result.map((x) => { var _a; return (_a = x.sales_invoice_code) === null || _a === void 0 ? void 0 : _a.sales; })));
            const salesSummary = salesNames.map((salesName) => ({
                sales: salesName,
                value: result
                    .filter((x) => { var _a; return ((_a = x.sales_invoice_code) === null || _a === void 0 ? void 0 : _a.sales) === salesName; })
                    .reduce((sum, x) => sum + Number(x.value), 0),
            }));
            return salesSummary;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.SalesInvoicePaymentRepository = SalesInvoicePaymentRepository;
//# sourceMappingURL=sales-invoice-payment.repository.js.map