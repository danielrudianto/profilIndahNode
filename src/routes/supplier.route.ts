import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();

router.get("/autocomplete", (req, res, next) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    if(keyword == ""){
        prisma.supplier.findMany({
            where:{
                is_delete: false,
            },
            select: {
                id: true,
                name: true,
                address: true,
                npwp: true
            },
            orderBy: {
                name: "asc"
            },
            take: 5,
            skip: 0
        }).then(result => {
            res.status(200).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    } else {
        prisma.supplier.findMany({
            where:{
                is_delete: false,
                OR: [
                    {
                        name: {
                            contains: keyword
                        },
                        address: {
                            contains: keyword
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                address: true,
                npwp: true
            },
            orderBy: {
                name: "asc"
            },
            take: 5,
            skip: 0
        }).then(result => {
            res.status(200).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    }
})

router.get("/", (req, res, next) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    if(keyword == ""){
        prisma.$transaction([
            prisma.supplier.findMany({
                where:{
                    is_delete: false
                },
                orderBy: {
                    name: "asc"
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    npwp: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    created_at: true
                },
                take: limit,
                skip: offset
            }),
            prisma.supplier.count({
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
            prisma.supplier.findMany({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            }
                        },
                        {
                            address: {
                                contains: keyword
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    npwp: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    created_at: true
                },
                orderBy: {
                    name: "asc"
                },
                take: limit,
                skip: offset
            }),
            prisma.supplier.count({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            }
                        },
                        {
                            address: {
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

router.post("/", (req, res, next) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

    prisma.supplier.create({
        data: {
            name: name,
            address: address,
            npwp: npwp,
            created_by: req.body.userId
        },
        select: {
            id: true,
            name: true,
            address: true,
            npwp: true,
            user: {
                select: {
                    name: true
                }
            },
            created_at: true
        }
    }).then(result => {
        res.status(201).send(result)
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.put("/", async(req, res, next) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

    const supplier = await prisma.supplier.findUnique({
        where:{
            id: id
        }
    });

    if(supplier == null || supplier.is_delete){
        return res.status(404).send("Data not found.");
    } else {
        prisma.supplier.update({
            where:{
                id: id
            },
            data: {
                name: name,
                address: address,
                npwp: npwp
            }
        }).then(result => {
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
    
})

export default router;