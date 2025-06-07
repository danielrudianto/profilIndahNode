import { PrismaClient } from "@prisma/client";
import GoodReceiptModel, { IGoodReceipt } from "../model/good_receipt.model";

export class GoodReceiptRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IGoodReceipt) {
    try {
      const checkExisting = await this.prisma.good_receipt_code.count({
        where: {
          uuid: data.uuid,
        },
      });

      if (checkExisting > 0) {
        throw new Error("Good receipt code with this UUID already exists.");
      } else {
        const result = await this.prisma.good_receipt_code.create({
          data: {
            uuid: data.uuid,
            name: data.name,
            created_by: data.created_by!,
            created_at: data.created_at,
            date: data.date,
            supplier_id: data.supplier_id,
            company_id: data.company_id,
            good_receipt: {
              createMany: {
                data: data.good_receipt!.map((item) => {
                  return {
                    quantity: item.quantity,
                    price: item.price,
                    discount: item.discount,
                    item_id: item.item_id,
                    item_unit_id: item.item_unit_id,
                  };
                }),
              },
            },
          },
        });

        return GoodReceiptModel.fromMap(result);
      }
    } catch (error) {
      throw error;
    }
  }
}
