import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();

router.post("/", (req, res, next) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt = req.body.good_receipt as any[];
    prisma.good_receipt_code.create({
        data: {
            name: name,
            date: date,
            company_id: company_id,
            supplier_id: supplier_id,
            created_by: req.body.userId,
        }
    }).then(result => {
        const good_receipt_items: any[] = [];
        const transactions: any[] = [];
        good_receipt.forEach(x => {
            good_receipt_items.push({
                item_id: x.item_id,
                price: 0,
                quantity: x.quantity,
                good_receipt_code_id: result.id,
            })

            transactions.push(prisma.item.findUnique({
                where:{
                    id: x.item_id
                },
                select: {
                    item_price_purchase: {
                        select: {
                            price: true
                        },
                        where: {
                            is_delete: false
                        },
                        orderBy: {
                            id: "desc"
                        },
                        take: 1,
                        skip: 0
                    },
                    id: true
                }
            }))
        });

        prisma.$transaction(transactions).then(rs => {
            rs.forEach((r, index) => {
                const price = (r.item_price_purchase.length == 0) ? 0 : parseFloat(r.item_price_purchase[0].price);
                good_receipt_items[index].price = price;
            });
        });

        prisma.$transaction([
            prisma.good_receipt.createMany({
                data: good_receipt_items
            }),
            prisma.purchase_invoice.create({
                data: {
                    name: req.body.purchase_invoice.name,
                    date: date,
                    created_at: new Date(),
                    created_by: req.body.userId,
                    discount: req.body.discount,
                    good_receipt_code_id: result.id
                }
            })
        ]).then(good_receipt_items => {
            res.status(201).send({
                ...result,
                good_receipt: good_receipt_items
            })
        }).catch(error => {
            res.status(500).send(error);
        })
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/archives", (req, res, next) => {
    prisma.$queryRaw`SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year FROM good_receipt_code ORDER BY good_receipt_code.date ASC`.then(result => {
        prisma.$queryRaw`SELECT COUNT(good_receipt_code.id) AS count, YEAR(good_receipt_code.date) AS year FROM good_receipt_code GROUP BY YEAR(good_receipt_code.date)`.then(counts => {
            const response: any[] = [];
            (result as any[]).forEach(item => {
                response.push({
                    year: item.year,
                    count: (counts as any[]).filter(x => x.year == item.year)[0].count
                });
            })

            res.status(200).send(response);
        }).catch(error => {
            res.status(500).send(error);
        });
    }).catch(error => {
        res.status(500).send(error);
    });
})

router.get("/archives/:year", (req, res, next) => {

})

router.get("/archives/:year/:month", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!.toString());
    const offset = (page - 1) * limit;
})

export default router;