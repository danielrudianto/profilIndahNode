"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
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
    static create(data) {
        return app_1.prisma.adjustment_case_code.create({
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
    static fetchByID(id) {
        return app_1.prisma.adjustment_case_code.findUnique({
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
    static deleteByID(id) {
        return app_1.prisma.adjustment_case_code.update({
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
        return app_1.prisma.$queryRaw `
      SELECT DISTINCT(YEAR(adjustment_case_code.date)) AS year, 
      COUNT(id) AS count
      FROM adjustment_case_code
      WHERE adjustment_case_code.date IS NOT NULL
      GROUP BY YEAR(adjustment_case_code.date)
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
    static fetchArchiveMonths(year) {
        return app_1.prisma.$queryRaw `
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
    static fetchArchive(data) {
        if (data.mode == 0) {
            return app_1.prisma.$transaction([
                app_1.prisma.$queryRawUnsafe(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
                app_1.prisma.$queryRawUnsafe(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        `),
            ]);
        }
        else if (data.mode == 1) {
            return app_1.prisma.$transaction([
                app_1.prisma.$queryRawUnsafe(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        AND adjustment_case_code.is_delete = 1
        ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
                app_1.prisma.$queryRawUnsafe(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          AND adjustment_case_code.is_delete = 1
          ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        `),
            ]);
        }
        else if (data.mode == 2) {
            return app_1.prisma.$transaction([
                app_1.prisma.$queryRawUnsafe(`
        SELECT adjustment_case_code.id, adjustment_case_code.date, 
        adjustment_case_code.name, adjustment_case_code.is_delete, 
        company_id AS company_id, COALESCE(company.name, 'N/A') AS company_name, 
        adjustment_case_code.is_confirm
        FROM adjustment_case_code
        LEFT JOIN company ON adjustment_case_code.company_id = company.id
        WHERE YEAR(adjustment_case_code.date) = ${data.year} 
        AND MONTH(adjustment_case_code.date) = ${data.month + 1}
        AND adjustment_case_code.is_delete = 0
        ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        ORDER BY adjustment_case_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
                app_1.prisma.$queryRawUnsafe(`
          SELECT COUNT(id) AS count FROM adjustment_case_code
          WHERE YEAR(adjustment_case_code.date) = ${data.year} 
          AND MONTH(adjustment_case_code.date) = ${data.month + 1}
          AND adjustment_case_code.is_delete = 0
          ${data.keyword == null
                    ? ""
                    : `AND (adjustment_case_code.name LIKE '%${data.keyword}%')`}
        `),
            ]);
        }
    }
}
exports.default = AdjustmentCaseModel;
//# sourceMappingURL=adjustment-case.model.js.map