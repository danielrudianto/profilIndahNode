import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ItemPriceModel {
  id?: number;
  price: number;
  discount: number;
  item_id: number;
  item_unit_id: number | null;
  created_by: number;
  created_at: Date;
  effective_date: Date;

  constructor(
    price: number,
    discount: number,
    item_id: number,
    item_unit_id: number | null,
    created_by: number,
    effective_date: Date | null = null
  ) {
    this.price = price;
    this.discount = discount;
    this.item_id = item_id;
    this.item_unit_id = item_unit_id;
    this.created_by = created_by;
    this.created_at = new Date();
    this.effective_date = effective_date == null ? new Date() : effective_date;
  }

  create() {
    return prisma.item_price.create({
      data: {
        item_id: this.item_id,
        item_unit_id: this.item_unit_id,
        price: this.price,
        discount: this.discount,
        created_by: this.created_by,
        created_at: this.created_at,
        effective_date: this.effective_date,
      },
      select: {
        price: true,
        discount: true,
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
            unit: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price: {
              select: {
                id: true,
                price: true,
                discount: true,
                created_at: true,
                effective_date: true,
                item_unit: {
                  select: {
                    id: true,
                    unit: true,
                    conversion: true,
                  },
                },
              },
              where: {
                is_delete: false,
                effective_date: {
                  lte: date,
                },
              },
              orderBy: [
                {
                  item_unit_id: "asc",
                },
                {
                  item_unit: {
                    unit: "asc",
                  },
                },
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
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
              {
                item_brand: {
                  name: {
                    contains: keyword,
                  },
                },
              },
              {
                item_type: {
                  name: {
                    contains: keyword,
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            reference: true,
            description: true,
            unit: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price: {
              select: {
                id: true,
                price: true,
                discount: true,
                created_at: true,
                effective_date: true,
                item_unit: {
                  select: {
                    id: true,
                    unit: true,
                    conversion: true,
                  },
                },
              },
              where: {
                is_delete: false,
                effective_date: {
                  lte: date,
                },
              },
              orderBy: [
                {
                  item_unit_id: "asc",
                },
                {
                  item_unit: {
                    unit: "asc",
                  },
                },
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
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
              {
                item_brand: {
                  name: {
                    contains: keyword,
                  },
                },
              },
              {
                item_type: {
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
            id: true,
            price: true,
            discount: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
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

  static updatePrice(
    item_id: number,
    price: number,
    discount: number,
    created_by: number,
    item_unit_id: number | null = null,
    effective_date: Date = new Date()
  ) {
    return prisma.$transaction([
      prisma.item_price.updateMany({
        where: {
          item_id: item_id,
          item_unit_id: item_unit_id,
          is_delete: false,
        },
        data: {
          is_delete: true,
          deleted_at: new Date(),
          deleted_by: created_by,
        },
      }),
      prisma.item_price.create({
        data: {
          item_id: item_id,
          item_unit_id: item_unit_id,
          price: price,
          discount: discount,
          created_by: created_by,
          created_at: new Date(),
          effective_date: effective_date,
        },
      }),
    ]);
  }

  static fetchById(id: number) {
    return prisma.item_price.findUnique({
      where: {
        id: id,
      },
      select: {
        price: true,
        discount: true,
        item_unit: {
          select: {
            id: true,
            unit: true,
            conversion: true,
          },
        },
        item: {
          select: {
            id: true,
            reference: true,
            description: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            unit: true,
          },
        },
        is_delete: true,
        effective_date: true,
      },
    });
  }

  static updateMany(item_price: any[], deleted_by: number) {
    const transactions: any[] = [];
    item_price.forEach((x) => {
      transactions.push(
        prisma.item_price.updateMany({
          where: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            is_delete: false,
          },
          data: {
            is_delete: true,
            deleted_at: new Date(),
            deleted_by: deleted_by,
          },
        })
      );

      transactions.push(
        prisma.item_price.create({
          data: {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_at: new Date(),
            created_by: deleted_by,
            effective_date: new Date(),
          },
        })
      );
    });

    return prisma.$transaction(transactions);
  }

  static delete(
    item_id: number,
    item_unit_id: number | null = null,
    created_by: number
  ) {
    return prisma.item_price.updateMany({
      where: {
        item_id: item_id,
        item_unit_id: item_unit_id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
        deleted_at: new Date(),
      },
    });
  }
}

export default ItemPriceModel;
