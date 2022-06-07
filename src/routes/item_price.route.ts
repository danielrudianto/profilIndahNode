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
    date.setHours(0, 0, 0, 0);;

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
                            created_at: true,
                            effective_date: true
                        },
                        where: {
                            is_delete: false,
                            effective_date: {
                                lte: date
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
                },
                take: limit,
                skip: offset
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
                                lte: date
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
                },
                take: limit,
                skip: offset
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

router.post("/bulk", (req, res, next) => {
    const effective_date = new Date(req.body.effective_date);
    const items = req.body.items as any[];
    const references: string[] = [];
    let count: number = 0;
    const price_object: any[] = [];

    items.forEach(x => {
        const reference = x.reference;
        const price = x.price;
        const discount = x.discount;
        const discount_project = x.discount_project;

        references.push(reference);
        price_object[count] = {
            price: parseFloat(price),
            discount: parseFloat(discount),
            discount_project: parseFloat(discount_project)
        }
        count++
    });

    prisma.item.findMany({
        where:{
            reference: {
                in: references
            },
            is_delete: false
        },
        select: {
            id: true,
            reference: true
        }
    }).then(items => {
        if(items.length != count){
            res.status(500).send(`${(items.length - count)} barang tidak terdefinisi. Mohon cek kembali input anda`)
        } else {
            const transactions: any[] = [];
            references.forEach((reference, index) => {
                transactions.push(
                    prisma.item_price.create({
                        data: {
                            item_id: items.filter(x => x.reference == reference)[0].id,
                            price: price_object[index].price,
                            discount: price_object[index].discount,
                            discount_project: price_object[index].discount_project,
                            created_by: req.body.userId,
                            effective_date: effective_date
                        }
                    })
                );

                transactions.push(
                    prisma.item_price.updateMany({
                        where:{
                            item_id: items.filter(x => x.reference == reference)[0].id,
                            NOT: {
                                effective_date: {
                                    gte: effective_date
                                },
                            },
                            is_delete: false
                        },
                        data: {
                            is_delete: true,
                            deleted_by: req.body.userId
                        }
                    })
                );
            })

            prisma.$transaction(transactions).then(result => {
                res.status(201).send(result);
            }).catch(error => {
                res.status(500).send(error);
            })
        }
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.post("/", (req, res, next) => {
    const item_id = req.body.item_id;
    const discount = req.body.discount;
    const discount_project = req.body.discount_project;
    const price = req.body.price;

    prisma.$transaction([
        prisma.item_price.updateMany({
            where:{
                item_id: item_id
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId,
                deleted_at: new Date()
            }
        }),
        prisma.item_price.create({
            data: {
                item_id: item_id,
                price: price,
                discount: discount,
                discount_project: discount_project,
                effective_date: new Date(),
                created_at: new Date(),
                created_by: req.body.userId
            }
        })
    ]).then(result => {
        res.status(200).send(result[1])
    }).catch(error => {
        res.status(500).send(error);
    })
})

export default router;