import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.get("/bulk", (req, res, next) => {
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
            item_price_purchase: {
                select: {
                    price: true,
                },
                where:{
                    is_delete: false,
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

router.get("/:reference", (req, res, next) => {
    const reference = req.params.reference.toString();
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    prisma.item.findFirst({
        where:{
            reference: reference,
            is_delete: false
        },
        select: {
            id: true,
            description: true,
            reference: true,
            item_brand: {
                select: {
                    name: true
                }
            },
            item_price_purchase: {
                select: {
                    price: true,
                },
                where: {
                    is_delete: false
                },
                orderBy: {
                    id: "desc"
                },
                take: 1,
                skip: 0
            }
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

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
                        },
                        where: {
                            is_delete: false
                        },
                        orderBy: {
                            id: "desc"
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
                        },
                        where: {
                            is_delete: false
                        },
                        orderBy: {
                            id: "desc"
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

router.post("/bulk", (req, res, next) => {
    const items = req.body.items as any[];
    const references: string[] = [];
    let count: number = 0;
    const price_object: any[] = [];

    items.forEach(x => {
        const reference = x.reference;
        const price = x.price;

        references.push(reference);
        price_object[count] = {
            price: parseFloat(price),
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
            const item_ids: number[] = [];

            references.forEach((reference, index) => {
                item_ids.push(items.filter(x => x.reference == reference)[0].id);
                transactions.push(
                    prisma.item_price_purchase.create({
                        data: {
                            item_id: items.filter(x => x.reference == reference)[0].id,
                            price: price_object[index].price,
                            created_by: req.body.userId,
                        }
                    })
                );
            });

            prisma.item_price_purchase.updateMany({
                where:{
                    item_id: {
                        in: item_ids
                    }
                },
                data: {
                    is_delete: true,
                    deleted_by: req.body.userId
                }
            }).then(() => {
                prisma.$transaction(transactions).then(result => {
                    res.status(201).send(result);
                }).catch(error => {
                    res.status(500).send(error);
                })
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
    const price = req.body.price;

    prisma.item_price_purchase.create({
        data: {
            item_id: item_id,
            price: price,
            created_by: req.body.userId
        }
    }).then(result => {
        prisma.item_price_purchase.updateMany({
            where:{
                is_delete: false,
                item_id: item_id,
                NOT: {
                    id: result.id
                }
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId
            }
        }).then(() => {
            res.status(201).send(result);
        }).catch(() => {
            res.status(500).send("Failed to delete previous data.");
        })
    })
})

export default router;