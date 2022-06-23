import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class GoodReceiptModel {
    id?: number;
    name: string;
    date: Date;
    created_by: number;
    created_at: Date;
    is_confirm: boolean = true;
    is_delete: boolean = false;
    confirmed_by: number;
    confirmed_at: Date;
    supplier_id: number;
    company_id: number;

    constructor(name: string, date: Date, created_by: number, supplier_id: number, company_id: number, id: number | null = null){
        if(id != null){
            this.id = id
        }

        this.name = name;
        this.date = date;
        this.created_by = created_by;
        this.created_at = new Date();
        this.confirmed_by = created_by;
        this.confirmed_at = new Date();
        this.supplier_id = supplier_id;
        this.company_id = company_id;
    }

    create(){
        return prisma.good_receipt_code.create({
            data: {
                name: this.name,
                date: this.date,
                created_by: this.created_by,
                created_at: this.created_at,
                confirmed_by: this.confirmed_by,
                confirmed_at: this.confirmed_at,
                supplier_id: this.supplier_id,
                company_id: this.company_id
            }
        });
    }

    static insertItems(items: any[]){
        return prisma.good_receipt.createMany({
            data: items
        });
    }

    static fetchById(id: number){
        return prisma.good_receipt_code.findUnique({
            where:{
                id: id
            },
            select:{
                name: true,
                date: true,
                user_good_receipt_code_created_byTouser: {
                    select: {
                        name: true
                    }
                },
                created_at: true,
                user_good_receipt_code_confirmed_byTouser: {
                    select: {
                        name: true
                    }
                },
                confirmed_at: true,
                is_confirm: true,
                is_delete: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true
                    }
                },
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true
                    }
                },
                good_receipt: {
                    select: {
                        id: true,
                        item: {
                            select: {
                                id: true,
                                reference: true,
                                description: true
                            }
                        },
                        quantity: true,
                    }
                },
                purchase_invoice: {
                    select: {
                        name: true,
                        date: true
                    }
                }
            }
        })
    }

    static countItemByReference(reference: string){
        return prisma.good_receipt.count({
            where:{
                item:{
                    reference: reference
                }
            }
        });
    }

    static fetchArchive(year: number, month: number, offset: number, limit: number){
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);
        
        return prisma.good_receipt_code.findMany({
            where: {
              AND: [
                {
                  date: {
                    gte: start_date,
                  },
                },
                {
                  date: {
                    lt: end_date,
                  },
                },
              ],
            },
            orderBy: {
              date: "asc",
            },
            take: limit,
            skip: offset,
            select: {
              name: true,
              id: true,
              supplier: {
                select: {
                  name: true,
                },
              },
              company: {
                select: {
                  name: true,
                },
              },
              date: true,
              user_good_receipt_code_created_byTouser: {
                select: {
                  name: true,
                },
              },
              created_at: true,
              is_delete: true,
              is_confirm: true,
            }
        });
    }

    static fetchArchiveYears(){
        return prisma.$queryRaw`SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year FROM good_receipt_code ORDER BY good_receipt_code.date ASC`;
    }

    static countArchiveByYear(){
        return prisma.$queryRaw`SELECT COUNT(good_receipt_code.id) AS count, YEAR(good_receipt_code.date) AS year FROM good_receipt_code GROUP BY YEAR(good_receipt_code.date)`;
    }

    static countArchiveByMonth(year: number){
        return prisma.$queryRaw`SELECT COUNT(good_receipt_code.id) AS count, MONTH(good_receipt_code.date) AS month FROM good_receipt_code WHERE YEAR(good_receipt_code.date) = ${year} GROUP BY MONTH(good_receipt_code.date)`
    }

    static countArchive(year: number, month: number){
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);

        return prisma.good_receipt_code.count({
            where: {
              AND: [
                {
                  date: {
                    gte: start_date,
                  },
                },
                {
                  date: {
                    lt: end_date,
                  },
                },
              ],
            },
          });
    }
}

export default GoodReceiptModel;