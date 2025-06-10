import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import PurchaseInvoiceModel, {
  IPurchaseInvoice,
} from "../model/purchase-invoice.model";

export class PurchaseInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IPurchaseInvoice) {
    const result = await this.prisma.purchase_invoice.create({
      data: {
        name: data.name,
        created_by: data.created_by,
        created_at: data.created_at,
        date: data.date,
        good_receipt_code_id: data.good_receipt_code_id!,
      },
    });

    return PurchaseInvoiceModel.fromMap(result);
  }

  async update(data: IPurchaseInvoice) {
    const result = await this.prisma.purchase_invoice.update({
      where: { id: data.id },
      data: {
        name: data.name,
        confirmed_by: data.created_by,
        confirmed_at: data.created_at,
        date: data.date,
      },
    });

    return PurchaseInvoiceModel.fromMap(result);
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.purchase_invoice.update({
        where: { id },
        data: {
          is_delete: true,
          good_receipt_code: {
            update: {
              is_delete: true,
            },
          },
        },
      });

      return PurchaseInvoiceModel.fromMap(result);
    } catch (error) {
      console.error("Error deleting purchase invoice:", error);
      throw new Error("Failed to delete purchase invoice");
    }
  }

  async fetchUnconfirmed(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<PurchaseInvoiceModel>> {
    try {
      const [result, count] = await Promise.all([
        this.prisma.purchase_invoice.findMany({
          where: {
            AND: [
              {
                is_confirm: false,
              },
              {
                is_delete: false,
              },
            ],
          },
          select: {
            id: true,
            date: true,
            name: true,
            faktur: true,
            created_at: true,
            user_purchase_invoice_created_byTouser: {
              select: {
                name: true,
                user_avatar: true,
              },
            },
            good_receipt_code: {
              select: {
                name: true,
                date: true,
                supplier: {
                  select: {
                    name: true,
                    address: true,
                  },
                },
              },
            },
          },
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
        }),
        this.prisma.purchase_invoice.count({
          where: {
            is_confirm: false,
            is_delete: false,
          },
        }),
      ]);

      return {
        data: result.map((item) => PurchaseInvoiceModel.fromMap(item)),
        count: count,
      };
    } catch (error) {
      console.error("Error fetching unconfirmed purchase invoices:", error);
      throw new Error("Failed to fetch unconfirmed purchase invoices");
    }
  }

  async fetchByID(id: number): Promise<PurchaseInvoiceModel | null> {
    try {
      const result = await this.prisma.purchase_invoice.findUnique({
        where: { id },
        include: {
          good_receipt_code: {
            include: {
              good_receipt: {
                include: {
                  item: true,
                  item_unit: true,
                },
              },
              user_good_receipt_code_created_byTouser: true,
              user_good_receipt_code_confirmed_byTouser: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return PurchaseInvoiceModel.fromMap(result);
    } catch (error) {
      console.error("Error fetching purchase invoice by ID:", error);
      throw new Error("Failed to fetch purchase invoice");
    }
  }
}
