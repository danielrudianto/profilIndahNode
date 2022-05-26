import { PrismaClient } from '@prisma/client';
import { Router } from 'express';

const prisma = new PrismaClient();
const router = Router();

router.get("/autocomplete", (req, res, next) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    prisma.item_brand.findMany({
        where:{
            name: {
                contains: keyword
            },
            is_delete: false
        },
        skip: 0,
        take: 5
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT?.toString()!);
    const offset = (page - 1) * limit;

    if(keyword == ""){
        prisma.$transaction([
            prisma.item_brand.findMany({
                where:{
                    is_delete: false
                },
                orderBy: {
                    name: "asc"
                },
                take: limit, 
                skip: offset,
                select: {
                    id: true,
                    name: true,
                    created_at: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma.item_brand.count({
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
            prisma.item_brand.findMany({
                where:{
                    is_delete: false,
                    name: {
                        contains: keyword
                    }
                },
                orderBy: {
                    name: "asc"
                },
                take: limit, 
                skip: offset,
                select: {
                    id: true,
                    name: true,
                    created_at: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }),
            prisma.item_brand.count({
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
    }
})

router.post("/", async(req, res, next) => {
    const name = req.body.name;
    const count = await prisma.item_brand.count({
        where:{
            is_delete: false,
            name: name
        }
    });

    if(count > 0){
        res.status(500).send("Please insert unique name");
        return;
    } else {
        prisma.item_brand.create({
            data: {
                name: name,
                created_by: req.body.userId
            }
        }).then(result => {
            res.status(201).send(result);
        }).catch(error => {
            console.log(error);
            res.status(500).send(error);
        })
    }
})

export default router;