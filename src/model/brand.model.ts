import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class BrandModel {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;

  constructor(name: string, created_by: number, id: number | null = null) {
    if (id != null) {
      this.id = id;
    }
    this.name = name;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.item_brand.create({
      data: {
        name: this.name,
        created_by: this.created_by,
        created_at: this.created_at,
      },
    });
  }

  update() {
    return prisma.item_brand.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static getByName(name: string) {
    return prisma.item_brand.findUnique({
      where: {
        name: name,
      },
    });
  }

  static fetchById(id: number) {
    return prisma.item_brand.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        created_by: true,
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
        is_delete: true,
        deleted_by: true,
        deleted_at: true,
      },
    });
  }

  static getAutocomplete(keyword: string) {
    return prisma.item_brand.findMany({
      where: {
        name: {
          contains: keyword,
        },
        is_delete: false,
      },
      skip: 0,
      take: 5,
    });
  }

  static get(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.item_brand.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            created_at: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.item_brand.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item_brand.findMany({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            created_at: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.item_brand.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    }
  }

  static checkDeleteById(id: number) {
    let count = false;
    prisma.item
      .count({
        where: {
          item_brand_id: id,
          is_delete: false,
        },
      })
      .then((result) => {
        if (result > 0) {
          count = false;
        } else {
          count = true;
        }
      });

    return count;
  }
}
