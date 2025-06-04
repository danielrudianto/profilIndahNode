import { prisma } from "../app";
import { StockInModel } from "./stock-in.model";

export interface IStockoutModel {
  id?: number;
  item_id: number;
  quantity: number;
  bill_id: number | null;
  bill_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  date: Date;
  stock_in_id: number | null;
  price: number;
}

export enum IStockOutFetch {
  UNASSIGNED = "unassigned",
  BY_REFERENCE = "by_reference",
}

export enum IStockOutDelete {
  BY_STOCK_IN_IDS = "by_stock_in_ids",
  BY_REFERENCE_IDS = "by_reference_ids",
  BY_ID = "by_id",
}

export class StockOutModel {
  id?: number;
  item_id: number;
  quantity: number;
  bill_id: number | null;
  bill_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  date: Date;
  stock_in_id: number | null;
  stock_in?: StockInModel;
  price: number;

  // initialize the model with default values
  constructor(data: IStockoutModel) {
    this.id = data.id;
    this.item_id = data.item_id;
    this.quantity = data.quantity;
    this.bill_id = data.bill_id || null;
    this.bill_code_id = data.bill_code_id || null;
    this.adjustment_case_id = data.adjustment_case_id || null;
    this.adjustment_case_code_id = data.adjustment_case_code_id || null;
    this.date = data.date;
    this.stock_in_id = data.stock_in_id || null;
    this.price = data.price || 0; // default value for value
  }

  static createMany(data: IStockoutModel[]) {
    return prisma.stock_out.createMany({
      data: data.map((item) => {
        return {
          date: item.date,
          item_id: item.item_id,
          quantity: item.quantity,
          bill_id: item.bill_id,
          bill_code_id: item.bill_code_id,
          adjustment_case_id: item.adjustment_case_id,
          adjustment_case_code_id: item.adjustment_case_code_id,
          stock_in_id: item.stock_in_id,
          price: item.price, // include value in the creation
        };
      }),
    });
  }

  create() {
    return prisma.stock_out.create({
      data: {
        date: this.date,
        item_id: this.item_id,
        quantity: this.quantity,
        bill_id: this.bill_id,
        bill_code_id: this.bill_code_id,
        adjustment_case_id: this.adjustment_case_id,
        adjustment_case_code_id: this.adjustment_case_code_id,
        stock_in_id: this.stock_in_id,
        price: this.price, // include value in the creation
      },
    });
  }

  update() {
    return prisma.stock_out.update({
      where: {
        id: this.id,
      },
      data: {
        date: this.date,
        item_id: this.item_id,
        quantity: this.quantity,
        bill_id: this.bill_id,
        bill_code_id: this.bill_code_id,
        adjustment_case_id: this.adjustment_case_id,
        adjustment_case_code_id: this.adjustment_case_code_id,
        stock_in_id: this.stock_in_id,
        price: this.price, // include value in the update
      },
    });
  }

  static async fetch(method: IStockOutFetch, data?: any) {
    switch (method) {
      case IStockOutFetch.UNASSIGNED:
        const stockOut = await prisma.stock_out.findMany({
          where: {
            stock_in_id: null,
          },
          orderBy: {
            date: "asc",
          },
        });

        return stockOut.map((item) => {
          return new StockOutModel({
            id: item.id,
            item_id: item.item_id,
            quantity: Number(item.quantity),
            bill_id: item.bill_id,
            bill_code_id: item.bill_code_id,
            adjustment_case_id: item.adjustment_case_id,
            adjustment_case_code_id: item.adjustment_case_code_id,
            date: item.date,
            stock_in_id: item.stock_in_id,
            price: Number(item.price), // include value in the fetch
          });
        });
      case IStockOutFetch.BY_REFERENCE:
        if (!data || !Array.isArray(data)) {
          throw new Error(
            "Invalid data provided for fetching by reference IDs."
          );
        }

        const stockOut2 = await prisma.stock_out.findMany({
          where: {
            OR: data.map((item) => {
              return {
                item_id: item.item_id,
                adjustment_case_code_id: item.adjustment_case_code_id,
                adjustment_case_id: item.adjustment_case_id,
                bill_id: item.bill_id,
                bill_code_id: item.bill_code_id,
              };
            }),
          },
          select: {
            stock_in_id: true,
            quantity: true,
            id: true,
            adjustment_case_id: true,
            adjustment_case_code_id: true,
            bill_id: true,
            bill_code_id: true,
            price: true,
            date: true,
          },
        });

        return stockOut2.map((item) => {
          return new StockOutModel({
            id: item.id,
            item_id: 0, // item_id is not fetched in this case
            quantity: Number(item.quantity),
            bill_id: item.bill_id,
            bill_code_id: item.bill_code_id,
            adjustment_case_id: item.adjustment_case_id,
            adjustment_case_code_id: item.adjustment_case_code_id,
            date: item.date, // default date as it's not fetched
            stock_in_id: item.stock_in_id || null,
            price: Number(item.price),
          });
        });
      default:
        throw new Error("Invalid fetch method specified.");
    }
  }

  static delete(method: IStockOutDelete, data?: any) {
    switch (method) {
      case IStockOutDelete.BY_STOCK_IN_IDS:
        if (!data || !Array.isArray(data)) {
          throw new Error(
            "Invalid data provided for deleting by stock_in IDs."
          );
        }
        return prisma.stock_out.updateMany({
          where: {
            stock_in_id: {
              in: data,
            },
          },
          data: {
            stock_in_id: null,
          },
        });
      case IStockOutDelete.BY_REFERENCE_IDS:
        if (!data || !Array.isArray(data)) {
          throw new Error(
            "Invalid data provided for deleting by reference IDs."
          );
        }
        return prisma.stock_out.deleteMany({
          where: {
            OR: data.map((item) => {
              return {
                adjustment_case_code_id: item.adjustment_case_code_id,
                adjustment_case_id: item.adjustment_case_id,
                bill_id: item.bill_id,
                bill_code_id: item.bill_code_id,
              };
            }),
          },
        });
      case IStockOutDelete.BY_ID:
        if (!data || typeof data !== "number") {
          throw new Error("Invalid ID provided for deletion.");
        }
        return prisma.stock_out.delete({
          where: {
            id: data,
          },
        });
      default:
        throw new Error("Invalid delete method specified.");
    }
  }
}
