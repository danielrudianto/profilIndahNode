import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import DepositModel, { IDepositCode } from "../model/deposit.model";

export class DepositRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IDepositCode) {
    try {
      const result = await this.prisma.deposit_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          date: data.date,
          created_by: data.created_by!,
          created_at: data.created_at!,
          is_delete: false,
          deleted_at: null,
          deleted_by: null,
          deposit: {
            createMany: {
              data: data.deposit.map((x) => {
                return {
                  item_id: x.item_id,
                  item_unit_id: x.item_unit_id,
                  quantity: x.quantity,
                  package_code_id: x.package_code_id || null,
                  price: x.price,
                  discount: x.discount,
                };
              }),
            },
          },
        },
        include: {
          deposit: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return DepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating deposit: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByProductID(productID: number[]): Promise<number[]> {
    try {
      // fetch the sums
      const deposits = await this.prisma.deposit.groupBy({
        by: ["item_id"],
        _sum: {
          quantity: true,
        },
        where: {
          item_id: {
            in: productID,
          },
          is_delete: false,
        },
      });

      const response: {
        item_id: number;
        quantity: number;
      }[] = [];

      for (let i = 0; i < productID.length; i++) {
        const itemID = productID[i];
        const deposit = deposits.find((d) => d.item_id === itemID);
        response.push({
          item_id: itemID,
          quantity: deposit ? Number(deposit) : 0,
        });
      }

      return response.map((d) => {
        return d.quantity;
      });
    } catch (error) {
      console.error(`[error]: Error on fetching deposits ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<DepositModel>> {
    try {
      const result = await this.prisma.deposit.findMany({
        where: {
          is_delete: false,
        },
        include: {
          product: true,
          product_unit: true,
        },
        skip: data.pageSize,
        take: (data.page - 1) * data.pageSize,
        orderBy: {
          id: "desc",
        },
      });

      const totalCount = await this.prisma.deposit.count({
        where: {
          is_delete: false,
        },
      });

      return {
        data: result.map((x) => DepositModel.fromMap(x)),
        count: totalCount,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching deposits ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.deposit.findFirst({
        where: {
          id: id,
          is_delete: false,
        },
        include: {
          product: true,
          product_unit: true,
        },
      });

      if (!result) {
        return null;
      }

      return DepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on fetching deposit by ID ${error}`);
      throw new Error("Internal server error");
    }
  }
}
