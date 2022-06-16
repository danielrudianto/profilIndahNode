import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class BrandModel {
    id?: number;
    name: string;
    created_by: number;
    created_at?: Date;

    constructor(name: string, created_by: number){
        this.name = name;
        this.created_by = created_by;
        this.created_at = new Date();
    }

    create(){
        return prisma.item_brand.create({
            data: {
                name: this.name,
                created_by: this.created_by,
                created_at: this.created_at
            }
        });
    }

    static getByName(name: string){
        return prisma.item_brand.findUnique({
            where:{
                name: name
            }
        });
    }
}