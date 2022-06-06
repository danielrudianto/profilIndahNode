import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();

router.get("/:id", (req, res, next) => {
    const id = parseInt(req.params.id);
    prisma.good_receipt_code.findUnique({
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
                    name: true,
                    address: true,
                    npwp: true
                }
            },
            supplier: {
                select: {
                    name: true,
                    address: true,
                    npwp: true
                }
            },
            good_receipt: {
                select: {
                    item: {
                        select: {
                            reference: true,
                            description: true
                        }
                    },
                    quantity: true,
                    price: true
                }
            },
            purchase_invoice: {
                select: {
                    name: true,
                    date: true
                }
            }
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
});

export default router;