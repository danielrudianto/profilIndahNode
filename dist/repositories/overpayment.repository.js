"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverpaymentRepository = void 0;
const overpayment_model_1 = require("../model/overpayment.model");
class OverpaymentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.overpayment.create({
                data: {
                    date: data.date,
                    sales_deposit_code_id: data.sales_deposit_code_id,
                    customer_id: data.customer_id,
                    return_payment_date: data.return_payment_date,
                    return_payment_method: data.return_payment_method,
                    return_payment_number: data.return_payment_number,
                    return_payment_bank: data.return_payment_bank,
                    return_payment_name: data.return_payment_name,
                    created_by: data.created_by,
                    created_at: data.created_at,
                    value: data.value,
                },
                include: {
                    customer: true,
                },
            });
            return overpayment_model_1.OverpaymentCodeModel.fromMap(result);
        }
        catch (error) {
            throw error;
        }
    }
    async createMany(data) {
        try {
            const insertQuery = data.map((x) => {
                return this.prisma.overpayment.create({
                    data: {
                        date: x.date,
                        sales_deposit_code_id: x.sales_deposit_code_id,
                        customer_id: x.customer_id,
                        return_payment_date: x.return_payment_date,
                        return_payment_method: x.return_payment_method,
                        return_payment_number: x.return_payment_number,
                        return_payment_bank: x.return_payment_bank,
                        return_payment_name: x.return_payment_name,
                        created_by: x.created_by,
                        created_at: x.created_at,
                        value: x.value,
                    },
                });
            });
            await this.prisma.$transaction(insertQuery);
        }
        catch (error) {
            throw error;
        }
    }
    async fetch(data) {
        let orderBy = {};
        switch (data.sortBy) {
            case "date":
                orderBy = {
                    date: data.sortDirection,
                };
                break;
            case "value":
                orderBy = {
                    value: data.sortDirection,
                };
                break;
            case "return":
                orderBy = {
                    return_payment_date: data.sortDirection,
                };
                break;
        }
        try {
            const [result, count] = await this.prisma.$transaction([
                this.prisma.overpayment.findMany({
                    include: {
                        customer: true,
                        user_overpayment_created_byTouser: {
                            include: {
                                user_avatar: true,
                            },
                        },
                    },
                    orderBy: orderBy,
                    take: data.pageSize,
                    skip: (data.page - 1) * data.pageSize,
                }),
                this.prisma.overpayment.count({}),
            ]);
            return {
                data: result.map((x) => {
                    return overpayment_model_1.OverpaymentCodeModel.fromMap(x);
                }),
                count: count,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async fetchReportByDate(date) {
        try {
            const result = await this.prisma.overpayment.findMany({
                where: {
                    return_payment_date: date,
                },
            });
            return result.map((x) => {
                return overpayment_model_1.OverpaymentCodeModel.fromMap(x);
            });
        }
        catch (error) {
            throw error;
        }
    }
    async fetchReportByReceiveDate(date) {
        try {
            const result = await this.prisma.overpayment.groupBy({
                by: ["payment_method_id"],
                _sum: {
                    value: true,
                },
                where: {
                    date: date,
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
    async fetchReportByReturnDate(date) {
        try {
            const result = await this.prisma.overpayment.groupBy({
                by: ["payment_method_id"],
                _sum: {
                    value: true,
                },
                where: {
                    return_payment_date: date,
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
    async fetchByID(id) {
        try {
            const result = await this.prisma.overpayment.findUnique({
                where: {
                    id: id,
                },
                include: {
                    customer: true,
                    user_overpayment_created_byTouser: {
                        include: {
                            user_avatar: true,
                        },
                    },
                    payment_method: true,
                },
            });
            if (!result) {
                return null;
            }
            return overpayment_model_1.OverpaymentCodeModel.fromMap(result);
        }
        catch (error) {
            throw error;
        }
    }
}
exports.OverpaymentRepository = OverpaymentRepository;
//# sourceMappingURL=overpayment.repository.js.map