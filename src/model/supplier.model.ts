import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class SupplierModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by?: number;
  created_at: Date;
  is_delete: boolean = false;
  deleted_by: number | null = null;
  deleted_at: Date | null = null;

  constructor(
    name: string,
    address: string,
    npwp: string | null = null,
    id: number | null = null,
    created_by: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    if (created_by != null) {
      this.created_by = this.created_by;
    }

    this.name = name;
    this.address = address;
    this.npwp = npwp;
    this.created_at = new Date();
  }

  create() {
    return prisma.supplier.create({
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        created_by: this.created_by!,
        created_at: this.created_at,
      },
      select: {
        id: true,
        name: true,
        address: true,
        npwp: true,
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
      },
    });
  }

  update() {
    return prisma.supplier.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
      },
    });
  }

  static checkDeleteById(id: number) {
    prisma.good_receipt_code
      .count({
        where: {
          supplier_id: id,
        },
      })
      .then((count) => {
        return count == 0 ? true : false;
      });

    return false;
  }

  static getAutocomplete(keyword: string) {
    if (keyword == "") {
      return prisma.supplier.findMany({
        where: {
          is_delete: false,
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    } else {
      return prisma.supplier.findMany({
        where: {
          is_delete: false,
          OR: [
            {
              name: {
                contains: keyword,
              },
              address: {
                contains: keyword,
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    }
  }

  static getItems(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.supplier.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            address: true,
            npwp: true,
            user: {
              select: {
                name: true,
              },
            },
            created_at: true,
          },
          take: limit,
          skip: offset,
        }),
        prisma.supplier.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.supplier.findMany({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                address: {
                  contains: keyword,
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            address: true,
            npwp: true,
            user: {
              select: {
                name: true,
              },
            },
            created_at: true,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.supplier.count({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                address: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  static fetchById(id: number) {
    return prisma.supplier.findUnique({
      where: {
        id: id,
      },
    });
  }
}

export default SupplierModel;
