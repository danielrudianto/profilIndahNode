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
import { ProductUnitModel } from "./product-unit.model";

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
  item_id: number;
  item_unit_id: number | null;
  quantity: number;

  item?: ProductModel;
  item_unit?: ProductUnitModel | null;
}

export enum IAdjustmentCaseApprovalStatus {
  APPROVED = "approved",
  DISAPPROVED = "disapproved",
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

  // initialize the model with default values
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
        item_id: ac.item_id,
        item_unit_id: ac.item_unit_id,
        quantity: Number(ac.quantity),
        item: new ProductModel({
          id: ac.item.id,
          reference: ac.item.reference,
          description: ac.item.description,
          unit: ac.item.unit,
          brand_id: ac.item.item_brand_id,
          type_id: ac.item.item_type_id,
        }),
        item_unit:
          ac.item_unit == null
            ? null
            : new ProductUnitModel({
                item_id: ac.item_id,
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

  static confirm(
    id: number,
    userID: number,
    approvalStatus: IAdjustmentCaseApprovalStatus
  ) {
    if (approvalStatus == IAdjustmentCaseApprovalStatus.DISAPPROVED) {
      return prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          confirmed_by: userID,
          confirmed_at: new Date(),
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
    } else if (approvalStatus == IAdjustmentCaseApprovalStatus.APPROVED) {
      return prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_confirm: true,
          confirmed_by: userID,
          confirmed_at: new Date(),
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
    } else {
      throw new Error("Invalid approval status provided");
    }
  }
  /**
   * Fetch all adjustment case code
   * @param id
   * @returns
   */
  static async fetchByID(id: number) {
    const adjustment_case = await prisma.adjustment_case_code.findUnique({
      where: {
        id: id,
      },
      select: {
        name: true,
        date: true,
        id: true,
        is_confirm: true,
        is_delete: true,
        company_id: true,
        user_adjustment_case_code_created_byTouser: {
          select: {
            name: true,
            username: true,
            role: true,
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
        created_by: true,
        adjustment_case: {
          select: {
            id: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                id: true,
                reference: true,
                description: true,
                unit: true,
                item_brand_id: true,
                item_type_id: true,
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

    if (!adjustment_case) {
      throw new Error("Adjustment case code not found");
    }

    return new AdjustmentCaseModel({
      id: adjustment_case.id,
      name: adjustment_case.name,
      date: adjustment_case.date,
      created_by: adjustment_case.created_by,
      company_id: adjustment_case.company_id,
      adjustment_case: adjustment_case.adjustment_case.map((ac) => ({
        item_id: ac.item.id,
        item_unit_id: ac.item_unit_id,
        quantity: Number(ac.quantity),
        item: new ProductModel({
          id: ac.item.id,
          reference: ac.item.reference,
          description: ac.item.description,
          unit: ac.item.unit,
          brand_id: ac.item.item_brand_id,
          type_id: ac.item.item_type_id,
        }),
        item_unit:
          ac.item_unit == null
            ? null
            : new ProductUnitModel({
                item_id: ac.item_id,
                unit: ac.item_unit.unit,
                conversion: Number(ac.item_unit.conversion),
              }),
      })),
      user_adjustment_case_code_created_byTouser: UserViewModel.fromMap(
        adjustment_case.user_adjustment_case_code_created_byTouser
      ),
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
