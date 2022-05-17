import { NextFunction, Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import roman from "./number_helper";

const prisma = new PrismaClient();

export const purchaseOrderNameHelper = async(req: Request, res: Response, next: NextFunction) => {
    const company_id: number = req.body.company_id;
    const company = await prisma.company.findUnique({
        where:{
            id: company_id
        }
    });

    let name = "";

    if(company == null){
        while(name == ""){
            const year = (new Date()).getFullYear().toString().substring(2, 3);
            const month = roman((new Date()).getMonth()).padStart(2, "0");
            const purchaseOrderName = `PO-PI-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}-${month}-${year}`;
    
            const count = await prisma.purchase_order_code.count({
                where:{
                    name: purchaseOrderName
                }
            });

            if(count == 0){
                name = purchaseOrderName;
                req.body.purchase_order_name = purchaseOrderName;
                break;
            }
        }
    } else {
        res.status(500).send("Company not found.");
    }
}