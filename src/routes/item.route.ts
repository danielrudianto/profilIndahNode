import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { item } from "../interface/item";
import { io } from "../middleware/socket.helper";

const prisma = new PrismaClient()
const router = Router();


router.post("/", async(req, res, next) => {
    const brand_name = req.body.brand;
    const brand = await prisma.item_brand.findFirst({
        where:{
            name: brand_name,
            is_delete: false
        },
        select: {
            id: true
        }
    });

    if(brand == null){
        return res.status(404).send("Brand not found.");
    }

    const _item = await prisma.item.findFirst({
        where:{
            reference: req.body.reference,
            is_delete: false
        }
    });

    // There is item with the same reference that has not been deleted //
    if(_item != null){
        return res.status(404).send("Unique reference required.");
    }

    const item: item = {
        reference: req.body.reference,
        description: req.body.description,
        created_by: req.body.userId,
        item_brand_id: brand.id
    }
    
    prisma.item.create({
        data: item as any,
        select: {
            id: true,
            reference: true,
            description: true,
            created_at: true,
            user: {
                select: {
                    name: true
                }
            },
            item_brand:{
                select: {
                    name: true
                }
            }
        }
    }).then(async(result) => {
        prisma.$transaction([
            prisma.item_price.create({
                data: {
                    item_id: result.id,
                    price: req.body.price,
                    discount: req.body.discount,
                    discount_project: req.body.discount_project,
                    effective_date: new Date(),
                    created_by: req.body.userId
                },
                select: {
                    price: true,
                    discount: true,
                    discount_project: true,
                    is_delete: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma.item_price_purchase.create({
                data: {
                    item_id: result.id,
                    price: req.body.purchase_price,
                    created_by: req.body.userId
                },
                select: {
                    price: true,
                    is_delete: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma.item.count({
                where:{
                    is_delete: false
                }
            })
        ])
        .then(item_price_result => {
            const item_object = {
                ...result,
                item_price: [item_price_result[0]],
                item_price_purchase: [item_price_result[1]]
            }

            io.emit("createItem", {
                data: item_object,
                count: item_price_result[2]
            })
            res.status(201).send(item_object);
        }).catch(error => {
            res.status(500).send(error);
        })
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.delete("/:itemReference", async(req, res, next) => {
    const reference = req.params.itemReference;
    const item = await prisma.item.findFirst({
        where:{
            reference: reference,
            is_delete: false
        },
        select: {
            reference: true,
            id: true,
            bill: true,
            good_receipt: true
        }
    });

    if(item != null && item.bill.length == 0 && item.good_receipt.length == 0){
        prisma.item.update({
            where:{
                id: item.id
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId
            }
        }).then(async(result) => {
            const count = await prisma.item.count({
                where: {
                    is_delete: false
                }
            });

            io.emit("deleteItem", {
                id: item.id,
                reference: item.reference,
                count: count
            });
            res.status(201).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    } else {
        res.status(500).send("Not allowed to delete item.");
    }
})

router.put("/", async(req, res, next) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;

    const brand = await prisma.item_brand.findFirst({
        where:{
            name: brand_name,
            is_delete: false
        }
    });

    if(brand == null){
        res.status(404).send("Brand not found.");
        return;
    }

    const item = await prisma.item.findUnique({
        where:{
            id: id
        }
    });

    if(item == null || item.is_delete){
        res.status(404).send("Item not found.");
        return;
    }

    prisma.item.update({
        where:{
            id: id
        },
        data: {
            reference: reference,
            description: description,
            item_brand_id: brand.id,
            minimum_stock: minimum_stock
        }
    }).then(result => {
        res.status(201).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
});

router.get("/:reference", (req, res, next) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    prisma.$transaction([
        prisma.item.findFirst({
            where:{
                reference: reference,
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
                minimum_stock: true,
                item_price: {
                    select: {
                        price: true,
                        discount: true,
                        discount_project: true
                    },
                    orderBy: {
                        effective_date: "desc"
                    },
                    where: {
                        effective_date: {
                            lt: date
                        }
                    },
                    take: 1,
                    skip: 0
                },
            }
        }),
        prisma.good_receipt.count({
            where:{
                item: {
                    reference: reference
                }
            }
        }),
        prisma.bill.count({
            where:{
                item: {
                    reference: reference
                }
            }
        })
    ]).then(result => {
        res.status(200).send({
            ...result[0],
            can_delete: (result[1] + result[2] == 0) ? true : false
        });
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/", (req, res, next) => {
    const page: number = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();

    if(keyword == ""){
        prisma.$transaction([
            prisma.item.findMany({
                where:{
                    is_delete: false
                },
                orderBy: {
                    reference: "asc"
                },
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    reference: true,
                    description: true,
                    created_at: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    item_brand:{
                        select: {
                            name: true
                        }
                    }
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
            });
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
                orderBy: {
                    reference: "asc"
                },
                skip: offset,
                take: limit,
                select: {
                    reference: true,
                    description: true,
                    created_at: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    item_brand:{
                        select: {
                            name: true
                        }
                    }
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
                        }
                    ]
                }
            })
        ]).then(result => {
            res.status(200).send({
                data: result[0],
                count: result[1]
            });
        }).catch(error => {
            res.status(500).send(error);
        })
    }    
})

export default router;