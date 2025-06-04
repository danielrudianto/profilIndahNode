import { PrismaClient } from "@prisma/client";
import ItemTypeModel from "./item_type.model";
import { ItemBrandModel } from "./brand.model";
import { ProductUnitModel } from "./product-unit.model";
const prisma = new PrismaClient();

interface ICreateProduct {
  id?: number;
  reference: string;
  description: string;
  brand_id: number;
  type_id: number;
  created_by?: number;
  minimum_stock?: number;
  unit: string;
  price?: number;
  discount?: number;
  purchase_price?: number;
  purchase_discount?: number;

  item_type?: ItemTypeModel;
  item_brand?: ItemBrandModel;
}

export interface ICreateProductUnit {
  unit: string;
  conversion: number;
  price: number;
  discount: number;
  price_purchase: number;
  discount_purchase: number;
}

export interface IFetchProduct {
  id: number;
  reference: string;
  description: string;
  is_delete: number;
  item_brand_id: number;
  item_type_id: number;
  unit: string;
  item_type_name: string;
  item_brand_name: string;
  is_active: number;
}

export interface IFetchProductSimple extends IFetchProduct {
  stock: number;
  minimum_stock: string;
  can_delete: string;
}

export interface IFetchProductComplete extends IFetchProduct {}

interface IUpdateProduct {
  id: number;
  reference: string;
  description: string;
  brand_id: number;
  type_id: number;
  updated_by: number;
  minimum_stock: string;
  unit: string;
}

interface IProductOutputReport {
  id: number;
  reference: string;
  description: string;
  item_brand_name: string;
  item_type_name: string;
  unit: string;
  item_brand_id: number;
  item_type_id: number;
  goodReceiptQuantity: number;
  adjustmentQuantityPlus: number;
  adjustmentQuantityMinus: number;
  billQuantity: number;
  salesReturnQuantity: number;
}

export class ProductModel {
  id?: number;
  reference: string;
  description: string;
  item_brand_id: number;
  item_type_id: number;
  created_by?: number;
  created_at?: Date;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  is_active?: boolean = true;
  is_delete?: boolean = false;
  minimum_stock?: number;
  unit: string;
  item_brand?: ItemBrandModel;
  item_type?: ItemTypeModel;
  price?: number;
  discount?: number;
  purchase_price?: number;
  purchase_discount?: number;
  item_unit?: ProductUnitModel[] = [];

  constructor(data: ICreateProduct) {
    this.id = data.id;
    this.reference = data.reference;
    this.description = data.description;
    this.item_brand_id = data.brand_id;
    this.item_type_id = data.type_id;
    this.created_by = data.created_by;
    this.created_at = new Date();
    this.updated_by = 0; // default to 0
    this.updated_at = new Date();
    this.is_active = true;
    this.is_delete = false;
    this.minimum_stock = data.minimum_stock || 0;
    this.unit = data.unit;
    this.item_brand = data.item_brand;
    this.item_type = data.item_type;
    this.price = data.price;
    this.discount = data.discount;
    this.purchase_price = data.purchase_price;
    this.purchase_discount = data.purchase_discount;
  }

  create() {
    this.validateCreate();

    return prisma.item.create({
      data: {
        reference: this.reference,
        description: this.description,
        item_brand_id: this.item_brand_id,
        item_type_id: this.item_type_id,
        created_by: this.created_by!,
        created_at: new Date(),
        minimum_stock: this.minimum_stock,
        item_price: {
          create: {
            price: this.price!,
            discount: this.discount!,
            created_at: new Date(),
            effective_date: new Date(),
            created_by: this.created_by!,
          },
        },
        item_price_purchase: {
          create: {
            price: this.purchase_price!,
            discount: this.purchase_discount!,
            created_at: new Date(),
            created_by: this.created_by!,
          },
        },
        unit: this.unit,
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
        item_type_id: true,
        item_type: {
          select: {
            name: true,
          },
        },
        item_brand_id: true,
        created_by: true,
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
        minimum_stock: true,
        is_active: true,
        item_price: {
          select: {
            price: true,
            discount: true,
            effective_date: true,
            created_by: true,
            created_at: true,
          },
        },
        item_price_purchase: {
          select: {
            price: true,
            created_by: true,
            created_at: true,
          },
        },
      },
    });
  }

  private validateCreate() {
    if (!this.reference || this.reference.length === 0) {
      throw new Error("Reference is required");
    }
    if (!this.description || this.description.length === 0) {
      throw new Error("Description is required");
    }
    if (!this.item_brand_id) {
      throw new Error("Brand ID is required");
    }
    if (!this.item_type_id) {
      throw new Error("Type ID is required");
    }
    if (!this.unit || this.unit.length === 0) {
      throw new Error("Unit is required");
    }
  }

