"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = void 0;
const customer_model_1 = require("../model/customer.model");
const user_model_1 = require("../model/user.model");
class CustomerRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.customer.create({
                data: {
                    name: data.name,
                    address: data.address,
                    npwp: data.npwp,
                    pic: data.pic,
                    phone_number: data.phone_number,
                    created_by: data.created_by,
                    created_at: data.created_at,
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            username: true,
                            role: true,
                        },
                    },
                },
            });
            return customer_model_1.CustomerModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error on creating customer: ${error}`);
            throw error;
        }
    }
    async update(data) {
        try {
            const result = await this.prisma.customer.update({
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
                    updated_at: data.created_at,
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            username: true,
                            role: true,
                        },
                    },
                },
            });
            return customer_model_1.CustomerModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error on updating customer: ${error}`);
            throw error;
        }
    }
    async delete(id, userID) {
        try {
            const result = await this.prisma.customer.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    deleted_by: userID,
                    deleted_at: new Date(),
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            username: true,
                            role: true,
                        },
                    },
                },
            });
            return new customer_model_1.CustomerModel({
                id: result.id,
                name: result.name,
                address: result.address,
                npwp: result.npwp,
                pic: result.pic,
                phone_number: result.phone_number,
                created_by: result.created_by,
                created_at: result.created_at,
                user: user_model_1.UserViewModel.fromMap(result.user),
                is_delete: result.is_delete,
                deleted_at: result.deleted_at,
                deleted_by: result.deleted_by,
            });
        }
        catch (error) {
            console.error(`[error]: Error on deleting customer: ${error}`);
            throw error;
        }
    }
    async fetch(data) {
        const { keyword, pageSize, page } = data;
        // Prisma count query
        const countQuery = {
            where: {
                is_delete: false,
                OR: [
                    { name: { contains: keyword } },
                    { address: { contains: keyword } },
                    { npwp: { contains: keyword } },
                    { pic: { contains: keyword } },
                    { phone_number: { contains: keyword } },
                ],
            },
        };
        // Execute queries in a transaction
        try {
            const [result, count] = await this.prisma.$transaction([
                this.prisma.customer.findMany(Object.assign(Object.assign({}, countQuery), { take: pageSize, skip: (page - 1) * pageSize })),
                this.prisma.customer.count(countQuery),
            ]);
            return {
                data: result.map((x) => {
                    return new customer_model_1.CustomerModel({
                        id: x.id,
                        name: x.name,
                        address: x.address,
                        npwp: x.npwp,
                        pic: x.pic,
                        phone_number: x.phone_number,
                        created_at: x.created_at,
                        is_delete: x.is_delete,
                        created_by: x.created_by,
                    });
                }),
                count: count,
            };
        }
        catch (error) {
            console.error(`[error]: Error on fetching customer data: ${error}`);
            throw error;
        }
    }
    async fetchByID(id) {
        try {
            const customer = await this.prisma.$queryRaw `
        SELECT customer.id, customer.name, customer.address, 
        customer.pic, customer.npwp, customer.phone_number, 
        IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
          AND sales_invoice_code.customer_id = ${id}
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id = ${id}
      `;
            if (!customer) {
                return null;
            }
            if (customer.length == 0) {
                return null;
            }
            const customerData = customer[0];
            return new customer_model_1.CustomerModel({
                id: customerData.id,
                name: customerData.name,
                address: customerData.address,
                npwp: customerData.npwp,
                pic: customerData.pic,
                phone_number: customerData.phone_number,
                can_delete: customerData.can_delete == 1,
                is_delete: customerData.is_delete,
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching customer by ID: ${error}`);
            throw error;
        }
    }
    async fetchByIDs(ids) {
        if (ids.length === 0)
            return Promise.resolve([]);
        try {
            const result = await this.prisma.$queryRawUnsafe(`
        SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete,
        customer.name, customer.address, customer.npwp, customer.pic, customer.phone_number, customer.is_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id IN (${ids.join(",")})
      `);
            return result.map((item) => {
                return new customer_model_1.CustomerModel({
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    npwp: item.npwp,
                    pic: item.pic,
                    phone_number: item.phone_number,
                    can_delete: item.can_delete == 1,
                    is_delete: item.is_delete == 1,
                });
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching customers by IDs: ${error}`);
            throw error;
        }
    }
    async fetchAutocomplete(keyword) {
        try {
            const result = await this.prisma.customer.findMany({
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
                take: 5,
                skip: 0,
            });
            return result.map((item) => {
                return new customer_model_1.CustomerModel({
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    npwp: item.npwp,
                    pic: item.pic,
                    phone_number: item.phone_number,
                    created_at: item.created_at,
                    is_delete: item.is_delete,
                    created_by: item.created_by,
                });
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching customer autocomplete: ${error}`);
            throw error;
        }
    }
    async fetchSalesStatistics(userID) {
        try {
            const count = await this.prisma.customer.count({
                where: {
                    created_by: userID,
                },
            });
            return count;
        }
        catch (error) {
            console.error(`[error]: Error on fetching customer statistics: ${error}`);
            throw error;
        }
    }
    async fetchAll() {
        try {
            const result = await this.prisma.customer.findMany({
                where: {
                    is_delete: false,
                },
            });
            return result.map((item) => {
                return new customer_model_1.CustomerModel({
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    npwp: item.npwp,
                    pic: item.pic,
                    phone_number: item.phone_number,
                    created_at: item.created_at,
                    is_delete: item.is_delete,
                    created_by: item.created_by,
                });
            });
        }
        catch (error) {
            console.error(`[error]: Error on fetching all customers: ${error}`);
            throw error;
        }
    }
}
exports.CustomerRepository = CustomerRepository;
//# sourceMappingURL=customer.repository.js.map