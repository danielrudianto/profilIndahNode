import { PrismaClient } from "@prisma/client";
import {
  IOverpaymentCode,
  OverpaymentCodeModel,
} from "../model/overpayment.model";

export class OverpaymentRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IOverpaymentCode) {
    try {
      const result = await this.prisma.overpayment_code.create({
        data: {
          date: data.date,
          sales_deposit_code_id: data.sales_deposit_code_id,
          customer_id: data.customer_id,
          return_date: data.return_date,
          return_payment_method: data.return_payment_method,
          return_payment_number: data.return_payment_number,
          created_by: data.created_by,
          created_at: data.created_at,
          overpayment: {
            createMany: {
              data: data.overpayment!.map((x) => {
                return {
                  value: x.value,
                  payment_method_id: x.payment_method_id,
                };
              }),
            },
          },
        },
        include: {
          overpayment: {
            include: {
              payment_method: true,
            },
          },
        },
      });

      return OverpaymentCodeModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async createMany(data: IOverpaymentCode[]) {}
}
