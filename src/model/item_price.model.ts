import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ItemPriceModel {
    id?: number;
    price: number;
    discount: number;
    discount_project: number;
    item_id: number;
    created_by: number;
    created_at: Date;
    effective_date: Date;

    constructor(price: number, discount: number, discount_project: number, item_id: number, created_by: number, effective_date: Date | null = null){
        this.price = price;
        this.discount = discount;
        this.discount_project = discount_project;
        this.item_id = item_id;
        this.created_by = created_by;
        this.created_at = new Date();
        this.effective_date = (effective_date == null) ? new Date() : effective_date;
    }

    create(){
        return prisma.item_price.create({
            data: {
                item_id: this.item_id,
                price: this.price,
                discount: this.discount,
                discount_project: this.discount_project,
                created_by: this.created_by,
                created_at: this.created_at,
                effective_date: this.effective_date
            },
            select: {
                price: true,
                discount: true,
                discount_project: true,
                is_delete: true,
                user: {
                    select: {
                        name: true
                    }
                }
            }
        })
    }
}

export default ItemPriceModel;