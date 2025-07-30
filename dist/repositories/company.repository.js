"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyRepository = void 0;
const company_model_1 = require("../model/company.model");
const user_model_1 = require("../model/user.model");
class CompanyRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const company = await this.prisma.company.create({
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
                    created_at: true,
                },
            });
            return new company_model_1.CompanyModel({
                id: company.id,
                name: company.name,
                address: company.address,
                npwp: company.npwp,
                created_by: company.user.id,
                created_at: new Date(),
                can_delete: true,
            });
        }
        catch (error) {
            console.error(`[error]: Error on creating company ${error}`);
            throw new Error("Internal server error");
        }
    }
    async update(data) {
        try {
            const company = await this.prisma.company.update({
                where: {
                    id: data.id,
                },
                data: {
                    name: data.name,
                    address: data.address,
                    npwp: data.npwp,
                    updated_by: data.created_by,
                    updated_at: data.created_at,
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
                    created_at: true,
                },
            });
            return new company_model_1.CompanyModel({
                id: company.id,
                name: company.name,
                address: company.address,
                npwp: company.npwp || null,
                created_by: company.user.id,
                created_at: new Date(company.created_at),
            });
        }
        catch (error) {
            console.error(`[error]: Error on updating company ${error}`);
            throw new Error("Internal server error");
        }
    }
    async delete(id, userID) {
        const result = await this.prisma.company.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deleted_by: userID,
            },
            include: {
                user_company_deleted_byTouser: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        username: true,
                    },
                },
            },
        });
        return new company_model_1.CompanyModel({
            id: result.id,
            name: result.name,
            address: result.address,
            npwp: result.npwp || null,
            created_by: result.created_by,
            created_at: new Date(result.created_at),
            is_delete: result.is_delete,
            deleted_by: result.deleted_by,
            deleted_at: new Date(),
            user_company_deleted_byTouser: new user_model_1.UserViewModel({
                id: result.user_company_deleted_byTouser.id,
                name: result.user_company_deleted_byTouser.name,
                role: result.user_company_deleted_byTouser.role,
                username: result.user_company_deleted_byTouser.username,
            }),
        });
    }
    async fetch(data) {
        const [result, count] = await this.prisma.$transaction([
            this.prisma.$queryRawUnsafe(`
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
        AND (company.name LIKE '%${data.keyword}%' OR company.address LIKE '%${data.keyword}%')
        ORDER BY company.name ASC
        LIMIT ${data.pageSize}
        OFFSET ${(data.page - 1) * data.pageSize}
      `),
            this.prisma.company.count({
                where: {
                    is_delete: false,
                    OR: [
                        {
                            name: {
                                contains: data.keyword,
                            },
                        },
                        {
                            address: {
                                contains: data.keyword,
                            },
                        },
                    ],
                },
            }),
        ]);
        const companies = result.map((company) => new company_model_1.CompanyModel({
            id: company.id,
            name: company.name,
            address: company.address,
            npwp: company.npwp || null,
            created_by: company.created_by,
            created_at: new Date(company.created_at),
            is_delete: company.is_delete,
            can_delete: company.can_delete === "1",
        }));
        return {
            data: companies,
            count: count,
        };
    }
    async fetchAutocomplete(keyword) {
        const companies = await this.prisma.company.findMany({
            where: Object.assign({ is_delete: false }, (keyword && {
                OR: [
                    { name: { contains: keyword } },
                    { address: { contains: keyword } },
                ],
            })),
            orderBy: {
                name: "asc",
            },
            take: 5,
            skip: 0,
        });
        return companies.map((x) => {
            return new company_model_1.CompanyModel({
                id: x.id,
                name: x.name,
                address: x.address,
                npwp: x.npwp || null,
                created_by: x.created_by,
                created_at: new Date(x.created_at),
                is_delete: x.is_delete,
            });
        });
    }
    async fetchAll() {
        try {
            const companies = await this.prisma.company.findMany({
                orderBy: {
                    name: "asc",
                },
            });
            return companies.map((x) => {
                return new company_model_1.CompanyModel({
                    id: x.id,
                    name: x.name,
                    address: x.address,
                    npwp: x.npwp || null,
                    created_by: x.created_by,
                    created_at: new Date(x.created_at),
                    is_delete: x.is_delete,
                });
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching all companies ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByID(id) {
        const company = await this.prisma.$queryRaw `
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
    WHERE company.id = ${id}`;
        if (company.length === 0) {
            return null;
        }
        const companyData = company[0];
        return new company_model_1.CompanyModel({
            id: companyData.id,
            name: companyData.name,
            address: companyData.address,
            npwp: companyData.npwp || null,
            created_by: companyData.created_by,
            created_at: new Date(companyData.created_at),
            is_delete: companyData.is_delete,
            can_delete: companyData.can_delete === "1",
        });
    }
}
exports.CompanyRepository = CompanyRepository;
//# sourceMappingURL=company.repository.js.map