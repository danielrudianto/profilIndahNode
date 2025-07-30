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
}
exports.OverpaymentRepository = OverpaymentRepository;
//# sourceMappingURL=overpayment.repository.js.map