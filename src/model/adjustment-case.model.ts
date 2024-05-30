import {
  AdjustmentCaseArchive,
  AdjustmentCaseArchiveV2,
  AnnualArchive,
  ArchiveCount,
  IFetchAdjustmentCaseArchive,
  IFetchAdjustmentCaseArchiveV2,
  IFetchArchive,
  MonthlyArchive,
} from "../interface/archive.interface";
import { prisma } from "../app";

export interface IAdjustmentCaseCode {
  name: string;
  date: Date;
  created_by: number;
  company_id: number;
  adjustment_case: IAdjustmentCase[];
}

interface IAdjustmentCase {
  item_id: number;
  item_unit_id: number | null;
  quantity: number;
}

class AdjustmentCaseModel {
  /**
   * Create a new adjustment case code
   * @param name
   * @param date
   * @param created_by
   * @param company_id
   * @param items
   * @returns
   */
  static create(data: IAdjustmentCaseCode) {
    return prisma.adjustment_case_code.create({
      data: {
        name: data.name,
        date: data.date,
        created_by: data.created_by,
        created_at: new Date(),
        is_confirm: true,
        is_delete: false,
        confirmed_by: data.created_by,
        confirmed_at: new Date(),
        company_id: data.company_id,
        adjustment_case: {
          createMany: {
            data: data.adjustment_case,
          },
        },
      },
      include: {
        adjustment_case: {
          select: {
            id: true,
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
      },
    });
  }

  /**
   * Fetch all adjustment case code
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
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
            user_avatar: {
              select: {
                top: true,
                accessories: true,
                clothes: true,
                eyes: true,
                eyebrows: true,
                mouth: true,
                circle: true,
                color: true,
              },
            },
          },
        },
        created_at: true,
        adjustment_case: {
          select: {
            id: true,
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

  /**
   * Delete adjustment case code
   * @param id
   * @returns
   */
  static deleteByID(id: number) {
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
            id: true,
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

  /**
   * Fetch all adjustment case code
   * And count the total data by year
   * @param mode
   * @returns
   */
  static fetchArchiveYears() {
    return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year, 
      COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.date IS NOT NULL
      GROUP BY YEAR(adjustment_case_code.date)
    `;
  }

  static fetchArchiveYearsV2() {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT YEAR(adjustment_case_code.date) AS year, 
      MONTH(adjustment_case_code.date) AS month,
      COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.date IS NOT NULL
      GROUP BY MONTH(adjustment_case_code.date), YEAR(adjustment_case_code.date)
      ORDER BY adjustment_case_code.date DESC
    `;
  }

  /**
   * Fetch all adjustment case code
   * And count the total data by month
   * in certain year
   * @param year
   * @param mode
   * @returns
   */
  static fetchArchiveMonths(year: number) {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(adjustment_case_code.date)) AS month, 
      COUNT(id) AS count
      FROM adjustment_case_code
      WHERE YEAR(adjustment_case_code.date) = ${year}
      GROUP BY MONTH(adjustment_case_code.date)
    `;
  }

  /**
   * Fetch all adjustment case code
   * And count the total data by month
   * in certain year and month
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns
   */
  static fetchArchive(data: IFetchArchive) {
    if (data.mode == 0) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<AdjustmentCaseArchive[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        ${
          data.keyword == null
            ? ""
            : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
        }
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
        prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          ${
            data.keyword == null
              ? ""
              : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
          }
        `),
      ]);
    } else if (data.mode == 1) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<AdjustmentCaseArchive[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        AND adjustment_case_code.is_delete = 1
        ${
          data.keyword == null
            ? ""
            : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
        }
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
        prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          AND adjustment_case_code.is_delete = 1
          ${
            data.keyword == null
              ? ""
              : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
          }
        `),
      ]);
    } else if (data.mode == 2) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<AdjustmentCaseArchive[]>(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        AND adjustment_case_code.is_delete = 0
        ${
          data.keyword == null
            ? ""
            : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
        }
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
        prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          AND adjustment_case_code.is_delete = 0
          ${
            data.keyword == null
              ? ""
              : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`
          }
        `),
      ]);
    }
  }

  static fetchArchiveV2(data: IFetchAdjustmentCaseArchiveV2) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<AdjustmentCaseArchiveV2[]>(`
      SELECT adjustment_case_code.id, adjustment_case_code.date, 
      adjustment_case_code.name, adjustment_case_code.is_delete, 
      company_id AS company_id, company.name AS company_name,  
      adjustment_case_code.is_confirm, IF(ac.quantity > 0, 1, 0) AS type
      FROM adjustment_case_code
      JOIN (
        SELECT adjustment_case.quantity, adjustment_case.adjustment_case_code_id
        FROM adjustment_case
        GROUP BY adjustment_case.adjustment_case_code_id
      ) AS ac
      ON adjustment_case_code.id = ac.adjustment_case_code_id
      LEFT JOIN company ON adjustment_case_code.company_id = company.id
      WHERE YEAR(adjustment_case_code.date) = ${
        data.year
      } AND MONTH(adjustment_case_code.date) = ${data.month}
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND adjustment_case_code.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND adjustment_case_code.is_delete = 1"
          : "AND adjustment_case_code.is_delete = 0"
      }
      ${
        data.type == 0
          ? ""
          : data.type == 1
          ? "AND ac.quantity > 0"
          : "AND ac.quantity < 0"
      }
      AND adjustment_case_code.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      ORDER BY adjustment_case_code.date ASC
      LIMIT ${data.limit}
      OFFSET ${data.offset}`),
      prisma.$queryRawUnsafe<ArchiveCount[]>(`
        SELECT COUNT(id) AS count 
        FROM adjustment_case_code
        JOIN (
          SELECT adjustment_case.quantity, adjustment_case.adjustment_case_code_id
          FROM adjustment_case
          GROUP BY adjustment_case.adjustment_case_code_id
        ) AS ac
        ON adjustment_case_code.id = ac.adjustment_case_code_id
        WHERE YEAR(adjustment_case_code.date) = ${
          data.year
        } AND MONTH(adjustment_case_code.date) = ${data.month}
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND adjustment_case_code.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND adjustment_case_code.is_delete = 1"
          : "AND adjustment_case_code.is_delete = 0"
      }
      ${
        data.type == 0
          ? ""
          : data.type == 1
          ? "AND ac.quantity > 0"
          : "AND ac.quantity < 0"
      }
      AND adjustment_case_code.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      `),
    ]);
  }

  static fetchGeneralByIDs(ids: number[]) {
    if (ids.length == 0) return Promise.resolve([]);

    return prisma.$queryRawUnsafe<any[]>(`
      SELECT adjustment_case_code.id, adjustment_case_code.name, adjustment_case_code.date, "Internal" AS opponent
      FROM adjustment_case_code
      WHERE adjustment_case_code.id IN (${ids.join(",")})
    `);
  }

  static fetchByCompanyID(company_id: number, date: string) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT item.reference, item.description, item.unit, adjustment_case.quantity * (COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case_code.name
      FROM adjustment_case
      JOIN adjustment_case_code ON adjustment_case_code.id = adjustment_case.adjustment_case_code_id
      JOIN item ON item.id = adjustment_case.item_id
      LEFT JOIN item_unit ON item_unit.id = adjustment_case.item_unit_id
      WHERE adjustment_case_code.company_id = ${company_id}
      AND adjustment_case.quantity > 0
      AND adjustment_case_code.date = '${date}'
      AND adjustment_case_code.is_delete = 0
      AND adjustment_case_code.is_confirm = 1
    `);
  }
}

export default AdjustmentCaseModel;
