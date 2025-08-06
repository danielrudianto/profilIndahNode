"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_model_1 = require("../model/user.model");
const user_role_model_1 = require("../model/user_role.model");
const product_type_model_1 = require("../model/product-type.model");
class UserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        const userData = {
            name: data.name,
            username: data.username,
            password: data.password,
            nik: data.nik,
            created_by: data.created_by,
            role: data.role,
        };
        if (data.user_sales !== undefined) {
            userData.user_sales = {
                createMany: {
                    data: data.user_sales.map((x) => ({
                        product_type_id: x.product_type_id,
                    })),
                },
            };
        }
        return this.prisma.user.create({
            data: userData,
            select: {
                id: true,
                name: true,
                username: true,
                nik: true,
                user: {
                    select: {
                        name: true,
                    },
                },
                user_sales: data.user_sales !== undefined
                    ? {
                        select: {
                            product_type: true,
                        },
                    }
                    : undefined,
            },
        });
    }
    validateCreate(data) {
        const errors = [];
        if (!data.name || data.name.trim() === "") {
            errors.push("Name is required.");
        }
        if (!data.username || data.username.trim() === "") {
            errors.push("Username is required.");
        }
        if (!data.password || data.password.trim() === "") {
            errors.push("Password is required.");
        }
        if (!data.nik || data.nik.trim() === "") {
            errors.push("NIK is required.");
        }
        if (!data.role || isNaN(data.role)) {
            errors.push("Valid role ID is required.");
        }
        if (data.user_sales && !Array.isArray(data.user_sales)) {
            errors.push("User sales must be an array.");
        }
        return errors;
    }
    async update(data) {
        try {
            const user = await this.prisma.user.update({
                where: {
                    id: data.id,
                },
                data: {
                    name: data.name,
                    username: data.username,
                    nik: data.nik,
                    role: data.role,
                    updated_by: data.created_by,
                    updated_at: data.created_at,
                    user_sales: data.user_sales
                        ? {
                            deleteMany: {},
                            createMany: {
                                data: data.user_sales.map((x) => ({
                                    product_type_id: x.product_type_id,
                                })),
                            },
                        }
                        : undefined,
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    nik: true,
                    role: true,
                    created_by: true,
                    created_at: true,
                    is_active: true,
                    user_sales: {
                        select: {
                            product_type: true,
                        },
                    },
                },
            });
            return new user_model_1.UserModel({
                id: user.id,
                name: user.name,
                username: user.username,
                nik: user.nik,
                role: user.role,
                roleText: user_role_model_1.UserRoleModel.fromRoleID(user.role),
                // user_sales: user.user_sales.map((x) => ({
                //   item_type_id: x.item_type.id,
                //   item_type_name: x.item_type.name,
                // })),
                is_active: user.is_active,
                created_at: user.created_at,
                created_by: user.created_by, // Use the provided created_by
            });
        }
        catch (error) {
            console.error(`[error]: Error on updating user ${error}`);
            throw new Error("Internal server error");
        }
    }
    updatePassword(id, password) {
        return this.prisma.user.update({
            where: {
                id: id,
            },
            data: {
                password: password,
                updated_at: new Date(),
            },
            select: {
                id: true,
                name: true,
                username: true,
                nik: true,
            },
        });
    }
    async delete(id, userID) {
        try {
            const result = await this.prisma.user.update({
                where: {
                    id: id,
                },
                data: {
                    is_active: false,
                    updated_by: userID,
                    updated_at: new Date(),
                },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    nik: true,
                    role: true,
                    created_by: true,
                    created_at: true,
                    user_sales: {
                        select: {
                            product_type: true,
                        },
                    },
                },
            });
            return new user_model_1.UserModel({
                id: result.id,
                name: result.name,
                username: result.username,
                nik: result.nik,
                role: result.role,
                roleText: user_role_model_1.UserRoleModel.fromRoleID(result.role),
                // user_sales: result.user_sales.map((x) => ({
                //   item_type_id: x.item_type.id,
                //   item_type_name: x.item_type.name,
                // })),
                is_active: false,
                created_at: result.created_at,
                created_by: result.created_by, // Use the provided created_by
            });
        }
        catch (error) {
            console.error(`[error]: Error on deleting user ${error}`);
            throw new Error("Internal server error");
        }
    }
    async check(username, nik) {
        const count = await this.prisma.user.count({
            where: {
                OR: [{ username: username }, { nik: nik }],
            },
        });
        return count;
    }
    async fetchByUsername(username) {
        try {
            const result = await this.prisma.user.findUnique({
                where: { username: username },
                include: {
                    user_sales: {
                        select: {
                            product_type: true,
                        },
                    },
                    user_avatar: true,
                },
            });
            if (!result) {
                return null;
            }
            return user_model_1.UserModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error fetching user by username ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByID(id) {
        const result = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                username: true,
                is_active: true,
                nik: true,
                role: true,
                user_sales: {
                    include: {
                        product_type: true,
                    },
                },
                created_at: true,
                created_by: true,
            },
        });
        if (!result) {
            return null;
        }
        return new user_model_1.UserModel({
            id: result.id,
            name: result.name,
            username: result.username,
            nik: result.nik,
            role: result.role,
            roleText: user_role_model_1.UserRoleModel.fromRoleID(result.role),
            user_sales: result.user_sales.map((x) => ({
                product_type_id: x.product_type_id,
                product_type: product_type_model_1.ProductTypeViewModel.fromMap(x.product_type),
            })),
            is_active: result.is_active,
            created_at: result.created_at,
            created_by: result.created_by,
        });
    }
    async fetch(data) {
        const { page, keyword, pageSize } = data;
        const baseWhere = { is_active: true };
        const searchConditions = keyword
            ? {
                OR: [
                    { name: { contains: keyword } },
                    { username: { contains: keyword } },
                    { nik: { contains: keyword } },
                ],
            }
            : {};
        const whereClause = keyword
            ? Object.assign(Object.assign({}, baseWhere), searchConditions) : baseWhere;
        const [result, count] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where: whereClause,
                orderBy: { name: "asc" },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    role: true,
                    nik: true,
                },
                take: pageSize,
                skip: (page - 1) * pageSize,
            }),
            this.prisma.user.count({ where: whereClause }),
        ]);
        return {
            data: result.map((x) => {
                return new user_model_1.UserModel({
                    id: x.id,
                    name: x.name,
                    username: x.username,
                    role: x.role,
                    nik: x.nik,
                    roleText: user_role_model_1.UserRoleModel.fromRoleID(x.role),
                    user_sales: [],
                    is_active: true,
                    created_at: new Date(),
                    created_by: 0, // Default value, adjust as necessary
                });
            }),
            count: count,
        };
    }
    toggleActive(id, is_active) {
        return this.prisma.user.update({
            where: {
                id: id,
            },
            data: {
                is_active: is_active,
                updated_at: new Date(),
            },
        });
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.repository.js.map