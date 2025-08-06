"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesDepositPaymentRepository = void 0;
class SalesDepositPaymentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async fetchPaymentsByDate(date) {
        try {
            const result = await this.prisma.sales_deposit_payment.groupBy({
                by: ["payment_method_id"],
                _sum: {
                    value: true,
                },
                where: {
                    date: date,
                    sales_deposit_code: {
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
            const result = await this.prisma.sales_deposit_payment.findMany({
                where: {
                    date: date,
                    sales_deposit_code: {
                        is_delete: false,
                    },
                    payment_method_id: 0,
                },
                select: {
                    value: true,
                    sales_deposit_code: {
                        select: {
                            sales: true,
                        },
                    },
                },
            });
            const salesNames = Array.from(new Set(result.map((x) => { var _a; return (_a = x.sales_deposit_code) === null || _a === void 0 ? void 0 : _a.sales; })));
            const salesSummary = salesNames.map((salesName) => ({
                sales: salesName,
                value: result
                    .filter((x) => { var _a; return ((_a = x.sales_deposit_code) === null || _a === void 0 ? void 0 : _a.sales) === salesName; })
                    .reduce((sum, x) => sum + Number(x.value), 0),
            }));
            return salesSummary;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.SalesDepositPaymentRepository = SalesDepositPaymentRepository;
//# sourceMappingURL=sales-deposit-payment.repository.js.map