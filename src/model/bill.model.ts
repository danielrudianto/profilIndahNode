import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class BillModel {
  id?: number;
  item_id: number;
  price: number;
  quantity: number;
  discount: number;
  bill_code_id: number;

  constructor(
    item_id: number,
    price: number,
    quantity: number,
    discount: number,
    bill_code_id: number
  ) {
    this.item_id = item_id;
    this.price = price;
    this.quantity = quantity;
    this.discount = discount;
    this.bill_code_id = bill_code_id;
  }

  static create(bill: BillModel[]) {
    return prisma.bill.createMany({
      data: bill,
    });
  }
}

export default BillModel;
