import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 } from "uuid";
import {
  ICreateDraftBill,
  IConfirmDraftBill,
  IFetchDraftBillOTC,
} from "../interfaces/draft-bill.interface";

/**
 * Akses data draft bill.
 *
 * Kueri di bawah ini dipindahkan apa adanya dari method statis
 * DraftBillModel, yang memegang prisma sendiri di tingkat modul. Dengan
 * dipindah ke sini, seluruh akses data lewat satu jalur yang sama seperti
 * repository lain, dan controller-nya bisa memakai injeksi dependensi.
 */
export class DraftBillRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create(data: ICreateDraftBill) {
    return this.prisma.draft_bill_code.create({
      data: {
        otc: data.otc,
        name: data.name,
        delivery: data.delivery,
        service: data.service,
        note: data.note,
        created_at: new Date(),
        created_by: data.created_by,
        customer_id: data.customer_id,
        confirmed_at: null,
        confirmed_by: null,
        draft_bill: {
          createMany: {
            data: data.items.map((x) => {
              return {
                product_id: x.item_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
                product_unit_id: x.item_unit_id,
              };
            }),
          },
        },
      },
      select: {
        id: true,
        note: true,
        name: true,
        created_at: true,
        user_draft_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            npwp: true,
            phone_number: true,
            id: true,
          },
        },
        delivery: true,
        service: true,
        draft_bill: {
          select: {
            product: true,
            product_unit: true,
            quantity: true,
            price: true,
            discount: true,
          },
        },
      },
    });
  }

  fetchByID(id: number) {
    return this.prisma.draft_bill_code.findUnique({
      where: {
        id: id,
      },
      include: {
        user_draft_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            phone_number: true,
            pic: true,
          },
        },
        draft_bill: {
          include: {
            product: true,
            product_unit: true,
          },
        },
      },
    });
  }

  fetchByName(name: string) {
    return this.prisma.draft_bill_code.findFirstOrThrow({
      where: {
        name: name,
      },
      include: {
        draft_bill: {
          include: {
            product: true,
            product_unit: true,
          },
        },
      },
    });
  }

  fetchByOTC(data: IFetchDraftBillOTC) {
    return this.prisma.draft_bill_code.findFirst({
      where: {
        otc: data.otc,
        AND: {
          created_at: {
            gte: new Date(moment(data.date).format("YYYY-MM-DD")),
            lt: new Date(moment(data.date).add(1, "days").format("YYYY-MM-DD")),
          },
        },
        is_delete: false,
      },
      include: {
        draft_bill: {
          include: {
            product: true,
            product_unit: true,
          },
        },
        user_draft_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  confirm(data: IConfirmDraftBill) {
    return this.prisma.$transaction([
      this.prisma.draft_bill_code.update({
        where: {
          id: data.id,
        },
        data: {
          is_delete: true,
          confirmed_at: new Date(),
          confirmed_by: data.userID,
          delivery: data.delivery,
          service: data.service,
        },
      }),
      this.prisma.sales_invoice_code.create({
        data: {
          name: data.name,
          date: new Date(moment(data.date).format("YYYY-MM-DD")),
          customer_id: data.customer_id,
          service: data.service,
          delivery: data.delivery,
          discount: data.discount,
          uuid: v4(),
          created_at: new Date(),
          created_by: data.userID,
          is_confirm: true,
          confirmed_at: new Date(),
          confirmed_by: data.userID,
          sales_invoice: {
            createMany: {
              data: data.items.map((x) => {
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
          sales_invoice_payment: {
            createMany: {
              data: data.payment_methods.map((x) => {
                return {
                  payment_method_id: x.payment_method_id,
                  value: x.amount,
                  date: new Date(),
                };
              }),
            },
          },
        },
        include: {
          sales_invoice: {
            include: {
              product_unit: {
                select: {
                  unit: true,
                  conversion: true,
                },
              },
              product: {
                select: {
                  id: true,
                  reference: true,
                  description: true,
                  unit: true,
                  product_type: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                  product_brand: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                },
              },
            },
          },
          customer: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);
  }

  deleteByID(id: number, userID: number) {
    return this.prisma.draft_bill_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: userID,
      },
    });
  }

  fetchArchiveYears(mode: number) {
    switch (mode) {
      case 0:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 1:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 1
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 2:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 0
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  fetchArchiveMonths(year: number, mode: number) {
    switch (mode) {
      case 0:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 1:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 1
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 2:
        return this.prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 0
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  fetchArchive(year: number, month: number, page: number, mode: number) {
    switch (mode) {
      case 0:
        return this.prisma.$transaction([
          this.prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          this.prisma.$queryRaw<any[]>`
            SELECT COUNT(id) AS count FROM draft_bill_code
            WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          `,
        ]);
      case 1:
        return this.prisma.$transaction([
          this.prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 1
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          this.prisma.$queryRaw<any[]>`
            SELECT COUNT(id) AS count FROM draft_bill_code
            WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 1
          `,
        ]);
      case 2:
        return this.prisma.$transaction([
          this.prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 0
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          this.prisma.$queryRaw<any[]>`
            SELECT COUNT(id) AS count FROM draft_bill_code
            WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 0
          `,
        ]);
    }
  }
}
