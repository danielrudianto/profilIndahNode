import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.get("/bulk", (req, res, next) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    prisma.item.findMany({
        where:{
            is_delete: false   
        },
        select: {
            reference: true,
            description: true,
            item_brand: {
                select: {
                    name: true
                }
            },
            item_price: {
                select: {
                    price: true,
                    discount: true,
                    discount_project: true
                },
                where:{
                    is_delete: false,
                    effective_date: {
                        lt: date
                    }
                },
                orderBy: {
                    effective_date: "desc"
                },
                take: 1,
                skip: 0
            }
        },
        orderBy: {
            reference: "asc"
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/", (req, res, next) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    const date = new Date();
    date.setDate((new Date()).getDate() + 1);
    date.setHours(0, 0, 0);

    if(keyword == ""){
        prisma.$transaction([
            prisma.item.findMany({
                where:{
                    is_delete: false
                },
                select: {
                    reference: true,
                    description: true,
                    item_brand: {
                        select: {
                            name: true
                        }
                    },
                    item_price: {
                        select: {
                            price: true,
                            discount: true,
                            discount_project: true,
                            created_at: true
                        },
                        where: {
                            is_delete: false,
                            effective_date: {
                                lt: date
                            }
                        },
                        orderBy: {
                            effective_date: "desc"
                        },
                        take: limit,
                        skip: offset
                    }
                },
                orderBy: {
                    reference: "asc"
                }
            }),
            prisma.item.count({
                where:{
                    is_delete: false
                }
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
        prisma.$transaction([
            prisma.item.findMany({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            reference: {
                                contains: keyword
                            }
                        },
                        {
                            description: {
                                contains: keyword
                            }
                        },
                    ]
                },
                select: {
                    reference: true,
                    description: true,
                    item_brand: {
                        select: {
                            name: true
                        }
                    },
                    item_price: {
                        select: {
                            price: true,
                            discount: true,
                            discount_project: true,
                            created_at: true,
                        },
                        where: {
                            is_delete: false,
                            effective_date: {
                                lt: date
                            }
                        },
                        orderBy: {
                            effective_date: "desc"
                        },
                        take: limit,
                        skip: offset
                    }
                },
                orderBy: {
                    reference: "asc"
                }
            }),
            prisma.item.count({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            reference: {
                                contains: keyword
                            }
                        },
                        {
                            description: {
                                contains: keyword
                            }
                        },
                    ]
                }
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