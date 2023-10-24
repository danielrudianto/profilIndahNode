"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const error_list_1 = __importDefault(require("../assets/error_list"));
const fetch_interface_1 = require("../interface/fetch.interface");
const prisma = new client_1.PrismaClient();
class SupplierModel {
    /**
     * Create a new supplier data
     * @param data
     * @returns
     */
    static create(data) {
        return prisma.supplier.create({
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
    }
    /**
     * Fetch supplier data
     * Can be used for autocomplete, and pagination
     * @param keyword
     * @param limit
     * @param offset
     * @param mode
     */
    static fetch(keyword, limit, offset, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mode == fetch_interface_1.fetchMode.Autocomplete) {
                return prisma.supplier.findMany({
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
                    },
                    orderBy: {
                        name: "asc",
                    },
                    take: 5,
                    skip: 0,
                });
            }
            else if (mode == fetch_interface_1.fetchMode.Pagination) {
                const result = yield prisma.$transaction([
                    prisma.$queryRawUnsafe(`
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
          AND supplier.name LIKE '%${keyword}%'
          ORDER BY name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
                    prisma.supplier.count({
                        where: {
                            is_delete: false,
                            name: {
                                contains: keyword,
                            },
                        },
                    }),
                ]);
                return {
                    data: result[0].map((x) => {
                        return Object.assign(Object.assign({}, x), { can_delete: x.count == 0, count: undefined });
                    }),
                    count: result[1],
                };
            }
        });
    }
    /**
     * Update supplier data
     * @param data
     * @returns The updated supplier data
     */
    static update(data) {
        return prisma.supplier.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                address: data.address,
                npwp: data.npwp,
            },
        });
    }
    /**
     * Fetch supplier data by ID
     * @param id
     * @returns
     */
    static fetchByID(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supplier = yield prisma.$queryRaw `
        SELECT supplier.*, COALESCE(supplierCount.count, 0) AS count
        FROM supplier
        LEFT JOIN (
          SELECT COUNT(good_receipt_code.id) AS count, supplier_id
          FROM good_receipt_code
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE good_receipt_code.is_delete = 0
          AND good_receipt_code.supplier_id = ${id}
        ) supplierCount
        ON supplier.id = supplierCount.supplier_id
        WHERE id = ${id}
      `;
                if (supplier.length == 0) {
                    throw Error(error_list_1.default["Not found"]);
                }
                return Object.assign(Object.assign({}, supplier[0]), { can_delete: supplier[0].count == 0, count: undefined });
            }
            catch (error) {
                console.error(`[error]: Error on fetching supplier ${error}`);
                throw Error(error_list_1.default["Internal server error"]);
            }
        });
    }
    /**
     * Delete supplier by ID
     * @param id
     * @param deleted_by
     * @returns
     */
    static deleteByID(id, deleted_by) {
        return prisma.supplier.update({
            data: {
                deleted_at: new Date(),
                is_delete: true,
                deleted_by: deleted_by,
            },
            where: {
                id: id,
            },
        });
    }
}
exports.default = SupplierModel;
//# sourceMappingURL=supplier.model.js.map