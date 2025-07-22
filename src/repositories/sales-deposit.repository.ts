import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import {
  ISalesDepositCode,
  SalesDepositModel,
} from "../model/sales-deposit.model";

export class SalesDepositRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesDepositCode) {
    try {
      const result = await this.prisma.deposit_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          date: data.date,
          created_by: data.createdBy!,
          created_at: data.createdAt!,
          is_delete: false,
          deleted_at: null,
          deleted_by: null,
          type: data.type,
          deposit: {
            createMany: {
              data: data.deposit.map((x) => {
                return {
                  product_id: x.product_id,
                  product_unit_id: x.product_unit_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                };
              }),
            },
          },
          deposit_payment: {
            createMany: {
              data: data.deposit_payment.map((x) => {
                return {
                  payment_method_id: x.payment_method_id,
                  value: x.value,
                  date: x.date,
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

      return SalesDepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating deposit: ${error}`);
      throw new Error("Internal server error");
    }
  }

  generateName(date: Date = new Date()) {
    return `DPS-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  }

  async fetchByProductID(productID: number[]): Promise<number[]> {
    try {
      // fetch the sums
      const deposits = await this.prisma.deposit.groupBy({
        by: ["product_id"],
        _sum: {
          quantity: true,
        },
        where: {
          product_id: {
            in: productID,
          },
          is_delete: false,
        },
      });

      const response: {
        product_id: number;
        quantity: number;
      }[] = [];

      for (let i = 0; i < productID.length; i++) {
        const product = productID[i];
        const deposit = deposits.find((d) => d.product_id === product);
        response.push({
          product_id: product,
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

  async fetch(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<SalesDepositModel>> {
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
        data: result.map((x) => SalesDepositModel.fromMap(x)),
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

      return SalesDepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on fetching deposit by ID ${error}`);
      throw new Error("Internal server error");
    }
  }
}
