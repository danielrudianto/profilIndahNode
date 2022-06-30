"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BillModel {
    static countItemByReference(reference) {
        return prisma.bill.count({
            where: {
                item: {
                    reference: reference,
                },
            },
        });
    }
    static countByCustomerId(customer_id) {
        return prisma.bill_code.count({
            where: {
                customer_id: customer_id,
                is_delete: false
            }
        });
    }
    static countByCustomerIds(customer_ids) {
        return prisma.bill_code.groupBy({
            by: ["customer_id"],
            where: {
                customer_id: {
                    in: customer_ids
                },
                is_delete: false
            },
            _count: true
        });
    }
}
exports.default = BillModel;
