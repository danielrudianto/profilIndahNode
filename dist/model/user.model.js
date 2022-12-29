import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
class UserModel {
    constructor(name, nik, username, password, created_by) {
        this.name = name;
        this.nik = nik;
        this.password = password;
        this.username = username;
        this.created_by = created_by;
        this.created_at = new Date();
    }
    create() {
        return prisma.user.create({
            data: {
                name: this.name,
                username: this.username,
                password: this.password,
                nik: this.nik,
                created_by: this.created_by,
            },
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
            },
        });
    }
    static countDuplicate(username, nik) {
        return prisma.user.count({
            where: {
                OR: [
                    {
                        username: username,
                    },
                    {
                        nik: nik,
                    },
                ],
            },
        });
    }
    static fetch(keyword, offset, limit) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.user.findMany({
                    where: {
                        is_active: true,
                    },
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        user_department: {
                            select: {
                                role: true,
                            },
                        },
                        nik: true,
                    },
                    take: limit,
                    skip: offset,
                }),
                prisma.user.count({
                    where: {
                        is_active: true,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.user.findMany({
                    where: {
                        is_active: true,
                        OR: [
                            {
                                name: {
                                    contains: keyword,
                                },
                            },
                            {
                                username: {
                                    contains: keyword,
                                },
                            },
                            {
                                nik: {
                                    contains: keyword,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        user_department: {
                            select: {
                                role: true,
                            },
                        },
                        nik: true,
                    },
                    take: limit,
                    skip: offset,
                }),
                prisma.user.count({
                    where: {
                        is_active: true,
                        OR: [
                            {
                                name: {
                                    contains: keyword,
                                },
                            },
                            {
                                username: {
                                    contains: keyword,
                                },
                            },
                            {
                                nik: {
                                    contains: keyword,
                                },
                            },
                        ],
                    },
                }),
            ]);
        }
    }
    static fetchById(id) {
        return prisma.user.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                name: true,
                username: true,
                nik: true,
                user_department: {
                    select: {
                        role: true,
                    },
                },
                is_active: true,
            },
        });
    }
    static fetchByUsername(username) {
        return prisma.user.findUnique({
            select: {
                id: true,
                name: true,
                password: true,
                is_active: true,
                user_department: {
                    select: {
                        role: true,
                    },
                },
            },
            where: {
                username: username,
            },
        });
    }
    static update(id, name, password, created_by) {
        if (password == null) {
            return prisma.user.update({
                where: {
                    id: id,
                },
                data: {
                    name: name,
                    updated_by: created_by,
                    updated_at: new Date(),
                },
            });
        }
        else {
            return prisma.user.update({
                where: {
                    id: id,
                },
                data: {
                    name: name,
                    password: password,
                    updated_by: created_by,
                    updated_at: new Date(),
                },
            });
        }
    }
    static delete(user_id, status, created_by) {
        return prisma.user.update({
            where: {
                id: user_id,
            },
            data: {
                is_active: status,
                deleted_at: new Date(),
                deleted_by: created_by,
            },
            select: {
                id: true,
                name: true,
                username: true,
                nik: true,
                user_userTouser_deleted_by: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
            },
        });
    }
    static updatePassword(password, userId) {
        return prisma.user.update({
            data: {
                password: password,
            },
            where: {
                id: userId,
            },
        });
    }
}
UserModel.roles = [
    {
        id: 1,
        name: "Pembelian",
        available: true,
    },
    {
        id: 2,
        name: "Penjualan",
        available: true,
    },
    {
        id: 3,
        name: "Akuntansi",
        available: false,
    },
    {
        id: 4,
        name: "Keuangan",
        available: false,
    },
    {
        id: 5,
        name: "Administrator",
        available: true,
    },
];
export default UserModel;
