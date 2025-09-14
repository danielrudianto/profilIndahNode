import { Prisma, PrismaClient } from "@prisma/client";
import { DateHelper, formatDate } from "../helper/date.helper";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import PromotionModel, { IPromotion } from "../model/promotion.model";

export class PromotionRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IPromotion) {
    try {
      const result = await this.prisma.promotion_code.create({
        data: {
          name: data.name,
          description: data.description,
          start: data.startDate,
          end: data.endDate,
          created_by: data.created_by,
          created_at: new Date(),
          supplier_id: data.supplier_id,
          promotion_rules: {
            createMany: {
              data: data.promotion_rules!.map((d) => {
                return {
                  rule: d.rule,
                  value: d.value,
                };
              }),
            },
          },
          promotion_brand: {
            createMany: {
              data: data.promotion_brand!.map((d) => {
                return {
                  product_brand_id: d.product_brand_id,
                };
              }),
            },
          },
          target: data.target,
        },
      });

      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating promotion: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async update(data: IPromotion) {
    try {
      const result = await this.prisma.promotion_code.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          start: data.startDate,
          end: data.endDate,
          supplier_id: data.supplier_id,
          target: data.target,
          promotion_rules: {
            deleteMany: {},
            createMany: {
              data: data.promotion_rules!.map((d) => ({
                rule: d.rule,
                value: d.value,
              })),
            },
          },
          promotion_brand: {
            deleteMany: {},
            createMany: {
              data: data.promotion_brand!.map((d) => ({
                product_brand_id: d.product_brand_id,
              })),
            },
          },
        },
      });
      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while updating promotion: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<PromotionModel>> {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.promotion_code.findMany({
          where: {
            name: {
              contains: data.keyword,
            },
            description: {
              contains: data.keyword,
            },
          },
          orderBy: { created_at: "desc" },
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          include: {
            promotion_rules: true,
            promotion_brand: {
              include: {
                product_brand: true,
              },
            },
            supplier: true,
          },
        }),
        this.prisma.promotion_code.count({
          where: {
            name: {
              contains: data.keyword,
            },
            description: {
              contains: data.keyword,
            },
          },
        }),
      ]);

      return {
        data: result.map((item) => PromotionModel.fromMap(item)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error while fetching promotions: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number): Promise<PromotionModel | null> {
    try {
      const result = await this.prisma.promotion_code.findUnique({
        where: { id: id },
        include: {
          promotion_rules: true,
          promotion_brand: {
            include: {
              product_brand: true,
            },
          },
          promotion_code_created_by: {
            include: {
              user_avatar: true,
            },
          },
          promotion_code_deleted_by: {
            include: {
              user_avatar: true,
            },
          },
          promotion_code_updated_by: {
            include: {
              user_avatar: true,
            },
          },
          supplier: true,
        },
      });

      if (!result) return null;

      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while fetching promotion by ID: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchResult(
    productID: number[],
    supplierID: number,
    startDate: Date,
    endDate: Date | null
  ) {
    let salesDateFilter = "";
    let purchaseDateFilter = "";
    if (endDate == null) {
      salesDateFilter = `AND sales_invoice_code.date >= "${DateHelper.convertDate(
        startDate,
        formatDate.YYYYMMDD
      )}"`;

      purchaseDateFilter = `AND good_receipt_code.date >= "${DateHelper.convertDate(
        startDate,
        formatDate.YYYYMMDD
      )}"`;
    } else {
      salesDateFilter = `AND sales_invoice_code.date BETWEEN "${DateHelper.convertDate(
        startDate,
        formatDate.YYYYMMDD
      )}" AND "${DateHelper.convertDate(endDate, formatDate.YYYYMMDD)}"`;

      purchaseDateFilter = `AND good_receipt_code.date BETWEEN "${DateHelper.convertDate(
        startDate,
        formatDate.YYYYMMDD
      )}" AND "${DateHelper.convertDate(endDate, formatDate.YYYYMMDD)}"`;
    }

    const [sales, purchase] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        ${salesDateFilter}
        AND sales_invoice.product_id IN (${productID.join(",")})
      `),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt_code.is_delete = 0
        ${purchaseDateFilter}
        AND good_receipt_code.supplier_id = ${supplierID}
        AND good_receipt.product_id IN (${productID.join(",")})
      `),
    ]);

    const salesNumber =
      sales == undefined || sales == null ? 0 : Number(sales[0].value);
    const purchaseNumber =
      purchase == undefined || purchase == null ? 0 : Number(purchase[0].value);

    return {
      sales: salesNumber,
      purchase: purchaseNumber,
    };
  }

  async fetchSalesResult(
    productID: number[],
    startDate: Date,
    endDate: Date | null
  ) {
    const result = await this.prisma.sales_invoice.findMany({
      where: {
        product_id: {
          in: productID,
        },
        AND: [
          {
            sales_invoice_code: {
              date: {
                gte: startDate,
              },
            },
          },
          {
            sales_invoice_code: {
              date: {
                lte: endDate == null ? new Date() : endDate,
              },
            },
          },
          {
            sales_invoice_code: {
              is_delete: false,
            },
          },
        ],
      },
      include: {
        sales_invoice_code: {
          select: {
            name: true,
            date: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        product_unit: {
          select: {
            conversion: true,
          },
        },
        product: {
          select: {
            reference: true,
            unit: true,
          },
        },
      },
      orderBy: {
        sales_invoice_code: {
          date: "asc",
        },
      },
    });

    return result.map((x) => {
      return {
        id: x.id,
        date: x.sales_invoice_code.date,
        name: x.sales_invoice_code.name,
        customer:
          x.sales_invoice_code.customer == null
            ? "Retail"
            : x.sales_invoice_code.customer.name,
        reference: x.product!.reference,
        quantity:
          Number(x.quantity) *
          (x.product_unit == null ? 1 : Number(x.product_unit.conversion)),
        price: x.price,
        discount: x.discount,
        unit: x.product!.unit,
      };
    });
  }

  async fetchPurchaseReport(
    productID: number[],
    supplierID: number,
    startDate: Date,
    endDate: Date | null
  ) {
    const result = await this.prisma.good_receipt.findMany({
      where: {
        product_id: {
          in: productID,
        },
        AND: [
          {
            good_receipt_code: {
              date: {
                gte: startDate,
              },
            },
          },
          {
            good_receipt_code: {
              date: {
                lte: endDate == null ? new Date() : endDate,
              },
            },
          },
          {
            good_receipt_code: {
              is_delete: false,
            },
          },
          {
            good_receipt_code: {
              supplier_id: supplierID,
            },
          },
        ],
      },
      include: {
        good_receipt_code: {
          select: {
            name: true,
            date: true,
            supplier: {
              select: {
                name: true,
              },
            },
          },
        },
        product_unit: {
          select: {
            conversion: true,
          },
        },
        product: {
          select: {
            reference: true,
            unit: true,
          },
        },
      },
      orderBy: {
        good_receipt_code: {
          date: "asc",
        },
      },
    });

    return result.map((x) => {
      return {
        id: x.id,
        date: x.good_receipt_code.date,
        name: x.good_receipt_code.name,
        supplier: x.good_receipt_code.supplier.name,
        reference: x.product!.reference,
        quantity:
          Number(x.quantity) *
          (x.product_unit == null ? 1 : Number(x.product_unit.conversion)),
        price: x.price,
        discount: x.discount,
        unit: x.product!.unit,
      };
    });
  }

  async countActive(): Promise<number> {
    try {
      const result = await this.prisma.promotion_code.count({
        where: {
          is_delete: false,
          OR: [
            {
              end: null,
            },
            {
              end: {
                gt: new Date(),
              },
            },
          ],
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }
}
