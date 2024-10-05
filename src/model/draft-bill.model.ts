import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 } from "uuid";
import { fetchMode } from "../interface/fetch.interface";
import { IConfirmSalesInvoice } from "../interface/archive.interface";

const prisma = new PrismaClient();

interface ICreateDraftBill {
  customer_id: number;
  created_by: number;
  note: string;
  name: string;
  service: number;
  delivery: number;
  items: ICreateDraftBillItems[];
  otc: string;
}

interface ICreateDraftBillItems {
  item_id: number;
  quantity: number;
  price: number;
  discount: number;
  item_unit_id: number;
}

interface IFetchDraftBill {
  id: number;
  name: string;
  created_at: string;
  created_by: string;
  customer_name: string;
  total: number;
  is_delete: number;
}

interface IConfirmDraftBill {
  id: number;
  name: string;
  date: Date;
  customer_id: number | null;
  payment_methods: IConfirmDraftBillPaymentMethods[];
  service: number;
  delivery: number;
  discount: number;
  items: IConfirmDraftBillItems[];
  userID: number;
}

interface IConfirmDraftBillPaymentMethods {
  payment_method_id: number;
  amount: number;
}

export interface IConfirmDraftBillItems {
  item_id: number;
  item_unit_id: number | null;
  quantity: number;
  discount: number;
  price: number;
}

export interface IFetchDraftBillOTC {
  otc: string;
  date: string;
}

export class DraftBillModel {
  /**
   * Create draft bill
   * @param data
   * @returns
   */
  static create(data: ICreateDraftBill) {
    return prisma.draft_bill_code.create({
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
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_type: {
                  select: {
                    name: true,
                  },
                },
                item_brand: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            item_unit: {
              select: {
                conversion: true,
                unit: true,
              },
            },
            quantity: true,
            price: true,
            discount: true,
          },
        },
      },
    });
  }

  static fetchByID(id: number) {
    return prisma.draft_bill_code.findUnique({
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
          select: {
            id: true,
            price: true,
            discount: true,
            quantity: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
      },
    });
  }

  static fetchByName(name: string) {
    return prisma.draft_bill_code.findFirstOrThrow({
      where: {
        name: name,
      },
      include: {
        draft_bill: {
          include: {
            item: true,
            item_unit: true,
          },
        },
      },
    });
  }

  static fetchByOTC(data: IFetchDraftBillOTC) {
    return prisma.draft_bill_code.findFirst({
      where: {
        otc: data.otc,
        AND: {
          created_at: {
            gte: new Date(moment(data.date).format("YYYY-MM-DD")),
            lt: new Date(moment(data.date).add(1, "days").format("YYYY-MM-DD")),
          },
        },
      },
      include: {
        draft_bill: {
          include: {
            item: true,
            item_unit: true,
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

  static confirmInvoice(data: IConfirmSalesInvoice) {
    return prisma.draft_bill_code.update({
      where: {
        id: data.id,
      },
      data: {
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: data.confirm_by,
      },
      include: {
        draft_bill: true,
      },
    });
  }

  /**
   * Fetch draft bill
   * @param keyword
   * @param limit
   * @param offset
   * @param mode
   * @returns {Promise<IFetchDraftBill[]>}
   */
  static fetch(
    keyword: string,
    limit: number,
    offset: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.Unconfirmed) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<IFetchDraftBill[]>(`
        SELECT draft_bill_code.id, draft_bill_code.name, 
        draft_bill_code.created_at, user.name as created_by, 
        customer.name as customer_name, total.total,
        draft_bill_code.is_delete
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.is_delete = 0
        AND draft_bill_code.name LIKE '%${keyword}%'
        OR customer.name LIKE '%${keyword}%'
        ORDER BY draft_bill_code.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
        prisma.draft_bill_code.count({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                customer: {
                  name: {
                    contains: keyword,
                  },
                },
              },
            ],
          },
        }),
      ]);
    } else if (mode == fetchMode.Pagination) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<IFetchDraftBill[]>(`
        SELECT draft_bill_code.id, draft_bill_code.name, 
        draft_bill_code.created_at, user.name as created_by, 
        customer.name as customer_name, total.total,
        draft_bill_code.is_delete
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.name LIKE '%${keyword}%'
        OR customer.name LIKE '%${keyword}%'
        ORDER BY draft_bill_code.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
        prisma.draft_bill_code.count({
          where: {
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                customer: {
                  name: {
                    contains: keyword,
                  },
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  /**
   * Confirm draft bill and convert it to bill
   * @param data
   * @returns
   */
  static confirm(data: IConfirmDraftBill) {
    return prisma.$transaction([
      prisma.draft_bill_code.update({
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
      prisma.bill_code.create({
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

          bill: {
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
          bill_payment: {
            createMany: {
              data: data.payment_methods.map((x) => {
                return {
                  payment_method_id: x.payment_method_id,
                  amount: x.amount,
                  date: new Date(),
                };
              }),
            },
          },
        },
        include: {
          bill: {
            include: {
              package_code: {
                include: {
                  package_content: {
                    select: {
                      quantity: true,
                      item_id: true,
                      item_unit: {
                        select: {
                          unit: true,
                          conversion: true,
                        },
                      },
                      item: {
                        select: {
                          reference: true,
                          description: true,
                          unit: true,
                        },
                      },
                      price: true,
                      discount: true,
                    },
                  },
                },
              },
              item_unit: {
                select: {
                  unit: true,
                  conversion: true,
                },
              },
              item: {
                select: {
                  id: true,
                  reference: true,
                  description: true,
                  unit: true,
                  item_type: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                  item_brand: {
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

  /**
   * Delete draft bill by ID
   * @param id
   * @param userID
   * @returns
   */
  static deleteByID(id: number, userID: number) {
    return prisma.draft_bill_code.update({
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

  /**
   * Fetch archive years and count
   * @param mode
   * @returns
   */
  static fetchArchiveYears(mode: number) {
    switch (mode) {
      case 0:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 1:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 1
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 2:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 0
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  /**
   * Fetch archive months and count by year
   * @param year
   * @param mode
   * @returns
   */
  static fetchArchiveMonths(year: number, mode: number) {
    switch (mode) {
      case 0:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 1:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 1
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
      case 2:
        return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 0
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  /**
   * Fetch archive by year and month and page
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns
   */
  static fetchArchive(year: number, month: number, page: number, mode: number) {
    switch (mode) {
      case 0:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<any[]>`
            SELECT COUNT(id) AS count FROM draft_bill_code
            WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          `,
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 1
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<any[]>`
            SELECT COUNT(id) AS count FROM draft_bill_code
            WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 1
          `,
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
          SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
          FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
            month + 1
          }
          AND draft_bill_code.is_delete = 0
          ORDER BY draft_bill_code.created_at ASC
          LIMIT 10
          OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<any[]>`
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
