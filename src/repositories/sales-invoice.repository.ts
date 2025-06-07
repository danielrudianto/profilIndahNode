import { PrismaClient } from "@prisma/client";
import { ISalesInvoiceCode, SalesInvoiceModel } from "../model/bill_code.model";

export class SalesInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesInvoiceCode): Promise<SalesInvoiceModel> {
    try {
      const result = await this.prisma.bill_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          created_by: data.createdBy,
          created_at: data.createdAt,
          customer_id: data.customerID,
          discount: data.discount,
          delivery: data.delivery,
          service: data.service,
          date: data.date,
          is_confirm: data.is_confirm,
          confirmed_by: data.confirmed_by,
          confirmed_at: data.confirmed_at,
          bill: {
            createMany: {
              data: data.bill!,
            },
          },
          bill_payment: {
            createMany: {
              data: data.bill_payment!.map((x) => {
                return {
                  date: x.date,
                  value: x.value,
                  payment_method_id:
                    x.payment_method_id == 0 ? null : x.payment_method_id,
                };
              }),
            },
          },
          payment_term: data.payment_term,
          is_paid: data.is_paid,
          sales: data.sales,
        },
      });

      return SalesInvoiceModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  generateName(date: Date): string {
    return `INV-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  }
}
