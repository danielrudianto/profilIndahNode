import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ItemUnitModel {
    id: number | null;
    item_id: number;
    unit: string;
    conversion: number;
    created_by?: number;
    created_at?: Date;
    is_delete: boolean;
    deleted_by: number | null;
    deleted_at: number | null;

    constructor(item_id: number, unit: string, conversion: number, created_by: number, id: number | null = null){
        this.id = id;
        this.item_id = item_id;
        this.unit = unit;
        this.conversion = conversion;
        this.created_by = created_by;
        this.created_at = new Date();
        this.is_delete = false;
        this.deleted_by = null;
        this.deleted_at = null;
    }

    static createMany(units: any[], item_id: number, created_by: number, created_at: Date = new Date()){
        return prisma.item_unit.createMany({
            data: units.map(x => {
                return {
                    ...x,
                    item_id: item_id,
                    created_by: created_by,
                    created_at: created_at
                }
            })
        })
    }

    static fetchByItemReference(reference: string){
        return prisma.item.findFirst({
            where:{
                reference: reference,
                is_delete: false
            },
            select: {
                reference: true,
                description: true,
                id: true,
                unit: true,
                item_brand: {
                    select: {
                        name: true
                    }
                },
                item_unit: {
                    select: {
                        conversion: true,
                        unit: true,
                        id: true
                    },
                    where: {
                        is_delete: false
                    }
                },
                is_delete: true
            }
        })
    }

    static updateMany(units: ItemUnitModel[]){
        const transaction: any[] = [];
        units.forEach(x => {
            transaction.push(prisma.item_unit.update({
                where:{
                    id: x.id!
                },
                data: {
                    is_delete: x.is_delete,
                    conversion: parseFloat(x.conversion.toString()),
                    unit: x.unit
                }
            }))
        });

        return prisma.$transaction(transaction);
    }
}

export default ItemUnitModel;