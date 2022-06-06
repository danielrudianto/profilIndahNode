import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();

router.post("/", async (req, res, next) => {
    const code_name = req.body.code_name;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

    const companyCount = await prisma.company.count({
        where:{
            code_name: code_name,
            is_delete: false
        }
    });

    if(companyCount == 0){
        prisma.company.create({
            data: {
                name: name,
                code_name: code_name,
                address: address,
                npwp: npwp,
                created_by: req.body.userId
            },
            select: {
                id: true,
                name: true,
                code_name: true,
                address: true,
                npwp: true,
                user: {
                    select: {
                        name: true
                    }
                },
                user_company_deleted_byTouser: {
                    select: {
                        name: true
                    }
                }
            }
        }).then(result => {
            res.status(201).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    } else {
        res.status(400).send("Duplicate code name.")
    }
    
});

router.get("/autocomplete", (req, res, next) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    if(keyword == ""){
        prisma.company.findMany({
            where:{
                is_delete: false,
            },
            orderBy: {
                name: 'asc'
            },
            take: 5,
            skip: 0
        }).then(result => {
            res.status(200).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })
    } else {
        prisma.company.findMany({
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
        }).then(result => {
            res.status(200).send(result);
        }).catch(error => {
            res.status(500).send(error);
        })

    }
})

router.get("/", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    if(keyword == ""){
        prisma.$transaction([
            prisma.company.findMany({
                where:{
                    is_delete: false
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    code_name: true,
                    npwp: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    created_at: true,
                }
            }),
            prisma.company.count({
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
            prisma.company.findMany({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            },
                            address: {
                                contains: keyword
                            },
                            code_name: {
                                contains: keyword
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    code_name: true,
                    npwp: true,
                    user: {
                        select: {
                            name: true
                        }
                    },
                    created_at: true,
                }
            }),
            prisma.company.count({
                where:{
                    is_delete: false,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            },
                            address: {
                                contains: keyword
                            },
                            code_name: {
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