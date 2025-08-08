"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierRepository = void 0;
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
class SupplierRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const result = await this.prisma.supplier.create({
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
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                created_at: true,
            },
        });
        return new supplier_model_1.default({
            id: result.id,
            name: result.name,
            address: result.address,
            npwp: result.npwp,
            created_by: result.user.id,
            created_at: result.created_at,
            can_delete: true,
        });
    }
    async update(data) {
        try {
            const result = await this.prisma.supplier.update({
                where: {
                    id: data.id,
                },
                data: {
                    name: data.name,
                    address: data.address,
                    npwp: data.npwp,
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    npwp: true,
                    created_by: true,
                    created_at: true,
                },
            });
            return new supplier_model_1.default({
                id: result.id,
                name: result.name,
                address: result.address,
                npwp: result.npwp || null,
                created_by: result.created_by,
                created_at: result.created_at,
            });
        }
        catch (error) {
            console.error(`[error]: Error on updating supplier ${error}`);
            throw new Error("Internal server error");
        }
    }
    async delete(id, userID) {
        try {
            const result = await this.prisma.supplier.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    deleted_by: userID,
                    deleted_at: new Date(),
                },
            });
            return new supplier_model_1.default({
                id: result.id,
                name: result.name,
                address: result.address,
                npwp: result.npwp || null,
                created_by: result.created_by,
                created_at: result.created_at,
                is_delete: true,
            });
        }
        catch (error) {
            console.error(`[error]: Error on deleting supplier ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetch(data) {
        try {
            const [result, count] = await this.prisma.$transaction([
                this.prisma.$queryRawUnsafe(`
              SELECT supplier.id, supplier.name, supplier.address, 
              supplier.npwp, user.name AS created_by_name, supplier.created_by,
              supplier.created_at, COALESCE(supplierCount.count, 0) AS count
              FROM supplier
              JOIN user ON supplier.created_by = user.id
              LEFT JOIN (
                SELECT COUNT(good_receipt_code.id) AS count, good_receipt_code.supplier_id
                FROM good_receipt_code
                WHERE is_delete = 0
                GROUP BY good_receipt_code.supplier_id
              ) supplierCount
              ON supplierCount.supplier_id = supplier.id
              WHERE supplier.is_delete = 0
              AND supplier.name LIKE '%${data.keyword}%'
              ORDER BY name ASC
              LIMIT ${data.pageSize}
              OFFSET ${(data.page - 1) * data.pageSize}
            `),
                this.prisma.supplier.count({
                    where: {
                        is_delete: false,
                        name: {
                            contains: data.keyword,
                        },
                    },
                }),
            ]);
            return {
                data: result.map((item) => supplier_model_1.default.fromMap(item)),
                count: count,
            };
        }
        catch (error) {
            console.error(`[error]: Error on fetching supplier data ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchAutocomplete(keyword) {
        try {
            const result = await this.prisma.supplier.findMany({
                where: {
                    is_delete: false,
                    name: {
                        contains: keyword,
                    },
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    npwp: true,
                    created_at: true,
                    created_by: true,
                },
                orderBy: {
                    name: "asc",
                },
                take: 5,
                skip: 0,
            });
            return result.map((item) => supplier_model_1.default.fromMap(item));
        }
        catch (error) {
            console.error(`[error]: Error on fetching autocomplete supplier data ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByID(id) {
        try {
            const supplier = await this.prisma.supplier.findUnique({
                where: {
                    id: id,
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    npwp: true,
                    created_by: true,
                    created_at: true,
                    is_delete: true,
                },
            });
            console.log(supplier);
            if (!supplier) {
                return null;
            }
            return new supplier_model_1.default({
                id: supplier.id,
                name: supplier.name,
                address: supplier.address,
                npwp: supplier.npwp || null,
                created_by: supplier.created_by,
                created_at: supplier.created_at,
                is_delete: supplier.is_delete,
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching supplier by ID ${error}`);
            throw error;
        }
    }
}
exports.SupplierRepository = SupplierRepository;
//# sourceMappingURL=supplier.repository.js.map