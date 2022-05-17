import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { purchaseOrderNameHelper } from "../middleware/name_helper";

const prisma = new PrismaClient()
const router = Router();

router.post("/", purchaseOrderNameHelper, (req, res, next) => {
    const purchaseOrder: any[] = req.body.purchase_order as any[];
    const name = req.body.purchase_order_name;
    const company_id = req.body.company_id;

    prisma.purchase_order_code.create({
        data: {
            name: name,
            created_at: new Date(),
            created_by: req.body.userId,
            company_id: req.body.company_id,
            supplier_id: req.body.supplier_id
        }
    }).then(result => {
        let purchaseOrderData: any[] = [];
        purchaseOrder.forEach(x => {
            purchaseOrderData.push({
                item_id: x.item_id,
                price_list: parseFloat(x.price_list),
                price: parseFloat(x.price),
                quantity: parseFloat(x.quantity),
                purchase_order_code_id: result.id
            })
        });

        prisma.purchase_order.createMany({
            data: purchaseOrderData as any[]
        }).then(purchase_orders => {
            res.status(201).send({
                ...result,
                purchase_order: purchase_orders
            });
        }).catch(error => {
            res.status(500).send(error);
        })
    })
})

router.get("/:purchaseOrderName", (req, res, next) => {
    const purchaseOrderName = req.params.purchaseOrderName;
    prisma.purchase_order_code.findUnique({
        where:{
            name: purchaseOrderName
        },
        select: {
            name: true,
            created_at: true,
            user_purchase_order_code_created_byTouser: {
                select: {
                    name: true
                }
            },
            user_purchase_order_code_confirmed_byTouser: {
                select: {
                    name: true
                }
            },
            confirmed_at: true,
            purchase_order: {
                select: {
                    item: {
                        select: {
                            reference: true,
                            description: true
                        }
                    },
                    quantity: true,
                    price: true,
                    price_list: true
                }
            }
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/confirm/:purchaseOrderName", async(req, res, next) => {
    const purchaseOrderName = req.params.purchaseOrderName.toString();
    const purchaseOrder = await prisma.purchase_order_code.findUnique({
        where:{
            name: purchaseOrderName
        }
    });

    if(purchaseOrder == null || purchaseOrder.is_confirm || purchaseOrder.is_delete){
        res.status(404).send("Purchase order not found.");
    } else {
        prisma.purchase_order_code.update({
            where:{
                name: purchaseOrderName
            },
            data: {
                is_confirm: true,
                confirmed_by: req.body.userId
            }
        }).then(result => {
            // Purchase order file has to be sent
        }).catch(error => {
            res.status(500).send(error);
        })
    }
})

router.get("/delete/:purchaseOrderName", async(req, res, next) => {
    const purchaseOrderName = req.params.purchaseOrderName.toString();
    const purchaseOrder = await prisma.purchase_order_code.findUnique({
        where:{
            name: purchaseOrderName
        }
    });

    if(purchaseOrder == null || purchaseOrder.is_confirm || purchaseOrder.is_delete){
        res.status(404).send("Purchase order not found.");
    } else {
        prisma.purchase_order_code.update({
            where:{
                name: purchaseOrderName
            },
            data: {
                is_delete: true,
                confirmed_by: req.body.userId
            }
        }).then(result => {
            res.status(201).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    }
})

router.get("/archives", (req, res, next) => {
    if(!req.query.company){
        prisma.$queryRaw`SELECT DISTINCT(YEAR(purchase_order_code.created_at)) AS year FROM purchase_order_code ORDER BY purchase_order_code.created_at ASC`.then(result => {
            prisma.$queryRaw`SELECT COUNT(purchase_order_code.id) AS count, YEAR(purchase_order_code.created_at) AS year FROM purchase_order_code GROUP BY YEAR(purchase_order_code.created_at)`.then(counts => {
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
    } else {
        const company_id = req.query.company_id;
        prisma.$queryRaw`SELECT DISTINCT(YEAR(purchase_order_code.created_at)) AS year FROM purchase_order_code WHERE purchase_order_code.company_id = ${company_id} ORDER BY purchase_order_code.created_at ASC`.then(result => {
            prisma.$queryRaw`SELECT COUNT(purchase_order_code.id) AS count, YEAR(purchase_order_code.created_at) AS year FROM purchase_order_code  WHERE purchase_order_code.company_id = ${company_id} GROUP BY YEAR(purchase_order_code.created_at)`.then(counts => {
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
    }
})

router.get("/archives/:year", (req, res, next) => {
    const year = parseInt(req.params.year);
    let response: any[] = [];
    for(let i = 1; i <= 12; i++){
        response.push({
            month: i,
            count: 0
        })
    };

    if(!req.query.company){
            prisma.$queryRaw`
            SELECT COUNT(purchase_order_code.id) AS count, MONTH(purchase_order_code.created_at) AS month 
            FROM purchase_order_code 
            WHERE YEAR(purchase_order_code.created_at) = ${year} 
            GROUP BY MONTH(purchase_order_code.created_at)
        `.then(counts => {
            (counts as any[]).forEach(item => {
                const index = response.findIndex(x => x.month == item.month);
                response[index].count = item.count;
            })

            res.status(200).send(response);
        }).catch(error => {
            res.status(500).send(error);
        });
    } else {
        const company_id = req.query.company_id;
        prisma.$queryRaw`
        SELECT COUNT(purchase_order_code.id) AS count, MONTH(purchase_order_code.created_at) AS month 
        FROM purchase_order_code 
        WHERE YEAR(purchase_order_code.created_at) = ${year} 
        AND purchase_order_code.company_id = ${company_id}
        GROUP BY MONTH(purchase_order_code.created_at)
        `.then(counts => {
            (counts as any[]).forEach(item => {
                const index = response.findIndex(x => x.month == item.month);
                response[index].count = item.count;
            })

            res.status(200).send(response);
        }).catch(error => {
            res.status(500).send(error);
        });
    }

    
})

router.get("/archives/:year/:month", (req, res, next) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    if(!req.query.company_id){
        prisma.$transaction([
            prisma.purchase_order_code.findMany({
                where:{
                    AND:[
                        {
                            created_at: {
                                gte: new Date(year, month - 1, 1)
                            }
                        }, 
                        {
                            created_at: {
                                lt: new Date(year, month, 1)
                            }
                        }
                    ]
                },
                orderBy: {
                    created_at: "asc"
                },
                take: limit,
                skip: offset
            }),
            prisma.purchase_order_code.count({
                orderBy: {
                    created_at: "asc"
                },
            })
        ]).then(result => {
            res.status(200).send({
                data: result[0],
                count: result[1]
            })
        }).catch(error => {
            res.status(500).send(error);
        })
    } else {
        const company_id = parseInt(req.query.company_id.toString());
        prisma.$transaction([
            prisma.purchase_order_code.findMany({
                where:{
                    company_id: company_id,
                    AND:[
                        {
                            created_at: {
                                gte: new Date(year, month - 1, 1)
                            }
                        }, 
                        {
                            created_at: {
                                lt: new Date(year, month, 1)
                            }
                        }
                    ]
                },
                orderBy: {
                    created_at: "asc"
                },
                take: limit,
                skip: offset
            }),
            prisma.purchase_order_code.count({
                where:{
                    company_id: company_id,
                    AND:[
                        {
                            created_at: {
                                gte: new Date(year, month - 1, 1)
                            }
                        }, 
                        {
                            created_at: {
                                lt: new Date(year, month, 1)
                            }
                        }
                    ]
                },
                orderBy: {
                    created_at: "asc"
                },
            })
        ]).then(result => {
            res.status(200).send({
                data: result[0],
                count: result[1]
            })
        }).catch(error => {
            res.status(500).send(error);
        })
    }
})

export default router;