import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import {
  IProductPurchasePrice,
  ProductPurchasePriceModel,
} from "../model/product-purchase-price.model";

export class ProductPurchasePriceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  create(data: IProductPurchasePrice) {}

  createMany(data: IProductPurchasePrice[]) {
    return Promise.all([
      ...data.map((x) => {
        return this.prisma.item_price_purchase.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
          },
          data: {
            is_delete: true,
            deleted_at: x.created_at,
            deleted_by: x.created_by,
          },
        });
      }),
      this.prisma.item_price_purchase.createMany({
        data: data.map((x) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_by: x.created_by!,
            created_at: x.created_at,
          };
        }),
      }),
    ]);
  }

  update(data: IProductPurchasePrice) {
    return Promise.all([
      this.prisma.item_price_purchase.updateMany({
        where: {
          item_id: data.item_id,
          item_unit_id: data.item_unit_id,
        },
        data: {
          is_delete: true,
          deleted_at: data.created_at,
          deleted_by: data.created_by,
        },
      }),
      this.prisma.item_price_purchase.create({
        data: {
          item_id: data.item_id,
          item_unit_id: data.item_unit_id,
          price: data.price,
          discount: data.discount,
          is_delete: false,
          created_by: data.created_by!,
          created_at: data.created_at,
        },
      }),
    ]);
  }

  async fetch(data: IFetchCommon) {}

  async fetchByID(itemID: number, itemUnitID: number | null) {
    try {
      const result = await this.prisma.item_price_purchase.findFirst({
        where: {
          item_id: itemID,
          item_unit_id: itemUnitID,
          is_delete: false,
        },
      });

      if (!result) {
        return null;
      }

      return ProductPurchasePriceModel.fromMap(result);
    } catch (error) {
      console.error(
        `[error]: Error while fetching item purchase price by ID: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByItemID(itemID: number) {
    try {
      const results = await this.prisma.item_price_purchase.findMany({
        where: {
          item_id: itemID,
          is_delete: false,
        },
        include: {
          item_unit: true,
        },
      });

      if (!results || results.length === 0) {
        return [];
      }

      return results.map((result) => ProductPurchasePriceModel.fromMap(result));
    } catch (error) {
      console.error(
        `[error]: Error while fetching item purchase prices by item ID: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByItemIDs(
    data: { item_id: number; item_unit_id: number | null }[]
  ) {
    try {
      const result = await this.prisma.$transaction([
        ...data.map((x) => {
          return this.prisma.item_price_purchase.findFirst({
            where: {
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
              is_delete: false,
            },
          });
        }),
      ]);

      if (!result || result.length === 0) {
        return [];
      }

      return result.map((item) => {
        if (!item) {
          return null;
        }
        return ProductPurchasePriceModel.fromMap(item);
      });
    } catch (error) {
      console.error(
        `[error]: Error while fetching item purchase prices by item IDs: ${error}`
      );
      throw new Error("Internal server error");
    }
  }
}
