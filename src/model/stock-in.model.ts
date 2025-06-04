import { prisma } from "../app";

export interface IStockInInterface {
  id?: number;
  date: Date;
  company_id: number;
  quantity: number;
  price: number;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  item_id: number;
}

export enum IStockInFetchMethod {
  BY_GOOD_RECEIPT_CODE_ID = "by_good_receipt_code_id",
  BY_ADJUSTMENT_CASE_CODE_ID = "by_adjustment_case_code_id",
}

export class StockInModel {
  id?: number;
  date: Date;
  company_id: number;
  quantity: number;
  price: number;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  item_id: number;
  residue: number;
  // initialize the model with default values
  constructor(data: IStockInInterface) {
    this.id = data.id;
    this.date = data.date;
    this.company_id = data.company_id;
    this.quantity = data.quantity;
    this.price = data.price;
    this.good_receipt_id = data.good_receipt_id || null;
    this.good_receipt_code_id = data.good_receipt_code_id || null;
    this.adjustment_case_id = data.adjustment_case_id || null;
    this.adjustment_case_code_id = data.adjustment_case_code_id || null;
    this.item_id = data.item_id;
    this.residue = data.quantity; // default residue is the same as quantity
  }

  create() {
    return prisma.stock_in.create({
      data: {
        date: this.date,
        company_id: this.company_id,
        quantity: this.quantity,
        price: this.price,
        good_receipt_id: this.good_receipt_id,
        good_receipt_code_id: this.good_receipt_code_id,
        adjustment_case_id: this.adjustment_case_id,
        adjustment_case_code_id: this.adjustment_case_code_id,
        item_id: this.item_id,
        residue: this.residue, // include residue in the creation
      },
    });
  }

  static createMany(data: IStockInInterface[]) {
    return prisma.stock_in.createMany({
      data: data.map((item) => {
        return {
          date: item.date,
          company_id: item.company_id,
          quantity: item.quantity,
          price: item.price,
          good_receipt_id: item.good_receipt_id,
          good_receipt_code_id: item.good_receipt_code_id,
          adjustment_case_id: item.adjustment_case_id,
          adjustment_case_code_id: item.adjustment_case_code_id,
          item_id: item.item_id,
          residue: item.quantity, // default residue is the same as quantity
        };
      }),
    });
  }

  static fetch(method: IStockInFetchMethod, id: number) {
    switch (method) {
      case IStockInFetchMethod.BY_GOOD_RECEIPT_CODE_ID:
        return prisma.stock_in.findMany({
          where: {
            good_receipt_code_id: id,
          },
          select: {
            id: true,
          },
        });
      case IStockInFetchMethod.BY_ADJUSTMENT_CASE_CODE_ID:
        return prisma.stock_in.findMany({
          where: {
            adjustment_case_code_id: id,
          },
          select: {
            id: true,
          },
        });
      default:
        throw new Error("Invalid fetch method");
    }
  }

  static deleteMany(id: number[]) {
    return prisma.stock_in.deleteMany({
      where: {
        id: {
          in: id,
        },
      },
    });
  }

  static deleteByReferenceIDs(
    data: {
      good_receipt_id: number | null;
      good_receipt_code_id: number | null;
      adjustment_event_id: number | null;
      adjustment_event_code_id: number | null;
    }[]
  ) {
    const deleteQuery = [];
    for (let i = 0; i < data.length; i++) {
      deleteQuery.push(
        prisma.stock_in.deleteMany({
          where: {
            good_receipt_id: data[i].good_receipt_id,
            good_receipt_code_id: data[i].good_receipt_code_id,
          },
        })
      );
    }

    return prisma.$transaction(deleteQuery);
  }

  static rollBack(
    data: {
      id: number;
      quantity: number;
    }[]
  ) {
    const updateQuery = [];
    for (let i = 0; i < data.length; i++) {
      updateQuery.push(
        prisma.stock_in.update({
          where: {
            id: data[i].id,
          },
          data: {
            residue: {
              increment: data[i].quantity,
            },
          },
        })
      );
    }

    return prisma.$transaction(updateQuery);
  }

  static fetchByItemID(item_id: number) {
    return prisma.stock_in.findFirst({
      where: {
        residue: {
          gt: 0,
        },
        item_id: item_id,
      },
      orderBy: {
        date: "asc",
      },
    });
  }

  static updateQuantity(id: number, quantity: number) {
    return prisma.stock_in.update({
      where: {
        id: id,
      },
      data: {
        quantity: quantity,
      },
    });
  }

  static updatePrice(
    data: {
      good_receipt_id: number | null;
      good_receipt_code_id: number | null;
      adjustment_event_id: number | null;
      adjustment_event_code_id: number | null;
      price: number;
    }[]
  ) {
    const updateQuery = [];
    for (let i = 0; i < data.length; i++) {
      updateQuery.push(
        prisma.stock_in.updateMany({
          where: {
            good_receipt_id: data[i].good_receipt_id,
            good_receipt_code_id: data[i].good_receipt_code_id,
            adjustment_case_id: data[i].adjustment_event_id,
            adjustment_case_code_id: data[i].adjustment_event_code_id,
          },
          data: {
            price: data[i].price,
          },
        })
      );
    }

    return prisma.$transaction(updateQuery);
  }
}
