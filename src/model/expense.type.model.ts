import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ExpenseTypeModel {
    id?: number;
    name: string;
    description: string;
    parent_id: number | null;
    created_by: number;
    created_at: Date;

    constructor(name: string, description: string, parent_id: number | null, created_by: number, id: number | null = null){
        this.name = name;
        this.description = description;
        this.parent_id = parent_id;
        this.created_by = created_by;
        this.created_at = new Date()
    }

    create(){
        return prisma.expense_type.create({
            data: {
                name: this.name,
                description: this.description,
                created_by: this.created_by,
                created_at: this.created_at,
                parent_id: this.parent_id
            }
        });
    }

    static fetchAutocomplete(keyword: string, parent_id: number | null){
        if(parent_id == null){
            if(keyword == ""){
                return prisma.expense_type.findMany({
                    where:{
                        parent_id: null
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true
                    },
                    orderBy: {
                        name: 'asc'
                    },
                    take: 5,
                    skip: 0
                })
            } else {
                return prisma.expense_type.findMany({
                    where:{
                        OR: [
                            {
                                name: {
                                    contains: keyword
                                },
                            },
                            {
                                description: {
                                    contains: keyword
                                }
                            }
                        ],
                        parent_id: null
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true
                    },
                    orderBy: {
                        name: 'asc'
                    },
                    take: 5,
                    skip: 0
                })
            }
        } else {
            if(keyword == ""){
                return prisma.expense_type.findMany({
                    where:{
                        parent_id: parent_id,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true
                    },
                    orderBy: {
                        name: 'asc'
                    },
                    take: 5,
                    skip: 0
                })
            } else {
                return prisma.expense_type.findMany({
                    where:{
                        parent_id: parent_id,
                        OR: [
                            {
                                name: {
                                    contains: keyword
                                },
                            },
                            {
                                description: {
                                    contains: keyword
                                }
                            }
                        ],
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true
                    },
                    orderBy: {
                        name: 'asc'
                    },
                    take: 5,
                    skip: 0
                })
            }
        }
    }

    static fetch(parent_id: number | null){
        return prisma.expense_type.findMany({
            where:{
                is_delete: false,
                parent_id: parent_id
            },
            select: {
                id: true,
                name: true,
                description: true,
            }
        })
    }

    static countChild(){
        return prisma.expense_type.groupBy({
            by: ["parent_id"],
            where:{
                parent_id: {
                    not: null
                },
                is_delete: false
            },
            _count: true
        });
    }
}

export default ExpenseTypeModel;