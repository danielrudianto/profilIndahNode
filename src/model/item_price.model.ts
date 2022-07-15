import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ItemPriceModel {
  id?: number;
  price: number;
  discount: number;
  discount_project: number;
  item_id: number;
  created_by: number;
  created_at: Date;
  effective_date: Date;

  constructor(
    price: number,
    discount: number,
    discount_project: number,
    item_id: number,
    created_by: number,
    effective_date: Date | null = null
  ) {
    this.price = price;
    this.discount = discount;
    this.discount_project = discount_project;
    this.item_id = item_id;
    this.created_by = created_by;
    this.created_at = new Date();
    this.effective_date = effective_date == null ? new Date() : effective_date;
  }

  create() {
    return prisma.item_price.create({
      data: {
        item_id: this.item_id,
        price: this.price,
        discount: this.discount,
        discount_project: this.discount_project,
        created_by: this.created_by,
        created_at: this.created_at,
        effective_date: this.effective_date,
      },
      select: {
        price: true,
        discount: true,
        discount_project: true,
        is_delete: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        item: {
          select: {
            reference: true,
          },
        },
      },
    });
  }

  static fetch(keyword: string, date: Date, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.item.findMany({
          where: {
            is_delete: false,
          },
          select: {
            id: true,
            reference: true,
            description: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price: {
              select: {
                price: true,
                discount: true,
                discount_project: true,
                created_at: true,
                effective_date: true,
              },
              where: {
                is_delete: false,
                effective_date: {
                  lte: date,
                },
              },
              orderBy: [
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
              take: 1,
              skip: 0,
            },
          },
          orderBy: {
            reference: "asc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.item.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item.findMany({
          where: {
            is_delete: false,
            OR: [
              {
                reference: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
            ],
          },
          select: {
            id: true,
            reference: true,
            description: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price: {
              select: {
                price: true,
                discount: true,
                discount_project: true,
                created_at: true,
              },
              where: {
                is_delete: false,
                effective_date: {
                  lte: date,
                },
              },
              orderBy: [
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
              take: 1,
              skip: 0,
            },
          },
          orderBy: {
            reference: "asc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.item.count({
          where: {
            is_delete: false,
            OR: [
              {
                reference: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  static fetchByReference(reference: string, date: Date) {
    return prisma.item.findFirst({
      where: {
        reference: reference,
        is_delete: false,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
        item_price: {
          select: {
            price: true,
            discount: true,
            discount_project: true,
          },
          where: {
            is_delete: false,
            effective_date: {
              lte: date,
            },
          },
          orderBy: [
            {
              effective_date: "desc",
            },
            {
              id: "desc",
            },
          ],
        },
      },
    });
  }

  static deleteById(item_id: number, created_by: number) {
    return prisma.item_price.updateMany({
      where: {
        item_id: item_id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
    });
  }

  static deleteByIds(item_ids: number[], created_by: number) {
    return prisma.item_price.updateMany({
      where: {
        item_id: {
          in: item_ids,
        },
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
    });
  }
}

export default ItemPriceModel;
