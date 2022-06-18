import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ItemModel {
    id?: number;
    reference: string;
    description: string;
    brand_id: number;
    brand?: string;
    minimum_stock: number;
    created_by: number;
    created_at?: Date;

    constructor(reference: string, description: string, minimum_stock: number, brand_id: number, created_by: number){
        this.reference = reference;
        this.description = description;
        this.minimum_stock = minimum_stock;
        this.brand_id = brand_id;
        this.created_by = created_by;
        this.created_at = new Date();
    }

    create(){
        return prisma.item.create({
            data: {
                reference: this.reference,
                description: this.description,
                item_brand_id: this.brand_id,
                created_by: this.created_by,
                created_at: this.created_at,
                minimum_stock: this.minimum_stock
            }
        });
    }

    static getById(id: number, date: Date){
        return prisma.item.findUnique({
            where:{
                id: id
            },
            select: {
                id: true,
                reference: true,
                description: true,
                item_brand: {
                    select: {
                        name: true
                    }
                },
                item_price: {
                    select: {
                        price: true,
                        discount: true,
                        discount_project: true,
                        created_at: true,
                        effective_date: true
                    },
                    where: {
                        is_delete: false,
                        effective_date: {
                            lte: date
                        }
                    },
                    orderBy: [
                        {
                            effective_date: "desc",
                        },
                        {
                            id: "desc"
                        }
                    ],
                    take: 1,
                    skip: 0
                }
            },
        })
    }

    static getByReference(reference: string){
        return prisma.item.findFirst({
            where:{
                reference: reference,
                is_delete: false
            },
            select: {
                id: true,
                reference: true,
                description: true,
                user: {
                    select: {
                        name: true
                    }
                },
                is_delete: true,
                deleted_at: true,
                created_at: true
            }
        });
    }

    static getByReferences(references: string[]){
        return prisma.item.findMany({
            where:{
                reference: {
                    in: references
                },
                is_delete: false
            },
            select: {
                id: true,
                reference: true
            }
        });
    }

    static fetchAll(date: Date){
        return prisma.item.findMany({
            where:{
                is_delete: false   
            },
            select: {
                id: true,
                reference: true,
                description: true,
                item_brand: {
                    select: {
                        name: true
                    }
                },
                item_price: {
                    select: {
                        price: true,
                        discount: true,
                        discount_project: true
                    },
                    where:{
                        is_delete: false,
                        effective_date: {
                            lt: date
                        }
                    },
                    orderBy: {
                        effective_date: "desc"
                    },
                    take: 1,
                    skip: 0
                }
            },
            orderBy: {
                reference: "asc"
            }
        })
    }

    static checkDeleteByReference(reference: string){
        prisma.$transaction([
            prisma.bill.count({
                where: {
                    item: {
                        reference: reference
                    }
                }
            }),
            prisma.good_receipt.count({
                where:{
                    item: {
                        reference: reference
                    }
                }
            })
        ]).then(result => {
            const count_bill = result[0];
            const count_good_receipt = result[1];
            // If the item has not used in anywhere, you can delete it
            return ((count_bill + count_good_receipt) > 0) ? false : true;
        });

        return false;
    }

    static delete(id: number, deleted_by: number){
        prisma.item.update({
            where:{
                id: id
            },
            data: {
                is_delete: true,
                deleted_at: new Date(),
                deleted_by: deleted_by
            }
        }).then(() => {
            prisma.item.count({
                where:{
                    is_delete: false
                }
            }).then(count => {
                return count;
            }).catch(() => {
                return 0;
            })
        }).catch(() => {
            return 0;
        })
    }

    static count(){
        return prisma.item.count({
            where:{
                is_delete: false
            }
        });        
    }

    static countByBrandId(brand_id: number){
        return prisma.item.count({
            where:{
                item_brand_id: brand_id,
                is_delete: false
            }
        })
    }
}