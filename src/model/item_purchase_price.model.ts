import { PrismaClient, PrismaPromise } from "@prisma/client";

const prisma = new PrismaClient();

class ItemPurchasePriceModel{
    id?: number;
    price: number;
    item_id: number;
    created_by: number;
    created_at: Date;

    constructor(price: number, item_id: number, created_by: number){
        this.item_id = item_id;
        this.price = price;
        this.created_by = created_by; 
        this.created_at = new Date();
    }

    create(){
        return prisma.item_price_purchase.create({
            data: {
                price: this.price,
                created_by: this.created_by,
                created_at: this.created_at,
                item_id: this.item_id
            },
            select: {
                price: true,
                is_delete: true,
                user: {
                    select: {
                        name: true
                    }
                }
            }
        });
    }

    static insertItems(item_price: any[]){
        const transactions: PrismaPromise<any>[] = [];
        item_price.forEach(x => {
            const item_id = x.item_id;
            transactions.push(prisma.item_price_purchase.updateMany({
                where:{
                    item_id: item_id
                },
                data: {
                    deleted_at: new Date(),
                    is_delete: true
                }
            }));
        });

        transactions.push(prisma.item_price_purchase.createMany({
            data: item_price
        }));

        return transactions;
    }

    static getByItemId(id: number){
        return prisma.item_price_purchase.findFirst({
            where:{
                item_id: id,
                is_delete: false
            }
        });
    }
}

export default ItemPurchasePriceModel;