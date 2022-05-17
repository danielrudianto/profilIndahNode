import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { item } from "../interface/item";

const prisma = new PrismaClient()
const router = Router();


router.post("/", (req, res, next) => {
    const item: item = {
        reference: req.body.reference,
        description: req.body.description,
        created_by: req.body.userId,
    }
    prisma.item.create({
        data: item as any
    }).then(async(result) => {
        prisma.item_price.create({
            data: {
                item_id: result.id,
                price: req.body.price,
                discount: req.body.discount
            }
        }).then(item_price_result => {
            const item_object = {
                ...item,
                id: result.id,
                item_price: item_price_result
            }
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
    const item = await prisma.item.findUnique({
        where:{
            reference: reference
        },
        select: {
            reference: true,
            id: true,
            bill: true
        }
    });

    if(item != null && item.bill.length == 0){
        prisma.item.update({
            where:{
                reference: reference
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId
            }
        }).then(result => {
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
            description: description
        }
    }).then(result => {
        res.status(201).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
});

router.get("/autocomplete", (req, res, next) => {

})

router.get("/", (req, res, next) => {
    const page: number = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const keyword = req.query.keyword?.toString();
    console.log(keyword);

    if(keyword == "" || !req.query.keyword){
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
                    reference: true,
                    description: true,
                    created_at: true,
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
        ]).then(result => {
            res.status(200).send({
                data: result[0],
                count: result[1]
            });
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
        })
    }    
})

export default router;