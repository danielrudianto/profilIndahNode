import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AdjustmentCaseModel {
  id?: number;
  name: string;
  date: Date;
  created_by: number;
  created_at: Date;
  is_confirm: boolean = true;
  is_delete: boolean = false;
  confirmed_by?: number;
  confirmed_at?: Date;

  constructor(
    name: string,
    date: Date,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.date = date;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.adjustment_case_code.create({
      data: {
        name: this.name,
        date: this.date,
        created_by: this.created_by,
        created_at: this.created_at,
        is_confirm: this.is_confirm,
        is_delete: this.is_delete,
        confirmed_by: this.created_by,
        confirmed_at: this.created_at,
      },
    });
  }

  static createItems(items: any[]) {
    return prisma.adjustment_case.createMany({
      data: items,
    });
  }

  static fetchArchive(
    year: number,
    month: number,
    offset: number,
    limit: number
  ) {
    const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end_date = new Date(year, month, 1, 0, 0, 0, 0);

    return prisma.adjustment_case_code.findMany({
      where: {
        AND: [
          {
            date: {
              gte: start_date,
            },
          },
          {
            date: {
              lt: end_date,
            },
          },
        ],
      },
      orderBy: {
        date: "asc",
      },
      take: limit,
      skip: offset,
      select: {
        name: true,
        id: true,
        date: true,
        user_adjustment_case_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        user_adjustment_case_code_confirmed_byTouser: {
          select: {
            name: true,
          },
        },
        created_at: true,
        is_delete: true,
        is_confirm: true,
      },
    });
  }

  static fetchArchiveYears() {
    return prisma.$queryRaw`SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year FROM adjustment_case_code ORDER BY adjustment_case_code.date ASC`;
  }

  static countArchiveByYear() {
    return prisma.$queryRaw`SELECT COUNT(adjustment_case_code.id) AS count, YEAR(adjustment_case_code.date) AS year FROM adjustment_case_code GROUP BY YEAR(adjustment_case_code.date)`;
  }

  static countArchiveByMonth(year: number) {
    return prisma.$queryRaw`SELECT COUNT(adjustment_case_code.id) AS count, MONTH(adjustment_case_code.date) AS month FROM adjustment_case_code WHERE YEAR(adjustment_case_code.date) = ${year} GROUP BY MONTH(adjustment_case_code.date)`;
  }

  static countArchive(year: number, month: number) {
    const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end_date = new Date(year, month, 1, 0, 0, 0, 0);

    return prisma.adjustment_case_code.count({
      where: {
        AND: [
          {
            date: {
              gte: start_date,
            },
          },
          {
            date: {
              lt: end_date,
            },
          },
        ],
      },
    });
  }

  static fetchById(id: number) {
    return prisma.adjustment_case_code.findUnique({
      where: {
        id: id,
      },
      select: {
        name: true,
        id: true,
        is_confirm: true,
        is_delete: true,
        user_adjustment_case_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        created_at: true,
        adjustment_case: {
          select: {
            item: {
              select: {
                reference: true,
                description: true,
              },
            },
            quantity: true,
          },
        },
      },
    });
  }
}

export default AdjustmentCaseModel;
