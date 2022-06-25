import { PrismaClient, PrismaPromise } from "@prisma/client";

const prisma = new PrismaClient();

class ItemPurchasePriceModel {
  id?: number;
  price: number;
  item_id: number;
  created_by: number;
  created_at: Date;

  constructor(price: number, item_id: number, created_by: number) {
    this.item_id = item_id;
    this.price = price;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.item_price_purchase.create({
      data: {
        price: this.price,
        created_by: this.created_by,
        created_at: this.created_at,
        item_id: this.item_id,
      },
      select: {
        price: true,
        is_delete: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static insertItems(item_price: any[]) {
    const transactions: PrismaPromise<any>[] = [];
    item_price.forEach((x) => {
      const item_id = x.item_id;
      transactions.push(
        prisma.item_price_purchase.updateMany({
          where: {
            item_id: item_id,
          },
          data: {
            deleted_at: new Date(),
            is_delete: true,
          },
        })
      );
    });

    transactions.push(
      prisma.item_price_purchase.createMany({
        data: item_price,
      })
    );

    return transactions;
  }

  static getByItemId(id: number) {
    return prisma.item_price_purchase.findFirst({
      where: {
        item_id: id,
        is_delete: false,
      },
    });
  }

  static fetch(keyword: string, offset: number, limit: number) {
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
            item_price_purchase: {
              select: {
                price: true,
              },
              where: {
                is_delete: false,
              },
              orderBy: {
                id: "desc",
              },
              take: 1,
              skip: 0,
            },
          },
          orderBy: {
            reference: "asc",
          },
          skip: offset,
          take: limit,
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
            item_price_purchase: {
              select: {
                price: true,
              },
              where: {
                is_delete: false,
              },
              orderBy: {
                id: "desc",
              },
              take: 1,
              skip: 0,
            },
          },
          orderBy: {
            reference: "asc",
          },
          skip: offset,
          take: limit,
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

  static fetchAll() {
    return prisma.item.findMany({
      where: {
        is_delete: false,
      },
      select: {
        reference: true,
        description: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_price_purchase: {
          select: {
            price: true,
          },
          where: {
            is_delete: false,
          },
          take: 1,
          skip: 0,
        },
      },
      orderBy: {
        reference: "asc",
      },
    });
  }

  static fetchByReference(reference: string) {
    return prisma.item.findFirst({
      where: {
        reference: reference,
        is_delete: false,
      },
      select: {
        id: true,
        description: true,
        reference: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_price_purchase: {
          select: {
            price: true,
          },
          where: {
            is_delete: false,
          },
          orderBy: {
            id: "desc",
          },
          take: 1,
          skip: 0,
        },
      },
    });
  }

  static deleteItems(item_ids: number[], created_by: number) {
    return prisma.item_price_purchase.updateMany({
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

export default ItemPurchasePriceModel;
