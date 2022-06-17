import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class UserModel {
    id?: number;
    name: string;
    nik: string;
    username: string;
    password: string;
    created_by: number;
    created_at: Date;

    static roles = [
        {
            id: 1,
            name: "Pembelian",
            available: true
        }, 
        {
            id: 2,
            name: "Penjualan",
            available: false
        }, 
        {
            id: 3,
            name: "Akuntansi",
            available: false
        },
        {
            id: 4,
            name: "Keuangan",
            available: false
        }, 
        {
            id: 5,
            name: "Administrator",
            available: true
        }
    ];

    constructor(name: string, nik: string, username: string, password: string, created_by: number){
        this.name = name;
        this.nik = nik;
        this.password = password;
        this.username = username;
        this.created_by = created_by;
        this.created_at = new Date();
    }

    create(){
        return prisma.user.create({
            data: {
                name: this.name,
                username: this.username,
                password: this.password,
                nik: this.nik,
                created_by: this.created_by
            }
        })
    }

    static countDuplicate(username: string, nik: string){
        return prisma.user.count({
            where:{
                OR: [
                    {
                        username: username
                    },
                    {
                        nik: nik
                    }
                ]
            }
        });
    }

    static find(keyword: string, offset: number, limit: number){
        if(keyword == ""){
            return prisma.$transaction([
                prisma.user.findMany({
                    where: {
                        is_active: true
                    },
                    orderBy: {
                        name: "asc"
                    },
                    select: {
                        id: true,
                        username: true,
                        user_department: {
                            select: {
                                role: true
                            }
                        },
                        nik: true
                    },
                    take: limit,
                    skip: offset
                }),
                prisma.user.count({
                    where: {
                        is_active: true
                    }
                })
            ])
        } else {
            return prisma.$transaction([
                prisma.user.findMany({
                    where: {
                        is_active: true,
                        OR: [
                            {
                                name: {
                                    contains: keyword
                                }
                            },
                            {
                                username: {
                                    contains: keyword
                                }
                            },
                            {
                                nik: {
                                    contains: keyword
                                }
                            }
                        ]
                    },
                    orderBy: {
                        name: "asc"
                    },
                    select: {
                        id: true,
                        username: true,
                        user_department: {
                            select: {
                                role: true
                            }
                        },
                        nik: true
                    },
                    take: limit,
                    skip: offset
                }),
                prisma.user.count({
                    where: {
                        is_active: true,
                        OR: [
                            {
                                name: {
                                    contains: keyword
                                }
                            },
                            {
                                username: {
                                    contains: keyword
                                }
                            },
                            {
                                nik: {
                                    contains: keyword
                                }
                            }
                        ]
                    }
                })
            ])
        }
    }

    static getById(id: number){
        return prisma.user.findUnique({
            where:{
                id: id
            },
            select: {
                id: true,
                name: true,
                username: true,
                nik: true,
                user_department: {
                    select: {
                        role: true
                    }
                },
                is_active: true
            }
        });
    }

    static update(id: number, name: string, password: string){
        return prisma.user.update({
            where:{
                id: id
            },
            data: {
                name: name,
                password: password
            }
        })
    }

    static toggleActive(user_id: number, status: boolean){
        return prisma.user.update({
            where:{
                id: user_id
            },
            data: {
                is_active: status
            }
        });
    }
}

export default UserModel;