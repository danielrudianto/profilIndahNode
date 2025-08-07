"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjustmentCaseRepository = void 0;
const adjustment_case_model_1 = __importDefault(require("../model/adjustment-case.model"));
class AdjustmentCaseRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.adjustment_case_code.create({
                data: {
                    name: data.name,
                    date: data.date,
                    created_by: data.created_by,
                    created_at: data.created_at,
                    is_confirm: false,
                    confirmed_at: null,
                    confirmed_by: null,
                    company_id: data.company_id,
                    adjustment_case: {
                        createMany: {
                            data: data.adjustment_case.map((x) => {
                                return {
                                    product_id: x.product_id,
                                    product_unit_id: x.product_unit_id,
                                    quantity: x.quantity,
                                };
                            }),
                        },
                    },
                },
                include: {
                    adjustment_case: {
                        include: {
                            product: true,
                            product_unit: true,
                        },
                    },
                },
            });
            return adjustment_case_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while creating adjustment case: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async delete(id, userID) {
        try {
            const result = await this.prisma.adjustment_case_code.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    is_confirm: false,
                    confirmed_at: new Date(),
                    confirmed_by: userID,
                },
            });
            return adjustment_case_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while deleting adjustment case: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByID(id) {
        try {
            const result = await this.prisma.adjustment_case_code.findUnique({
                where: {
                    id: id,
                },
                include: {
                    adjustment_case: {
                        include: {
                            product: true,
                            product_unit: true,
                        },
                    },
                    company: true,
                    user_adjustment_case_code_created_byTouser: {
                        include: {
                            user_avatar: true,
                        },
                    },
                },
            });
            if (!result) {
                return null;
            }
            return adjustment_case_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while fetching adjustment case by ID: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchUnconfirmed(data) {
        try {
            const [result, count] = await Promise.all([
                this.prisma.adjustment_case_code.findMany({
                    where: {
                        is_confirm: false,
                        is_delete: false,
                    },
                    orderBy: {
                        date: "asc",
                    },
                    include: {
                        user_adjustment_case_code_created_byTouser: {
                            include: {
                                user_avatar: true,
                            },
                        },
                        company: true,
                    },
                    skip: (data.page - 1) * data.pageSize,
                    take: data.pageSize,
                }),
                this.prisma.adjustment_case_code.count({
                    where: {
                        is_confirm: false,
                        is_delete: false,
                    },
                }),
            ]);
            return {
                data: result.map((x) => adjustment_case_model_1.default.fromMap(x)),
                count: count,
            };
        }
        catch (error) {
            console.error(`[error]: Error while fetching unconfirmed adjustment cases: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchAnnualArchives() {
        try {
            const result = await this.prisma.$queryRaw `
        SELECT 
          EXTRACT(YEAR FROM date) AS year,
          EXTRACT(MONTH FROM date) AS month,
          COUNT(id) AS count
        FROM adjustment_case_code
        GROUP BY month, year
        ORDER BY year DESC, month DESC;
      `;
            return result.map((x) => {
                return {
                    year: Number(x.year),
                    month: Number(x.month),
                    count: Number(x.count),
                };
            });
        }
        catch (error) {
            console.error(`[error]: Error while fetching annual archives: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchArchives(data) {
        let statusFilter;
        if ((!data.isConfirm && !data.isReject && !data.isPending) ||
            (data.isConfirm && data.isReject && data.isPending)) {
            // All selected or none selected
            statusFilter = {
                OR: [
                    {
                        AND: [
                            {
                                is_confirm: true,
                            },
                            {
                                is_delete: false,
                            },
                        ],
                    },
                    {
                        AND: [
                            {
                                is_confirm: false,
                            },
                            {
                                is_delete: true,
                            },
                        ],
                    },
                    {
                        AND: [
                            {
                                is_confirm: false,
                            },
                            {
                                is_delete: false,
                            },
                        ],
                    },
                ],
            };
        }
        else {
            // At least one of the flags is selected
            const filters = [];
            if (data.isConfirm) {
                filters.push({
                    AND: [
                        {
                            is_confirm: true,
                        },
                        {
                            is_delete: false,
                        },
                    ],
                });
            }
            if (data.isPending) {
                filters.push({
                    AND: [
                        {
                            is_confirm: false,
                        },
                        {
                            is_delete: false,
                        },
                    ],
                });
            }
            if (data.isReject) {
                filters.push({
                    AND: [
                        {
                            is_confirm: false,
                        },
                        {
                            is_delete: true,
                        },
                    ],
                });
            }
            // Combine filters with OR
            statusFilter = {
                OR: filters,
            };
        }
        let typeFilter = {};
        if ((!data.isLost && !data.isFound) || (data.isLost && data.isFound)) {
            typeFilter = {
                OR: [
                    {
                        company_id: null,
                    },
                    {
                        company_id: {
                            not: null,
                        },
                    },
                ],
            };
        }
        else if (data.isLost) {
            statusFilter = {
                company_id: null,
            };
        }
        else {
            statusFilter = {
                company_id: {
                    not: null,
                },
            };
        }
        let orderBy;
        if (data.sortBy == "date") {
            orderBy = {
                date: data.sortDirection,
            };
        }
        else if (data.sortBy == "name") {
            orderBy = {
                name: data.sortDirection,
            };
        }
        else if (data.sortBy == "type") {
            orderBy = {
                company: {
                    name: data.sortDirection,
                },
            };
        }
        try {
            const [result, count] = await this.prisma.$transaction([
                this.prisma.adjustment_case_code.findMany({
                    where: {
                        AND: [
                            {
                                name: {
                                    contains: data.keyword,
                                },
                            },
                            {
                                date: {
                                    gte: new Date(data.year, data.month - 1, 1),
                                },
                            },
                            {
                                date: {
                                    lte: new Date(data.year, data.month, 0),
                                },
                            },
                            statusFilter,
                            typeFilter,
                        ],
                    },
                    include: {
                        company: true,
                    },
                    take: data.pageSize,
                    skip: (data.page - 1) * data.pageSize,
                    orderBy: orderBy,
                }),
                this.prisma.adjustment_case_code.count({
                    where: {
                        OR: [
                            {
                                name: {
                                    contains: data.keyword,
                                },
                            },
                            {
                                company: {
                                    name: {
                                        contains: data.keyword,
                                    },
                                },
                            },
                        ],
                        AND: [
                            {
                                date: {
                                    gte: new Date(data.year, data.month - 1, 1),
                                },
                            },
                            {
                                date: {
                                    lte: new Date(data.year, data.month, 0),
                                },
                            },
                        ],
                    },
                }),
            ]);
            return {
                data: result,
                count: count,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async approve(id, userID) {
        try {
            const result = await this.prisma.adjustment_case_code.update({
                where: {
                    id: id,
                },
                data: {
                    is_confirm: true,
                    confirmed_at: new Date(),
                    confirmed_by: userID,
                },
                include: {
                    adjustment_case: {
                        include: {
                            product: true,
                            product_unit: true,
                        },
                    },
                },
            });
            return adjustment_case_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while approving adjustment case: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async reject(id, userID) {
        try {
            const result = await this.prisma.adjustment_case_code.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    is_confirm: false,
                    confirmed_at: null,
                    confirmed_by: null,
                },
            });
            return adjustment_case_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while rejecting adjustment case: ${error}`);
            throw new Error("Internal server error");
        }
    }
}
exports.AdjustmentCaseRepository = AdjustmentCaseRepository;
//# sourceMappingURL=adjustment-case.repository.js.map