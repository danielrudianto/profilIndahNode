import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";

const prisma = new PrismaClient();

export class DraftBillModel {
  customer_id: number;
  created_by: number;
  note: string;
  items: any[];

  constructor(
    customer_id: number,
    note: string,
    items: any[],
    created_by: number
  ) {
    this.created_by = created_by;
    this.customer_id = customer_id;
    this.items = items;
    this.note = note;
  }

  create() {
    return prisma.draft_bill_code.create({
      data: {
        note: this.note,
        created_at: new Date(),
        created_by: this.created_by,
        customer_id: this.customer_id,
        draft_bill: {
          createMany: {
            data: this.items.map((x) => {
              return {
                item_id: x.item_id,
                quantity: x.quantity,
                price: x.price,
                discount: 0,
                item_unit_id: x.item_unit_id,
              };
            }),
          },
        },
      },
    });
  }

  static order(
    id: number,
    name: string,
    discount: number,
    delivery: number,
    service: number,
    customer_id: number | null,
    payment_method_id: number | null,
    items: any[],
    date: Date,
    createdBy: number
  ) {
    return Promise.all([
      prisma.draft_bill_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          confirmed_at: new Date(),
          confirmed_by: createdBy,
        },
      }),
      prisma.bill_code.create({
        data: {
          created_by: createdBy,
          created_at: new Date(),
          date: date,
          name: name,
          uuid: v4(),
          discount: discount,
          delivery: delivery,
          service: service,
          customer_id: customer_id,
          payment_method_id: payment_method_id,
          bill: {
            createMany: {
              data: items.map((x) => {
                return {
                  item_id: x.item_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                  item_unit_id: x.item_unit_id,
                };
              }),
            },
          },
        },
      }),
    ]);
  }

  static fetchByID(id: number) {
    return prisma.draft_bill_code.findUnique({
      where: {
        id: id,
      },
      include: {
        draft_bill: {
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
          },
        },
      },
    });
  }

  static truncateData() {
    return prisma.$queryRawUnsafe(
      "TRUNCATE TABLE draft_bill_code RESTART IDENTITY"
    );
  }
}
