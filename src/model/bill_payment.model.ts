import { prisma } from "../app";

export interface IBillPayment {
  bill_code_id: number;
  payment_method_id: number | null;
  value: number;
  date: Date;
  is_paid: boolean;
}

class BillPaymentModel {
  static fetchByBillCodeID(id: number) {
    return prisma.bill_payment.findMany({
      where: {
        bill_code_id: id,
      },
      orderBy: {
        date: "desc",
      },
      include: {
        payment_method: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    });
  }

  static create(data: IBillPayment) {
    return prisma.$transaction([
      prisma.bill_payment.create({
        data: {
          bill_code_id: data.bill_code_id,
          payment_method_id: data.payment_method_id,
          value: data.value,
          date: data.date,
        },
      }),
      prisma.bill_code.update({
        where: {
          id: data.bill_code_id,
        },
        data: {
          is_paid: data.is_paid,
        },
      }),
    ]);
  }

  /**
   * Delete payment of sales invoice by ID
   */
  static deleteByID(id: number) {
    return prisma.bill_payment.delete({
      where: {
        id: id,
      },
    });
  }
}

export default BillPaymentModel;
