import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CompanyModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  created_at: Date;

  deleted_by?: number;
  deleted_at?: Date;

  updated_by?: number;
  updated_at?: Date;

  constructor(
    name: string,
    address: string,
    npwp: string | null,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.address = address;
    this.npwp = npwp;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.company.create({
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        created_by: this.created_by,
        created_at: this.created_at,
      },
      select: {
        id: true,
        name: true,
        address: true,
        npwp: true,
        created_by: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        user_company_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
        created_at: true,
      },
    });
  }

  update() {
    return prisma.company.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        updated_by: this.created_by,
        updated_at: this.created_at,
      },
      include: {
        user_company_updated_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static fetchById(id: number) {
    return prisma.$queryRaw<any[]>`
      SELECT company.id, company.name, company.address, company.npwp, company.created_by, company.created_at, company.is_delete, COALESCE(companyCount.count, 0) AS count
      FROM company
      LEFT JOIN (
        SELECT COUNT(id) AS count, good_receipt_code.company_id
        FROM good_receipt_code
        WHERE good_receipt_code.is_delete = 0
        AND good_receipt_code.company_id = ${id}
      ) companyCount
      ON company.id = companyCount.company_id
      WHERE company.id = ${id}
    `;
  }

  static checkDeleteById(id: number) {
    return prisma.good_receipt_code.count({
      where: {
        company_id: id,
      },
    });
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.company.findMany({
          where: {
            is_delete: false,
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
        prisma.company.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.company.findMany({
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
          take: limit,
          skip: offset,
        }),
        prisma.company.count({
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

  static fetchAutocomplete(keyword: string) {
    if (keyword == "") {
      return prisma.company.findMany({
        where: {
          is_delete: false,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    } else {
      return prisma.company.findMany({
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
      });
    }
  }

  static count(keyword: string = "") {
    if (keyword == "") {
      return prisma.company.count({
        where: {
          is_delete: false,
        },
      });
    } else {
      return prisma.company.count({
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
      });
    }
  }

  static delete(id: number, user_id: number) {
    return prisma.company.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_by: user_id,
      },
      include: {
        user_company_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static fetchAvailable() {
    return prisma.company.findMany({
      select: {
        name: true,
        address: true,
        id: true,
      },
      where: {
        good_receipt_code: {
          some: {
            is_delete: false,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  static fetchAll() {
    return prisma.company.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }
}

export default CompanyModel;
