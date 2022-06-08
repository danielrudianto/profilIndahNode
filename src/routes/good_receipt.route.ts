import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();

router.post("/", async(req, res, next) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt = req.body.good_receipt as any[];

    const validation = await prisma.$transaction([
        prisma.company.findUnique({
            where:{
                id: company_id
            }
        }),
        prisma.supplier.findUnique({
            where:{
                id: supplier_id
            }
        })
    ]);

    if(validation[0] == null || validation[0].is_delete || validation[1] == null || validation[1] == null){
        return res.status(500).send("Perusahaan atau supplier tidak ditemukan.");
    }
    
    prisma.good_receipt_code.create({
        data: {
            name: name,
            date: date,
            company_id: company_id,
            supplier_id: supplier_id,
            created_by: req.body.userId,
            is_confirm: true,
            confirmed_by: req.body.userId,
            confirmed_at: new Date()
        }
    }).then(result => {
        const good_receipt_items: any[] = [];
        const prices: number[] = [];
        const transactions: any[] = [];
        good_receipt.forEach(x => {
            transactions.push(prisma.item_price_purchase.findFirst({
                where: {
                    is_delete: false,
                    item_id: x.item_id
                },
                orderBy: {
                    id: "desc"
                },
                select: {
                    price: true
                }
            }))
        });

        prisma.$transaction(transactions).then(rs => {
            rs.forEach((r, index) => {
                const price = (r == null) ? "0" : r.price;
                prices[index] = price;
            });

            good_receipt.forEach((y, index) => {
                good_receipt_items.push({
                    item_id: y.item_id,
                    quantity: y.quantity,
                    good_receipt_code_id: result.id,
                    price: prices[index]
                })
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
                return res.status(201).send({
                    ...result,
                    good_receipt: good_receipt_items
                })
            }).catch(error => {
                return res.status(500).send(error);
            })
        }).catch(error => {
            return res.status(500).send(error);
        })
    }).catch(error => {
        console.log(error);
        return res.status(500).send(error);
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
    const year = parseInt(req.params.year);
    const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    prisma.$queryRaw`SELECT COUNT(good_receipt_code.id) AS count, MONTH(good_receipt_code.date) AS month FROM good_receipt_code WHERE YEAR(good_receipt_code.date) = ${year} GROUP BY MONTH(good_receipt_code.date)`.then(counts => {
        (counts as any[]).forEach(x => {
            const month = x.month;
            const num = x.count;

            count[month - 1] = num;
        });

        res.status(200).send(count);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/archives/:year/:month", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!.toString());
    const offset = (page - 1) * limit;

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end_date = new Date(year, month, 1, 0, 0, 0, 0);
    prisma.$transaction([
        prisma.good_receipt_code.findMany({
            where:{
                AND: [
                    {
                        date: {
                            gte: start_date
                        }
                    },
                    {
                        date: {
                            lt: end_date
                        }
                    }
                ]       
            },
            orderBy: {
                date: "asc"
            },
            take: limit,
            skip: offset,
            select: {
                name: true,
                id: true,
                supplier: {
                    select: {
                        name: true
                    }
                },
                company: {
                    select: {
                        name: true
                    }
                },
                date: true,
                user_good_receipt_code_created_byTouser: {
                    select: {
                        name: true
                    }
                },
                created_at: true,
                is_delete: true,
                is_confirm: true
            }
        }),
        prisma.good_receipt_code.count({
            where:{
                AND: [
                    {
                        date: {
                            gte: start_date
                        }
                    },
                    {
                        date: {
                            lt: end_date
                        }
                    }
                ]       
            },
        })
    ]).then(result => {
        res.status(200).send({
            data: result[0],
            count: result[1]
        });
    }).catch(error => {
        res.status(500).send(error);
    })
});

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
                    quantity: true
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
})

export default router;