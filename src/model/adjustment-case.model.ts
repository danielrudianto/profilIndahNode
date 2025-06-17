import {
  AdjustmentCaseArchive,
  AdjustmentCaseArchiveV2,
  AnnualArchive,
  ArchiveCount,
  IFetchAdjustmentCaseArchiveV2,
  IFetchArchive,
  MonthlyArchive,
} from "../interface/archive.interface";
import { prisma } from "../helper/database.helper";
import { UserViewModel } from "./user.model";
import { ProductModel } from "./product.model";
import { ProductUnitModel, ProductUnitViewModel } from "./product-unit.model";

export interface IAdjustmentCaseCode {
  id?: number;
  name: string;
  date: Date;
  created_by?: number;
  created_at?: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  confirmed_by?: number | null;
  confirmed_at?: Date | null;

  company_id: number | null;
  adjustment_case: IAdjustmentCase[];
  user_adjustment_case_code_created_byTouser?: UserViewModel;
}

interface IAdjustmentCase {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;

  product?: ProductModel;
  product_unit?: ProductUnitViewModel | null;
}

class AdjustmentCaseModel {
  id?: number;
  name: string;
  date: Date;
  created_by?: number;
  created_at?: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  confirmed_by?: number | null;
  confirmed_at?: Date;
  company_id: number | null;
  adjustment_case: IAdjustmentCase[];
  user_adjustment_case_code_created_byTouser?: UserViewModel;

  constructor(data: IAdjustmentCaseCode) {
    this.id = data.id;
    this.name = data.name;
    this.date = data.date;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_confirm = false;
    this.is_delete = false;
    this.confirmed_by = null;
    this.confirmed_at = new Date();
    this.company_id = data.company_id;
    this.adjustment_case = data.adjustment_case || [];
    this.user_adjustment_case_code_created_byTouser =
      data.user_adjustment_case_code_created_byTouser;
  }

  static fromMap(data: any): AdjustmentCaseModel {
    return new AdjustmentCaseModel({
      id: data.id,
      name: data.name,
      date: data.date,
      created_by: data.created_by,
      created_at: data.created_at,
      is_confirm: data.is_confirm,
      is_delete: data.is_delete,
      confirmed_by: data.confirmed_by,
      confirmed_at: data.confirmed_at,
      company_id: data.company_id,
      adjustment_case: data.adjustment_case.map((ac: any) => ({
        id: ac.id,
        product_id: ac.product_id,
        product_unit_id: ac.product_unit_id,
        quantity: Number(ac.quantity),
        item: new ProductModel({
          id: ac.item.id,
          reference: ac.item.reference,
          description: ac.item.description,
          unit: ac.item.unit,
          product_brand_id: ac.item.product_brand_id,
          product_type_id: ac.item.product_type_id,
        }),
        product_unit:
          ac.item_unit == null
            ? null
            : new ProductUnitViewModel({
                product_id: ac.product_id,
                unit: ac.item_unit.unit,
                conversion: Number(ac.item_unit.conversion),
              }),
      })),
      user_adjustment_case_code_created_byTouser: UserViewModel.fromMap(
        data.user_adjustment_case_code_created_byTouser
      ),
    });
  }

  static fetchUnconfirmed(page: number) {
    return prisma.$transaction([
      prisma.adjustment_case_code.findMany({
        where: {
          is_confirm: false,
          is_delete: false,
        },
        orderBy: {
          date: "asc",
        },
        skip: (page - 1) * 10,
        take: 10,
        select: {
          id: true,
          date: true,
          name: true,
          user_adjustment_case_code_created_byTouser: {
            select: {
              name: true,
              user_avatar: true,
            },
          },
          company: {
            select: {
              name: true,
            },
          },
          adjustment_case: true,
        },
      }),
      prisma.adjustment_case_code.count({
        where: {
          is_confirm: false,
          is_delete: false,
        },
      }),
    ]);
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
            product: true,
            quantity: true,
            product_unit: true,
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
