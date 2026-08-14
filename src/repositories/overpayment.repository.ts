import { PrismaClient } from "@prisma/client";
import { OverpaymentCodeModel } from "../models/overpayment.model";
import { IOverpaymentCode } from "../interfaces/overpayment.interface";

export class OverpaymentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IOverpaymentCode) {
    const result = await this.prisma.overpayment.create({
      data: {
        date: data.date,
        sales_deposit_code_id: data.sales_deposit_code_id,
        customer_id: data.customer_id,
        return_payment_date: data.return_payment_date,
        return_payment_method: data.return_payment_method,
        return_payment_number: data.return_payment_number,
        return_payment_bank: data.return_payment_bank,
        return_payment_name: data.return_payment_name,
        created_by: data.created_by,
        created_at: data.created_at,
        value: data.value,
      },
      include: {
        customer: true,
      },
    });

    return OverpaymentCodeModel.fromMap(result);
  }

  async createMany(data: IOverpaymentCode[]) {
    const insertQuery = data.map((x) => {
      return this.prisma.overpayment.create({
        data: {
          date: x.date,
          sales_deposit_code_id: x.sales_deposit_code_id,
          customer_id: x.customer_id,
          return_payment_date: x.return_payment_date,
          return_payment_method: x.return_payment_method,
          return_payment_number: x.return_payment_number,
          return_payment_bank: x.return_payment_bank,
          return_payment_name: x.return_payment_name,
          created_by: x.created_by,
          created_at: x.created_at,
          value: x.value,
        },
      });
    });

    await this.prisma.$transaction(insertQuery);
  }

  async fetch(data: {
    page: number;
    pageSize: number;
    sortBy: String;
    sortDirection: string;
  }) {
    let orderBy: any = {};

    switch (data.sortBy) {
      case "date":
        orderBy = {
          date: data.sortDirection,
        };
        break;
      case "value":
        orderBy = {
          value: data.sortDirection,
        };
        break;
      case "return":
        orderBy = {
          return_payment_date: data.sortDirection,
        };
        break;
    }

    const [result, count] = await this.prisma.$transaction([
      this.prisma.overpayment.findMany({
        include: {
          customer: true,
          user_overpayment_created_byTouser: {
            include: {
              user_avatar: true,
            },
          },
        },
        orderBy: orderBy,
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
      }),
      this.prisma.overpayment.count({}),
    ]);

    return {
      data: result.map((x) => {
        return OverpaymentCodeModel.fromMap(x);
      }),
      count: count,
    };
  }

  async fetchReportByDate(date: Date) {
    const result = await this.prisma.overpayment.findMany({
      where: {
        return_payment_date: date,
      },
    });

    return result.map((x) => {
      return OverpaymentCodeModel.fromMap(x);
    });
  }

  async fetchReportByReceiveDate(date: Date): Promise<
    {
      payment_method_id: number | null;
      value: number;
    }[]
  > {
    const result = await this.prisma.overpayment.groupBy({
      by: ["payment_method_id"],
      _sum: {
        value: true,
      },
      where: {
        date: date,
      },
    });

    return result.map((x) => {
      return {
        payment_method_id: x.payment_method_id,
        value: Number(x._sum.value),
      };
    });
  }

  async fetchReportByReturnDate(date: Date): Promise<
    {
      payment_method_id: number | null;
      value: number;
    }[]
  > {
    const result = await this.prisma.overpayment.groupBy({
      by: ["payment_method_id"],
      _sum: {
        value: true,
      },
      where: {
        return_payment_date: date,
      },
    });

    return result.map((x) => {
      return {
        payment_method_id: x.payment_method_id,
        value: Number(x._sum.value),
      };
    });
  }

  async fetchByID(id: number) {
    const result = await this.prisma.overpayment.findUnique({
      where: {
        id: id,
      },
      include: {
        customer: true,
        user_overpayment_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        payment_method: true,
      },
    });

    if (!result) {
      return null;
    }

    return OverpaymentCodeModel.fromMap(result);
  }
}
