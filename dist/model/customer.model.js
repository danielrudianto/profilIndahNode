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
class CustomerModel {
    static create(data) {
        return prisma.customer.create({
            data: {
                name: data.name,
                address: data.address,
                npwp: data.npwp,
                pic: data.pic,
                phone_number: data.phone_number,
                created_by: data.created_by,
                created_at: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    static update(data) {
        return prisma.customer.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                address: data.address,
                npwp: data.npwp,
                pic: data.pic,
                phone_number: data.phone_number,
                updated_by: data.created_by,
                updated_at: new Date(),
            },
            include: {
                user_customer_updated_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    static delete(id, created_by) {
        return prisma.customer.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deleted_by: created_by,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                user_customer_deleted_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    static fetch(keyword, offset, limit, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (mode == fetch_interface_1.fetchMode.Pagination) {
                const result = yield prisma.$transaction([
                    prisma.$queryRawUnsafe(`
          SELECT customer.id, customer.name, customer.address, 
          customer.pic, customer.npwp, customer.phone_number, 
          customer.created_at, customer.is_delete,
          IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
          FROM customer
          LEFT JOIN (
            SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
            FROM bill_code
            WHERE bill_code.is_delete = 0
            GROUP BY bill_code.customer_id
          ) itemCount
          ON customer.id = itemCount.customer_id
          WHERE customer.is_delete = 0
          AND (
            customer.name LIKE '%${keyword}%'
            OR customer.address LIKE '%${keyword}%'
            OR customer.npwp LIKE '%${keyword}%'
            OR customer.pic LIKE '%${keyword}%'
            OR customer.phone_number LIKE '%${keyword}%'
          )
          ORDER BY customer.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
                    prisma.customer.count({
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
                                {
                                    npwp: {
                                        contains: keyword,
                                    },
                                },
                                {
                                    pic: {
                                        contains: keyword,
                                    },
                                },
                                {
                                    phone_number: {
                                        contains: keyword,
                                    },
                                },
                            ],
                        },
                    }),
                ]);
                if (!result[0]) {
                    throw Error(error_list_1.default["Not found"]);
                }
                return {
                    data: result[0].map((x) => {
                        return Object.assign(Object.assign({}, x), { can_delete: x.can_delete == "1" ? true : false });
                    }),
                    count: result[1],
                };
            }
            else if (mode == fetch_interface_1.fetchMode.Autocomplete) {
                return prisma.customer.findMany({
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
                            {
                                npwp: {
                                    contains: keyword,
                                },
                            },
                            {
                                pic: {
                                    contains: keyword,
                                },
                            },
                            {
                                phone_number: {
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
            else if (mode == fetch_interface_1.fetchMode.All) {
                return prisma.customer.findMany({
                    where: {
                        is_delete: false,
                    },
                });
            }
        });
    }
    /**
     * Fetch customer by ID
     * @param id
     * @returns
     */
    static fetchByID(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const customers = yield prisma.$queryRaw `
      SELECT customer.id, customer.name, customer.address, 
      customer.pic, customer.npwp, customer.phone_number, 
      IF(COALESCE(itemCount.count, 0) = 0, '1', '0') AS can_delete
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
        AND bill_code.customer_id = ${id}
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE customer.id = ${id}
    `;
            if (!customers) {
                throw Error(error_list_1.default["Not found"]);
            }
            if (customers.length == 0) {
                throw Error(error_list_1.default["Not found"]);
            }
            return Object.assign(Object.assign({}, customers[0]), { can_delete: customers[0].can_delete == "1" ? true : false });
        });
    }
    /**
     * Fetch customer by IDs
     * @param id
     * @returns
     */
    static fetchByIDs(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ids.length == 0)
                return Promise.resolve([]);
            return prisma.$queryRawUnsafe(`
      SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, '1', '0') AS can_delete
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE customer.id IN (${ids.join(",")})
    `);
        });
    }
    static fetchBySales(id) {
        return prisma.customer.count({
            where: {
                is_delete: false,
                created_by: id,
            },
        });
    }
}
exports.default = CustomerModel;
//# sourceMappingURL=customer.model.js.map