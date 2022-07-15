"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BillModel {
    constructor(item_id, price, quantity, discount, bill_code_id) {
        this.item_id = item_id;
        this.price = price;
        this.quantity = quantity;
        this.discount = discount;
        this.bill_code_id = bill_code_id;
    }
    static create(bill) {
        return prisma.bill.createMany({
            data: bill,
        });
    }
}
exports.default = BillModel;
