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

  static fetchQuantitySoldByDate(date: Date = new Date()){
    return prisma.$queryRaw`
      SELECT SUM(quantity) AS quantity
      FROM bill
      JOIN bill_code
      ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1} AND DAY(bill_code.date) = ${date.getDate()}`;
  }
}

export default BillModel;
