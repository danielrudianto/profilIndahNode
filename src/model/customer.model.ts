import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CustomerModel {
    id?: number;
    name: string;
    address: string;
    npwp: string | null;
    pic: string;
    phone_number: string;
    created_by: number;
    created_at: Date;

    constructor(name: string, address: string, npwp: string | null, pic: string, phone_number: string, created_by: number){
        this.name = name;
        this.address = address;
        this.npwp = npwp;
        this.pic = pic;
        this.phone_number = phone_number;
        this.created_by = created_by;
        this.created_at = new Date();
    }

    create(){
        return prisma.customer.create({
            data: {
                name: this.name,
                address: this.address,
                npwp: this.npwp,
                pic: this.pic,
                phone_number: this.phone_number,
                created_by: this.created_by,
                created_at: this.created_at
            }
        })
    }
}

export default CustomerModel;