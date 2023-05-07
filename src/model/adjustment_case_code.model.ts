import { PrismaClient } from "@prisma/client";
import ErrorList from "../assets/error_list";

const prisma = new PrismaClient();

class AdjustmentCaseCodeModel {
  id?: number;
  name: string;
  date: Date;
  created_by: number;
  created_at: Date;
  is_confirm: boolean = true;
  is_delete: boolean = false;
  confirmed_by?: number;
  confirmed_at?: Date;
  company_id: number;

  constructor(
    name: string,
    date: Date,
    created_by: number,
    company_id: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.date = date;
    this.created_by = created_by;
    this.created_at = new Date();
    this.company_id = company_id;
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
        company_id: this.company_id,
      },
    });
  }

  static deleteById(id: number) {
    return prisma.adjustment_case_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        is_confirm: false,
      },
      select: {
        name: true,
        date: true,
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
                id: true,
                reference: true,
                description: true,
                unit: true,
              },
            },
            quantity: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
            address: true,
            npwp: true,
          },
        },
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
        date: true,
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
                id: true,
                reference: true,
                description: true,
                unit: true,
              },
            },
            quantity: true,
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
        company: {
          select: {
            name: true,
            address: true,
            npwp: true,
          },
        },
      },
    });
  }

  static fetchArchiveYears(mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.date IS NOT NULL
      GROUP BY YEAR(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.is_delete = 1
      AND adjustment_case_code.date IS NOT NULL
      GROUP BY YEAR(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.is_delete = 0
      AND adjustment_case_code.date IS NOT NULL
      GROUP BY YEAR(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    }
  }

  static fetchArchiveMonths(year: number, mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(adjustment_case_code.date)) AS month, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE YEAR(adjustment_case_code.date) = ${year}
      GROUP BY MONTH(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(adjustment_case_code.date)) AS month, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE YEAR(adjustment_case_code.date) = ${year}
      AND adjustment_case_code.is_delete = 1
      GROUP BY MONTH(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(adjustment_case_code.date)) AS month, COUNT(id) AS count
      FROM adjustment_case_code
      WHERE YEAR(adjustment_case_code.date) = ${year}
      AND adjustment_case_code.is_delete = 0
      GROUP BY MONTH(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date ASC
    `;
    }
  }

  static fetchArchive(year: number, month: number, page: number, mode: number) {
    if (mode == 0) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, adjustment_case_code.name, adjustment_case_code.is_delete, company_id AS company_id, company.name AS company_name, adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        ORDER BY adjustment_case_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        `,
      ]);
    } else if (mode == 1) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, adjustment_case_code.name, adjustment_case_code.is_delete, company_id AS company_id, company.name AS company_name, adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        AND adjustment_case_code.is_delete = 1
        ORDER BY adjustment_case_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        AND adjustment_case_code.is_delete = 1
        `,
      ]);
    } else if (mode == 2) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, adjustment_case_code.name, adjustment_case_code.is_delete, company_id AS company_id, company.name AS company_name, adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        AND adjustment_case_code.is_delete = 0
        ORDER BY adjustment_case_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${year} AND MONTH(adjustment_case_code.date) = ${
          month + 1
        }
        AND adjustment_case_code.is_delete = 0
        `,
      ]);
    }
  }
}

export default AdjustmentCaseCodeModel;
