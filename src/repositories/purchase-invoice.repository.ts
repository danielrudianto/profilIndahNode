import { PrismaClient } from "@prisma/client";
import { IPurchaseInvoice } from "../model/purchase-invoice.model";

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
  }
}
