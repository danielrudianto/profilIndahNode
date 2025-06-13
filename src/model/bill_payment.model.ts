import { prisma } from "../helper/database.helper";
import { PaymentMethodViewModel } from "./payment-method.model";

export interface IBillPayment {
  id?: number;
  bill_code_id: number;
  payment_method_id: number | null;
  value: number;
  date: Date;

  payment_method?: PaymentMethodViewModel; // Optional field to include payment method details

  // to update the bill code status
  is_paid?: boolean;
}

export class BillPaymentModel {
  id?: number;
  bill_code_id: number;
  payment_method_id: number | null;
  value: number;
  date: Date;
  is_paid?: boolean;

  payment_method?: PaymentMethodViewModel; // Optional field to include payment method details

  constructor(data: IBillPayment) {
    this.id = data.id;
    this.bill_code_id = data.bill_code_id;
    this.payment_method_id = data.payment_method_id;
    this.value = data.value;
    this.date = data.date;
    this.is_paid = data.is_paid;
    this.payment_method = PaymentMethodViewModel.fromMap(data.payment_method);
  }

  async create(): Promise<BillPaymentModel> {
    this.validateCreate();

    try {
      const [result, _] = await prisma.$transaction([
        prisma.bill_payment.create({
          data: {
            bill_code_id: this.bill_code_id,
            payment_method_id: this.payment_method_id,
            value: this.value,
            date: this.date,
          },
        }),
        prisma.bill_code.update({
          where: {
            id: this.bill_code_id,
          },
          data: {
            is_paid: this.is_paid,
          },
        }),
      ]);

      return new BillPaymentModel({
        id: result.id,
        bill_code_id: result.bill_code_id,
        payment_method_id: result.payment_method_id,
        value: Number(result.value),
        date: result.date,
        is_paid: this.is_paid,
      });
    } catch (error) {
      console.error(`[error]: Error on creating bill payment ${error}`);
      throw error;
    }
  }

  private validateCreate() {
    if (!this.bill_code_id) {
      throw new Error("Bill code ID is required");
    }
    if (this.value <= 0) {
      throw new Error("Payment value must be greater than zero");
    }
    if (!this.date) {
      throw new Error("Payment date is required");
    }
    if (this.is_paid === undefined) {
      throw new Error("Payment status is required");
    }
  }

  static async fetchByID(id: number): Promise<BillPaymentModel> {
    const bill_payment = await prisma.bill_payment.findUnique({
      where: {
        id: id,
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

    if (!bill_payment) {
      throw new Error(`Bill payment with ID ${id} not found`);
    }

    return new BillPaymentModel({
      id: bill_payment.id,
      bill_code_id: bill_payment.bill_code_id,
      payment_method_id: bill_payment.payment_method_id,
      value: Number(bill_payment.value),
      date: bill_payment.date,
    });
  }

  static async fetchByBillCodeID(id: number): Promise<BillPaymentModel[]> {
    try {
      const result = await prisma.bill_payment.findMany({
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

      if (!result) {
        return [];
      }

      return result.map((payment) => {
        return new BillPaymentModel({
          id: payment.id,
          bill_code_id: payment.bill_code_id,
          payment_method_id: payment.payment_method_id,
          value: Number(payment.value),
          date: payment.date,
        });
      });
    } catch (error) {
      console.error(
        `[error]: Error fetching bill payments by bill code ID ${error}`
      );
      throw error;
    }
  }

  delete() {
    return prisma.bill_payment.delete({
      where: {
        id: this.id,
      },
    });
  }
}
