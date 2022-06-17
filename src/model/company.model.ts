import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CompanyModel {
    id?: number;
    name: string;
    address: string;
    npwp: string | null;
    created_by: number;
    created_at: Date;
    code_name: string;

    constructor(name: string, address: string, npwp: string | null, created_by: number, code_name: string, id: number | null = null){
        if(id != null){
            this.id = id;
        }

        this.name = name;
        this.address = address;
        this.npwp = npwp;
        this.created_by = created_by;
        this.created_at = new Date();
        this.code_name = code_name;
    }

    create(){
        return prisma.company.create({
            data: {
                name: this.name,
                address: this.address,
                npwp: this.npwp,
                created_by: this.created_by,
                created_at: this.created_at,
                code_name: this.code_name
            }
        });
    }

    update(){
        return prisma.company.update({
            where:{
                id: this.id
            },
            data: {
                name: this.name,
                address: this.address,
                npwp: this.npwp,
                code_name: this.code_name
            }
        });
    }

    static getById(id: number){
        return prisma.company.findUnique({
            where:{
                id: id
            }
        });
    }
}

export default CompanyModel;