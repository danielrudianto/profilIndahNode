import { PrismaClient } from "@prisma/client";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

export interface ICompany {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  is_delete?: boolean;
  can_delete?: string;
}

export interface ICompanyUpdate extends ICompany {
  id: number;
}

class CompanyModel {
  /**
   * Create a new company data
   * @param data
   * @returns
   */
  static create(data: ICompany) {
    return prisma.company.create({
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        created_by: data.created_by,
        created_at: new Date(),
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

  /**
   * Fetch all company data based on keyword
   * There are 3 modes: Pagination, Autocomplete, and Select
   * @param keyword
   * @param limit
   * @param offset
   * @param mode
   * @returns
   */
  static fetch(
    keyword: string,
    limit: number,
    offset: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.Pagination) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<ICompany[]>(`
          SELECT company.id, company.name, company.address, 
          company.npwp, company.created_by, company.created_at, 
          company.is_delete,
          IF(COALESCE(companyCount.count, 0) = 0, "1","0") AS can_delete
          FROM company
          LEFT JOIN (
            SELECT COUNT(id) AS count, good_receipt_code.company_id
            FROM good_receipt_code
            WHERE good_receipt_code.is_delete = 0
            GROUP BY good_receipt_code.company_id
          ) companyCount
          ON company.id = companyCount.company_id
          WHERE company.is_delete = 0
          AND (company.name LIKE '%${keyword}%' OR company.address LIKE '%${keyword}%')
          ORDER BY company.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
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
    } else if (mode == fetchMode.Autocomplete) {
      if (keyword == "") {
        return prisma.company.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
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
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        });
      }
    } else if (mode == fetchMode.All) {
      return prisma.company.findMany({
        orderBy: {
          name: "asc",
        },
      });
    }
  }

  /**
   * Fetch company data by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.$queryRaw<ICompany[]>`
      SELECT company.id, company.name, company.address, 
      company.npwp, company.created_by, company.created_at, 
      company.is_delete, 
      IF(COALESCE(companyCount.count, 0) = 0,"1", "0") AS can_delete
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

  /**
   * Update company data
   * @param data
   * @returns
   */
  static updateByID(data: ICompanyUpdate) {
    return prisma.company.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        updated_by: data.created_by,
        updated_at: new Date(),
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

  /**
   * Delete company data by ID
   * @param id
   * @param user_id
   * @returns
   */
  static deleteByID(id: number, user_id: number) {
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
}

export default CompanyModel;
