"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fetch_interface_1 = require("../interface/fetch.interface");
const prisma = new client_1.PrismaClient();
class CompanyModel {
    /**
     * Create a new company data
     * @param data
     * @returns
     */
    static create(data) {
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
    static fetch(keyword, limit, offset, mode) {
        if (mode == fetch_interface_1.fetchMode.Pagination) {
            return prisma.$transaction([
                prisma.$queryRawUnsafe(`
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
        }
        else if (mode == fetch_interface_1.fetchMode.Autocomplete) {
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
            }
            else {
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
        }
        else if (mode == fetch_interface_1.fetchMode.All) {
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
    static fetchByID(id) {
        return prisma.$queryRaw `
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
    static updateByID(data) {
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
    static deleteByID(id, user_id) {
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
    /**
     * Fetch all company data
     * @returns
     */
    static fetchAll() {
        return prisma.company.findMany({
            orderBy: {
                name: "asc",
            },
        });
    }
}
exports.default = CompanyModel;
//# sourceMappingURL=company.model.js.map