import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export enum ItemUnitMode {
  Sales,
  Plain,
}

export interface IProductUnit {
  id?: number;
  product_id: number;
  unit: string;
  conversion: number;
  is_delete?: boolean;
  created_by?: number;
  created_at?: Date;
  sales_price: number;
  sales_discount: number;
  purchase_price: number;
  purchase_discount: number;
}

export class ProductUnitModel {
  id?: number;
  product_id?: number;
  unit: string;
  conversion: number;
  is_delete?: boolean;
  created_by?: number;
  created_at?: Date;
  sales_price: number;
  sales_discount: number;
  purchase_price: number;
  purchase_discount: number;

  constructor(data: IProductUnit) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.unit = data.unit;
    this.conversion = data.conversion;
    this.is_delete = data.is_delete;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.sales_discount = data.sales_discount;
    this.sales_price = data.sales_price;
    this.purchase_price = data.purchase_price;
    this.purchase_discount = data.purchase_discount;
  }

  static fromMap(data: any): ProductUnitModel {
    return new ProductUnitModel({
      id: data.id,
      product_id: data.product_id,
      unit: data.unit,
      conversion: Number(data.conversion),
      is_delete: data.is_delete,
      created_by: data.created_by,
      created_at: data.created_at,
      sales_price: Number(data.sales_price),
      sales_discount: Number(data.sales_discount),
      purchase_price: Number(data.purchase_price),
      purchase_discount: Number(data.purchase_discount),
    });
  }
}

interface IProductUnitView {
  id?: number;
  product_id: number;
  unit: string;
  conversion: number;
  sales_price?: number;
  sales_discount?: number;
  purchase_price?: number;
  purchase_discount?: number;
}

export class ProductUnitViewModel {
  id?: number;
  product_id: number;
  unit: string;
  conversion: number;
  sales_price?: number;
  sales_discount?: number;
  purchase_price?: number;
  purchase_discount?: number;

  constructor(data: IProductUnitView) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.unit = data.unit;
    this.conversion = data.conversion;
    this.sales_price = data.sales_price;
    this.sales_discount = data.sales_discount;
    this.purchase_price = data.purchase_price;
    this.purchase_discount = data.purchase_discount;
  }

  static fromMap(data: any): ProductUnitViewModel {
    return {
      id: data.id,
      product_id: data.product_id,
      unit: data.unit,
      conversion: Number(data.conversion),
      sales_price:
        data.sales_price == undefined ? undefined : Number(data.sales_price),
      sales_discount:
        data.sales_discount == undefined
          ? undefined
          : Number(data.sales_discount),
      purchase_price:
        data.purchase_price == undefined
          ? undefined
          : Number(data.purchase_price),
      purchase_discount:
        data.purchase_discount == undefined
          ? undefined
          : Number(data.purchase_discount),
    };
  }
}
