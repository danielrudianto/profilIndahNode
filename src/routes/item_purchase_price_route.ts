import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.get("/", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    const date = new Date();
    date.setHours(0, 0, 0);
    date.setDate(date.getDate() + 1);

    if(keyword == ""){
        prisma.$transaction([
            prisma.item.findMany({
                where:{
                    is_delete: false
                },
                select: {
                    id: true,
                    reference: true,
                    description: true,
                    item_brand: {
                        select: {
                            name: true
                        }
                    },
                    item_price_purchase: {
                        select: {
                            price: true,
                            effective_date: true
                        },
                        where: {
                            effective_date: {
                                lt: date
                            },
                            is_delete: false
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
                },
                skip: offset,
                take: limit
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
                        }
                    ]
                },
                select: {
                    id: true,
                    reference: true,
                    description: true,
                    item_brand: {
                        select: {
                            name: true
                        }
                    },
                    item_price_purchase: {
                        select: {
                            price: true,
                            effective_date: true
                        },
                        where: {
                            effective_date: {
                                lt: date
                            },
                            is_delete: false
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
                },
                skip: offset,
                take: limit
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
                        }
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