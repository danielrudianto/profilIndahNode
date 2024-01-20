"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
class BillPaymentModel {
    static fetchByBillCodeID(id) {
        return app_1.prisma.bill_payment.findMany({
            where: {
                bill_code_id: id,
            },
            orderBy: {
                date: "desc",
            },
            include: {
                payment_method: {
                    select: {
                        name: true,
                        description: true,
                    },
                },
            },
        });
    }
    static create(data) {
        return app_1.prisma.$transaction([
            app_1.prisma.bill_payment.create({
                data: {
                    bill_code_id: data.bill_code_id,
                    payment_method_id: data.payment_method_id,
                    value: data.value,
                    date: data.date,
                },
            }),
            app_1.prisma.bill_code.update({
                where: {
                    id: data.bill_code_id,
                },
                data: {
                    is_paid: data.is_paid,
                },
            }),
        ]);
    }
    /**
     * Delete payment of sales invoice by ID
     */
    static deleteByID(id) {
        return app_1.prisma.bill_payment.delete({
            where: {
                id: id,
            },
        });
    }
}
exports.default = BillPaymentModel;
//# sourceMappingURL=bill_payment.model.js.map