  static createUnits(
    itemID: number,
    userID: number,
    data: ICreateProductUnit[]
  ) {
    return prisma.$transaction(
      data.map((unit) => {
        return prisma.item_unit.create({
          data: {
            item_id: itemID,
            unit: unit.unit,
            conversion: unit.conversion,
            created_by: userID,
            created_at: new Date(),
            item_price: {
              create: {
                price: unit.price,
                discount: unit.discount,
                created_at: new Date(),
                effective_date: new Date(),
                created_by: userID,
                item_id: itemID,
              },
            },
            item_price_purchase: {
              create: {
                price: unit.price_purchase,
                discount: unit.discount_purchase,
                created_at: new Date(),
                created_by: userID,
                item_id: itemID,
              },
            },
          },
        });
      })
    );
  }

  /**
   *
   * @param id
   * @param reference
   * @param description
   * @param brand_id
   * @param type_id
   * @param updated_by
   * @param minimum_stock
   * @param unit
   * @returns
   */
  static update(data: IUpdateProduct) {
    return prisma.item.update({
      where: {
        id: data.id,
      },
      data: {
        reference: data.reference,
        description: data.description,
        item_brand_id: data.brand_id,
        item_type_id: data.type_id,
        updated_by: data.updated_by,
        updated_at: new Date(),
        minimum_stock: data.minimum_stock,
        unit: data.unit,
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
        item_brand_id: true,
        item_type: {
          select: {
            name: true,
          },
        },
        item_type_id: true,
        minimum_stock: true,
        user_item_updated_byTouser: {
          select: {
            name: true,
          },
        },
        updated_by: true,
        is_active: true,
      },
    });
  }

  /**
   * Fetch item by ID
   * @param id
   * @returns IFetchProduct
   */
  static async fetchByID(id: number) {
    return prisma.$queryRaw<
      IFetchProductSimple[]
    >`SELECT item.id, item.reference, item.description, 
    item.is_delete, item.item_brand_id, item.item_type_id, 
    item.unit, item.minimum_stock, item_type.name AS item_type_name, 
    item_brand.name AS item_brand_name, 
    IF(COALESCE(b.count, 0) = 0 AND COALESCE(c.count, 0) = 0 AND COALESCE(d.count, 0) = 0, "1", "0") AS can_delete,
    item.is_active
    FROM item
    JOIN item_brand ON item.item_brand_id = item_brand.id
    JOIN item_type ON item.item_type_id = item_type.id
    LEFT JOIN (
		SELECT COUNT(bill.id) AS count, bill.item_id
        FROM bill
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill.item_id = ${id}
        AND bill_code.is_delete = 0
        GROUP BY bill.item_id) AS b
        ON item.id = b.item_id
    LEFT JOIN (
		SELECT COUNT(adjustment_case.id) AS count, adjustment_case.item_id
        FROM adjustment_case
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case.item_id = ${id}
        AND adjustment_case_code.is_delete = 0
        GROUP BY adjustment_case.item_id) AS c
        ON item.id = c.item_id
    LEFT JOIN (
		SELECT COUNT(good_receipt.id) AS count, good_receipt.item_id
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt.item_id = ${id}
        AND good_receipt_code.is_delete = 0
		GROUP BY good_receipt.item_id
        ) AS d
        ON item.id = d.item_id
	LEFT JOIN (
		SELECT COUNT(bill.id) AS count, bill.item_id
        FROM bill
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        JOIN package_code ON bill.package_code_id = package_code.id
        JOIN package_content ON package_code.id = package_content.package_code_id
        WHERE package_content.item_id = ${id}
        AND bill_code.is_delete = 0
        GROUP BY bill.item_id) AS e
        ON item.id = e.item_id
        WHERE item.id = ${id}
`;
  }

