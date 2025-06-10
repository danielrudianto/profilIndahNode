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
          is_confirm: data.isConfirm,
          confirmed_by: data.confirmedBy,
          confirmed_at: data.confirmedAt,
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
          payment_term: data.paymentTerm,
          is_paid: data.isPaid,
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

  async checkSalesReturn(
    data: { quantity: number; bill_id: number }[]
  ): Promise<boolean> {
    try {
      const result = await this.prisma.bill.findMany({
        where: {
          id: {
            in: data.map((x) => x.bill_id),
          },
        },
        select: {
          id: true,
          quantity: true,
        },
      });

      for (let billData of data) {
        // if the bill is not found, return false
        const bill = result.find((x) => x.id === billData.bill_id);
        if (!bill) {
          return false;
        }

        // if the quantity is less than the bill quantity, return false
        if (billData.quantity < Number(bill.quantity)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[error]: Error on checking sales return ${error}`);
      throw new Error("Internal server error");
    }
  }
}