  static fetchMetaByID(id: number) {
    return prisma.$transaction([
      prisma.item.findUnique({
        where: {
          id: id,
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
          item_type: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.deposit.findMany({
        where: {
          item_id: id,
          deposit_code: {
            is_delete: false,
          },
        },
        select: {
          quantity: true,
          item_unit: {
            select: {
              conversion: true,
            },
          },
        },
      }),
    ]);
  }

  /**
   * Fetch autocomplete
   * @param keyword
   */
  static fetchAutocomplete(keyword: string) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT item.id, item.reference AS name
      FROM item
      WHERE item.is_active = 1
      AND item.is_delete = 0
      AND (item.reference LIKE '%${keyword}%'
      OR item.description LIKE '%${keyword}%')
      ORDER BY item.reference ASC
      LIMIT 5
    `);
  }

  /**
   * Fetch item by ID with price
   * @param id
   * @returns
   */
  static async fetchByIDWithPrice(id: number) {
    return prisma.$transaction([
      prisma.item.findUnique({
        where: {
          id: id,
        },
        select: {
          reference: true,
          description: true,
          unit: true,
          item_brand: {
            select: {
              name: true,
            },
          },
          item_type: {
            select: {
              name: true,
            },
          },
          minimum_stock: true,
        },
      }),
      prisma.item_unit.findMany({
        where: {
          item_id: id,
          is_delete: false,
        },
      }),
      prisma.item_price.findMany({
        where: {
          item_id: id,
          is_delete: false,
        },
      }),
      prisma.item_price_purchase.findMany({
        where: {
          item_id: id,
          is_delete: false,
        },
      }),
    ]);
  }

  /**
   * Fetch item by IDs
   * @param id
   * @returns
   */
  static fetchByIDs(id: number[]) {
    return id.length == 0
      ? new Promise<IFetchProductSimple[]>((resolve, _) => {
          resolve([]);
        })
      : prisma.$queryRawUnsafe<IFetchProductSimple[]>(`
      SELECT item.id, item.reference, item.description, 
      item.is_delete, item.item_brand_id, item.item_type_id, 
      item.unit, item.minimum_stock, item_type.name AS item_type_name, 
      item_brand.name AS item_brand_name, 
      IF(COALESCE(item_count.count, 0) = 0, "1", "0") AS can_delete, 
      item.is_active
      FROM item
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN (
        SELECT SUM(count) AS count, item_id
        FROM (
          SELECT COUNT(bill.id) AS count, bill.item_id
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_delete = 0
          AND bill.item_id IN (${id.join(",")})
          UNION ALL (
            SELECT COUNT(adjustment_case.id) AS count, adjustment_case.item_id
            FROM adjustment_case
            JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
            WHERE adjustment_case_code.is_delete = 0
            AND adjustment_case.item_id IN (${id.join(",")})
          )
          UNION ALL (
            SELECT COUNT(good_receipt.id) AS count, good_receipt.item_id
            FROM good_receipt
            JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
            WHERE good_receipt_code.is_delete = 0
            AND good_receipt.item_id IN (${id.join(",")})
          )
        ) a
        GROUP BY a.item_id
      ) item_count
      ON item_count.item_id = item.id
      WHERE item.id IN (${id.join(",")})            
    `);
  }

  static fetchByReference(reference: string) {
    return prisma.item.findFirst({
      where: {
        reference: reference,
        is_delete: false,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        item_brand: {
          select: {
            name: true,
          },
        },
        item_type: {
          select: {
            name: true,
          },
        },
        item_unit: {
          select: {
            unit: true,
            id: true,
            conversion: true,
          },
          where: {
            is_delete: false,
          },
        },
        _count: {
          select: {
            bill: true,
            good_receipt: true,
            adjustment_case: true,
          },
        },
      },
    });
  }

  static fetchByReferences(references: string[]) {
    return prisma.item.findMany({
      where: {
        reference: {
          in: references,
        },
        is_delete: false,
      },
      select: {
        id: true,
        reference: true,
      },
    });
  }

  static fetchSearch(keyword: string, offset: number, limit: number) {
    if (keyword.length == 0) {
      return prisma.$transaction([
        prisma.item.findMany({
          select: {
            id: true,
          },
          where: {
            is_active: true,
            is_delete: false,
          },
          take: limit,
          skip: offset,
          orderBy: {
            reference: "asc",
          },
        }),
        prisma.item.count({
          where: {
            is_delete: false,
            is_active: true,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item.findMany({
          where: {
            is_delete: false,
            is_active: true,
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
          take: limit,
          skip: offset,
          orderBy: {
            reference: "asc",
          },
        }),
        prisma.item.count({
          where: {
            is_delete: false,
            is_active: true,
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

  static fetch(keyword: string, offset: number, limit: number, type: number) {
    // Type 1 is for purchase
    // Type 2 is for sales
    // Type 3 is for plain
    // Type 4 is for return

    switch (type) {
      case 1:
        return prisma.$transaction([
          prisma.item.findMany({
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
              item_unit: {
                select: {
                  unit: true,
                  conversion: true,
                  id: true,
                  item_price_purchase: {
                    select: {
                      price: true,
                      discount: true,
                    },
                    where: {
                      is_delete: false,
                    },
                    take: 1,
                  },
                },
              },
              item_price_purchase: {
                select: {
                  id: true,
                  price: true,
                  discount: true,
                },
                where: {
                  item_unit_id: null,
                  is_delete: false,
                },
                take: 1,
              },
            },
            where: {
              is_delete: false,
              is_active: true,
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
            orderBy: {
              reference: "asc",
            },
            take: limit,
            skip: offset,
          }),
          prisma.item.count({
            where: {
              is_delete: false,
              is_active: true,
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
      case 2:
        if (keyword == "") {
          return prisma.$transaction([
            prisma.$queryRaw<any[]>`
              SELECT item_price.id, item_price.price, item_price.discount, item_price.item_id, item_unit_id, item_unit.unit, item_unit.conversion
              FROM item_price
              LEFT JOIN item_unit ON item_price.item_unit_id = item_unit.id
              JOIN (
                SELECT item.id
                FROM item
                WHERE item.is_delete = 0
                AND item.is_active = 1
                ORDER BY reference ASC
                LIMIT ${limit}
                OFFSET	${offset}
              ) item_count
              ON item_price.item_id = item_count.id
              WHERE item_price.is_delete = 0
              GROUP BY item_id, item_unit_id
            `,
            prisma.$queryRaw<any[]>`
              SELECT item.id, item.reference, item.description, 
              item.unit, item_brand.name AS brand
              FROM item
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              ORDER BY item.reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            `,
            prisma.item.count({
              where: {
                is_delete: false,
                is_active: true,
              },
            }),
          ]);
        } else {
          return prisma.$transaction([
            prisma.$queryRawUnsafe<any[]>(`
              SELECT item_price.id, item_price.price, item_price.discount, item_price.item_id, item_unit_id, item_unit.unit, item_unit.conversion
              FROM item_price
              LEFT JOIN item_unit ON item_price.item_unit_id = item_unit.id
              JOIN (
                SELECT item.id
                FROM item
                WHERE item.is_delete = 0
                AND item.is_active = 1
                AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
                ORDER BY reference ASC
                LIMIT ${limit}
                OFFSET	${offset}
              ) item_count
              ON item_price.item_id = item_count.id
              WHERE item_price.is_delete = 0
              GROUP BY item_id, item_unit_id
            `),
            prisma.$queryRawUnsafe<any[]>(`
              SELECT item.id, item.reference, item.description, 
              item.unit, item_brand.name AS brand
              FROM item
              JOIN item_brand ON item.item_brand_id = item_brand.id
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (item.reference LIKE '%${keyword}%' OR item.description LIKE '%${keyword}%')
              ORDER BY item.reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            `),
            prisma.item.count({
              where: {
                is_delete: false,
                is_active: true,
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
      case 4:
        if (keyword == "") {
          return prisma.$transaction([
            prisma.$queryRaw<any[]>`
              SELECT item_unit.item_id, item_unit.id, 
              item_unit.unit, item_unit.conversion
              FROM item_unit
              JOIN (
                SELECT item.id
                FROM item
                WHERE item.is_delete = 0
                ORDER BY reference ASC
                LIMIT ${limit}
                OFFSET	${offset}
              ) item_count
              ON item_unit.item_id = item_count.id
              WHERE item_unit.is_delete = 0
            `,
            prisma.$queryRaw`
              SELECT item.id, item.reference, 
              item.description, item.minimum_stock, 
              item.unit, item_type.name AS item_type_name, 
              item_brand.name AS item_brand_name, item.item_type_id, item.item_brand_id, item.is_active
              FROM item
              JOIN item_brand ON item.item_brand_id = item_brand.id
              JOIN item_type ON item.item_type_id = item_type.id
              WHERE item.is_delete = 0
              ORDER BY reference ASC
              LIMIT ${limit} OFFSET ${offset}
            `,
            prisma.item.count({
              where: {
                is_delete: false,
              },
            }),
          ]);
        } else {
          return prisma.$transaction([
            prisma.$queryRawUnsafe<any[]>(`
              SELECT item_unit.item_id, item_unit.id, item_unit.unit, item_unit.conversion
              FROM item_unit
              JOIN (
                SELECT item.id
                FROM item
                WHERE item.is_delete = 0
                AND (
                  item.reference LIKE '%${keyword}%'
                  OR item.description LIKE '%${keyword}%'
                )
                ORDER BY reference ASC
                LIMIT ${limit}
                OFFSET	${offset}
              ) item_count
              ON item_unit.item_id = item_count.id
              WHERE item_unit.is_delete = 0
            `),
            prisma.$queryRawUnsafe(`
              SELECT item.id, item.reference, item.description, item.minimum_stock, item.unit, item_type.name AS item_type_name, item_brand.name AS item_brand_name, item.item_type_id, item.item_brand_id, item.is_active
              FROM item
              JOIN item_brand ON item.item_brand_id = item_brand.id
              JOIN item_type ON item.item_type_id = item_type.id
              WHERE item.is_delete = 0
              AND (
                item.reference LIKE '%${keyword}%'
                OR item.description LIKE '%${keyword}%'
              )
              ORDER BY reference ASC
              LIMIT ${limit} OFFSET ${offset}
            `),
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
        break;
      case 3:
      default:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<any[]>(`
            SELECT item_unit.item_id, item_unit.id, item_unit.unit, 
            item_unit.conversion
            FROM item_unit
            JOIN (
              SELECT item.id
              FROM item
              WHERE item.is_delete = 0
              AND item.is_active = 1
              AND (
                item.reference LIKE '%${keyword}%'
                OR item.description LIKE '%${keyword}%'
              )
              ORDER BY reference ASC
              LIMIT ${limit}
              OFFSET	${offset}
            ) item_count
            ON item_unit.item_id = item_count.id
            WHERE item_unit.is_delete = 0
          `),
          prisma.$queryRawUnsafe(`
            SELECT item.id, item.reference, item.description, 
            item.minimum_stock, item.unit, 
            item_type.name AS item_type_name, 
            item_brand.name AS item_brand_name, 
            item.item_type_id, item.item_brand_id, 
            item.is_active
            FROM item
            JOIN item_brand ON item.item_brand_id = item_brand.id
            JOIN item_type ON item.item_type_id = item_type.id
            WHERE item.is_delete = 0
            AND item.is_active = 1
            AND (
              item.reference LIKE '%${keyword}%'
              OR item.description LIKE '%${keyword}%'
            )
            ORDER BY reference ASC
            LIMIT ${limit} OFFSET ${offset}
          `),
          prisma.item.count({
            where: {
              is_delete: false,
              is_active: true,
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

  static delete(id: number, deleted_by: number) {
    return prisma.item.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: deleted_by,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
        reference: true,
        description: true,
        deleted_by: true,
        deleted_at: true,
        user_item_deleted_byTouser: {
          select: {
            name: true,
          },
        },
        item_brand_id: true,
      },
    });
  }

  static countByBrandId(brand_id: number) {
    return prisma.item.count({
      where: {
        item_brand_id: brand_id,
        is_delete: false,
      },
    });
  }

  static countByBrandIds(brand_ids: number[]) {
    return prisma.item.groupBy({
      by: ["item_brand_id"],
      where: {
        item_brand_id: {
          in: brand_ids,
        },
        is_delete: false,
      },
      _count: true,
    });
  }

  static fetchSoldByDate(date: Date = new Date()) {
    return prisma.$queryRaw`
      SELECT COUNT(DISTINCT(item.id)) AS count
      FROM item
      JOIN bill ON bill.item_id = item.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${
      date.getMonth() + 1
    } AND DAY(bill_code.date) = ${date.getDate()}
    `;
  }

  static fetchMonthlySoldByDate(date: Date = new Date()) {
    return prisma.$queryRaw`
      SELECT COUNT(DISTINCT(item.id)) AS count
      FROM item
      JOIN bill ON bill.item_id = item.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${
      date.getMonth() + 1
    }
    `;
  }

  static fetchChartItems(monthly: boolean, limit: number, offset: number) {
    const date = new Date();
    const start_date = new Date();

    if (monthly) {
      date.setMonth(date.getMonth() - offset);
      start_date.setMonth(date.getMonth() - limit - offset);

      const prev_date = new Date();
      const start_prev_date = new Date();
      prev_date.setMonth(date.getMonth() - offset - 12);
      start_prev_date.setMonth(date.getMonth() - limit - offset - 12);

      return prisma.$transaction([
        prisma.$queryRawUnsafe(`
          SELECT 
          YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, COUNT(bill.item_id) AS count, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM item
          JOIN bill ON bill.item_id = item.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(
          start_date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-01' AND LAST_DAY('${date
          .getFullYear()
          .toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01')
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)`),
        prisma.$queryRawUnsafe(`
          SELECT 
          YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, COUNT(bill.item_id) AS count, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM item
          JOIN bill ON bill.item_id = item.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date BETWEEN '${start_prev_date
            .getFullYear()
            .toString()}-${(start_prev_date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01' AND LAST_DAY('${prev_date
          .getFullYear()
          .toString()}-${(prev_date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01')
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)`),
      ]);
    } else {
      date.setDate(date.getDate() - offset);
      start_date.setDate(date.getDate() - limit - offset);
      return prisma.$queryRawUnsafe(
        `SELECT 
        YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, DAY(bill_code.date) AS day, COUNT(bill.item_id) AS count, datediff(curdate(), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(bill_code.date),2,'00')), '%Y-%m-%d')) AS diff
        FROM item
        JOIN bill ON bill.item_id = item.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(
          start_date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${start_date
          .getDate()
          .toString()
          .padStart(2, "0")}' AND '${date.getFullYear().toString()}-${(
          date.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        GROUP BY YEAR(bill_code.date), MONTH(bill_code.date), DAY(bill_code.date)`
      );
    }
  }

  /**
   * Toggle item status
   * @param item_id
   * @param status
   * @returns
   */
  static activateByID(item_id: number, status: boolean) {
    return prisma.item.update({
      where: {
        id: item_id,
      },
      data: {
        is_active: status,
      },
    });
  }

  /**
   * Fetch current itme price by Brand and Type
   * Used for item price bulk update
   * @param brand_id
   * @param type_id
   * @param setting
   * @returns
   */
  static fetchItemPriceByBrandType(
    brand_id: number[],
    type_id: number[],
    setting: number
  ) {
    switch (setting) {
      case 0:
        return prisma.item_price.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_delete: false,
            },
            is_delete: false,
            item_unit: {
              is_delete: false,
            },
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                id: true,
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
      case 2:
        return prisma.item_price.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_active: false,
              is_delete: false,
            },
            is_delete: false,
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                id: true,
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
      default:
        return prisma.item_price.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_active: true,
              is_delete: false,
            },
            is_delete: false,
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                id: true,
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
    }
  }

  /**
   * Fetch item price by brand and type
   * @param brand_id
   * @param type_id
   * @param setting
   * @returns
   */
  static fetchItemPurchasePriceByBrandType(
    brand_id: number[],
    type_id: number[],
    setting: number
  ) {
    switch (setting) {
      case 0:
        return prisma.item_price_purchase.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_delete: false,
            },
            is_delete: false,
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
      case 2:
        return prisma.item_price_purchase.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_active: false,
              is_delete: false,
            },
            is_delete: false,
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
      default:
        return prisma.item_price_purchase.findMany({
          where: {
            item: {
              item_brand_id: {
                in: brand_id,
              },
              item_type_id: {
                in: type_id,
              },
              is_active: true,
              is_delete: false,
            },
            is_delete: false,
          },
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_brand: {
                  select: {
                    name: true,
                  },
                },
                item_type: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            price: true,
            discount: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
          orderBy: [
            {
              item: {
                reference: "asc",
              },
            },
            {
              item_unit_id: "asc",
            },
          ],
        });
    }
  }

  static fetchByItemUnitIds(items: any[]) {
    return prisma.item_price.findMany({
      where: {
        OR: items,
        is_delete: false,
      },
      select: {
        id: true,
        price: true,
        discount: true,
        item_id: true,
        item_unit_id: true,
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
            item_brand: {
              select: {
                name: true,
              },
            },
            item_type: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  static fetchInputByBrandType(
    brand_id: number[],
    type_id: number[],
    startDate: Date,
    endDate: Date
  ) {
    const formatted_start_date = `${startDate.getFullYear().toString()}-${(
      startDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`;

    const formatted_end_date = `${endDate.getFullYear().toString()}-${(
      endDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`;

    return prisma.good_receipt.findMany({
      where: {
        AND: [
          {
            good_receipt_code: {
              date: {
                gte: new Date(formatted_start_date),
              },
            },
          },
          {
            good_receipt_code: {
              date: {
                lte: new Date(formatted_end_date),
              },
            },
          },
          {
            good_receipt_code: {
              is_confirm: true,
            },
          },
        ],
        item: {
          item_brand_id: {
            in: brand_id,
          },
          item_type_id: {
            in: type_id,
          },
        },
      },
      select: {
        quantity: true,
        item_unit: {
          select: {
            unit: true,
            conversion: true,
          },
        },
        good_receipt_code: {
          select: {
            date: true,
          },
        },
        item: {
          select: {
            unit: true,
            item_brand_id: true,
            item_type_id: true,
            id: true,
            reference: true,
            description: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_type: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        good_receipt_code: {
          date: "asc",
        },
      },
    });
  }

  static fetchOutputByBrandType(
    brand_id: number[],
    type_id: number[],
    startDate: Date,
    endDate: Date
  ) {
    const formatted_start_date = `${startDate.getFullYear().toString()}-${(
      startDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${startDate.getDate().toString().padStart(2, "0")}`;

    const formatted_end_date = `${endDate.getFullYear().toString()}-${(
      endDate.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${endDate.getDate().toString().padStart(2, "0")}`;

    return prisma.bill.findMany({
      where: {
        AND: [
          {
            bill_code: {
              date: {
                gte: new Date(formatted_start_date),
              },
            },
          },
          {
            bill_code: {
              date: {
                lte: new Date(formatted_end_date),
              },
            },
          },
          {
            bill_code: {
              is_confirm: true,
            },
          },
        ],
        item: {
          item_brand_id: {
            in: brand_id,
          },
          item_type_id: {
            in: type_id,
          },
        },
      },
      select: {
        quantity: true,
        item_unit: {
          select: {
            unit: true,
            conversion: true,
          },
        },
        bill_code: {
          select: {
            date: true,
          },
        },
        item: {
          select: {
            unit: true,
            item_brand_id: true,
            item_type_id: true,
            id: true,
            reference: true,
            description: true,
            item_brand: {
              select: {
                name: true,
              },
            },
            item_type: {
              select: {
                name: true,
              },
            },
          },
        },
        sales_return: {
          select: {
            quantity: true,
          },
          where: {
            sales_return_code: {
              is_confirm: true,
              is_delete: false,
            },
          },
        },
      },
      orderBy: {
        bill_code: {
          date: "asc",
        },
      },
    });
  }

  /**
   * Fetch output value by brand and type
   * @param brand
   * @param type
   * @param month
   * @param year
   * @returns
   */
  static fetchValueByBrandType(
    brand: number[],
    type: number[],
    month: number,
    year: number
  ) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IProductOutputReport[]>(`
        SELECT item.id, item.reference, item.description, item_brand.name AS item_brand_name, 
        item_type.name AS item_type_name, item.unit, item.item_brand_id, item.item_type_id, 
        COALESCE(goodReceiptCount.quantity, 0) AS goodReceiptQuantity,
        COALESCE(adjustmentCountPlus.quantity, 0) AS adjustmentQuantityPlus,
        COALESCE(adjustmentCountMinus.quantity, 0) AS adjustmentQuantityMinus,
        COALESCE(billCount.quantity, 0) AS billQuantity,
        COALESCE(salesReturnCount.quantity, 0) AS salesReturnQuantity
        FROM item
        JOIN item_brand ON item.item_brand_id = item_brand.id
        JOIN item_type ON item.item_type_id = item_type.id
        LEFT JOIN (
          SELECT SUM(bill.quantity * COALESCE(item_unit.conversion, 1)) * -1 AS quantity, bill.item_id
          FROM bill
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_delete = 0
          AND MONTH(bill_code.date) = ${month}
          AND YEAR(bill_code.date) = ${year}
          GROUP BY bill.item_id
        ) AS billCount
        ON item.id = billCount.item_id
        LEFT JOIN (
          SELECT SUM(adjustment_case.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case.item_id
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND MONTH(adjustment_case_code.date) = ${month}
          AND YEAR(adjustment_case_code.date) = ${year}
          AND adjustment_case.quantity > 0
          GROUP BY adjustment_case.item_id
        ) AS adjustmentCountPlus
        ON item.id = adjustmentCountPlus.item_id
        LEFT JOIN (
          SELECT SUM(adjustment_case.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case.item_id
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND MONTH(adjustment_case_code.date) = ${month}
          AND YEAR(adjustment_case_code.date) = ${year}
          AND adjustment_case.quantity < 0
          GROUP BY adjustment_case.item_id
        ) AS adjustmentCountMinus
        ON item.id = adjustmentCountMinus.item_id
        LEFT JOIN (
          SELECT SUM(good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, good_receipt.item_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt_code_id = good_receipt_code.id
          LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
          WHERE good_receipt_code.is_delete = 0
          AND MONTH(good_receipt_code.date) = ${month}
          AND YEAR(good_receipt_code.date) = ${year}
          GROUP BY good_receipt.item_id
        ) AS goodReceiptCount
        ON item.id = goodReceiptCount.item_id
        LEFT JOIN (
          SELECT SUM(sales_return.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, bill.item_id
          FROM sales_return
          JOIN sales_return_code ON sales_return_code_id = sales_return_code.id
          JOIN bill ON sales_return.bill_id = bill.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE sales_return_code.is_delete = 0
          AND MONTH(sales_return_code.date) = ${month}
          AND YEAR(sales_return_code.date) = ${year}
          GROUP BY bill.item_id
        ) AS salesReturnCount
        ON item.id = salesReturnCount.item_id
        WHERE item_brand.id IN (${brand.join(
          ","
        )}) AND item_type.id IN (${type.join(",")})
        AND item.is_delete = 0
      `),
      prisma.item_brand.findMany({
        where: {
          id: {
            in: brand,
          },
        },
      }),
      prisma.item_type.findMany({
        where: {
          id: {
            in: type,
          },
        },
      }),
    ]);
  }

  static fetchValueByBrandTypeDaily(
    type: number[],
    day: number,
    month: number,
    year: number
  ) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IProductOutputReport[]>(`
        SELECT item.id, item.reference, item.description, item_brand.name AS item_brand_name, 
        item_type.name AS item_type_name, item.unit, item.item_brand_id, item.item_type_id, 
        COALESCE(goodReceiptCount.quantity, 0) AS goodReceiptQuantity,
        COALESCE(adjustmentCountPlus.quantity, 0) AS adjustmentQuantityPlus,
        COALESCE(adjustmentCountMinus.quantity, 0) AS adjustmentQuantityMinus,
        COALESCE(billCount.quantity, 0) AS billQuantity,
        COALESCE(salesReturnCount.quantity, 0) AS salesReturnQuantity
        FROM item
        JOIN item_brand ON item.item_brand_id = item_brand.id
        JOIN item_type ON item.item_type_id = item_type.id
        LEFT JOIN (
          SELECT SUM(bill.quantity * COALESCE(item_unit.conversion, 1)) * -1 AS quantity, bill.item_id
          FROM bill
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_delete = 0
          AND DAY(bill_code.date) = ${day}
          AND MONTH(bill_code.date) = ${month}
          AND YEAR(bill_code.date) = ${year}
          GROUP BY bill.item_id
        ) AS billCount
        ON item.id = billCount.item_id
        LEFT JOIN (
          SELECT SUM(adjustment_case.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case.item_id
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND DAY(adjustment_case_code.date) = ${day}
          AND MONTH(adjustment_case_code.date) = ${month}
          AND YEAR(adjustment_case_code.date) = ${year}
          AND adjustment_case.quantity > 0
          GROUP BY adjustment_case.item_id
        ) AS adjustmentCountPlus
        ON item.id = adjustmentCountPlus.item_id
        LEFT JOIN (
          SELECT SUM(adjustment_case.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case.item_id
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND DAY(adjustment_case_code.date) = ${day}
          AND MONTH(adjustment_case_code.date) = ${month}
          AND YEAR(adjustment_case_code.date) = ${year}
          AND adjustment_case.quantity < 0
          GROUP BY adjustment_case.item_id
        ) AS adjustmentCountMinus
        ON item.id = adjustmentCountMinus.item_id
        LEFT JOIN (
          SELECT SUM(good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, good_receipt.item_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt_code_id = good_receipt_code.id
          LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
          WHERE good_receipt_code.is_delete = 0
          AND DAY(good_receipt_code.date) = ${day}
          AND MONTH(good_receipt_code.date) = ${month}
          AND YEAR(good_receipt_code.date) = ${year}
          GROUP BY good_receipt.item_id
        ) AS goodReceiptCount
        ON item.id = goodReceiptCount.item_id
        LEFT JOIN (
          SELECT SUM(sales_return.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, bill.item_id
          FROM sales_return
          JOIN sales_return_code ON sales_return_code_id = sales_return_code.id
          JOIN bill ON sales_return.bill_id = bill.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE sales_return_code.is_delete = 0
          AND DAY(sales_return_code.date) = ${day}
          AND MONTH(sales_return_code.date) = ${month}
          AND YEAR(sales_return_code.date) = ${year}
          GROUP BY bill.item_id
        ) AS salesReturnCount
        ON item.id = salesReturnCount.item_id
        WHERE item_type.id IN (${type.join(",")})
        AND item.is_delete = 0
      `),
      prisma.item_type.findMany({
        where: {
          id: {
            in: type,
          },
        },
      }),
    ]);
  }

  static fetchMinusStock(keyword: string, offset: number, limit: number) {
    return prisma.$transaction([
      prisma.item.findMany({
        where: {
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
          unit: true,
        },
        orderBy: {
          reference: "asc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.item.count({
        where: {
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

  static fetchCompleteByIDs(ids: number[]) {
    return prisma.$transaction([
      prisma.item.findMany({
        where: {
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
          reference: true,
          description: true,
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
          unit: true,
          item_price: {
            select: {
              price: true,
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
            },
          },
        },
      }),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM(quantity * COALESCE(item_unit.conversion, 1)) AS quantity, draft_bill.item_id
        FROM draft_bill
        JOIN draft_bill_code ON draft_bill.draft_bill_code_id = draft_bill_code.id
        LEFT JOIN item_unit ON draft_bill.item_unit_id = item_unit.id
        WHERE draft_bill.item_id IN (${ids.join(",")})
        AND draft_bill_code.is_delete = 0
        GROUP BY draft_bill.item_id
      `),
    ]);
  }

  /**
   * Fetch all items
   * @param date
   * @remarks Used only for development purpose only
   * @returns
   */
  static fetchAll(date: Date) {
    return prisma.item.findMany({
      where: {
        is_delete: false,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        unit: true,
        item_brand_id: true,
        item_type_id: true,
        is_active: true,
        minimum_stock: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_type: {
          select: {
            name: true,
          },
        },
        item_price: {
          select: {
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
              lt: date,
            },
          },
          orderBy: {
            effective_date: "desc",
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
}

export class ItemUnitModel {}
