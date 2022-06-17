import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import CustomerController from "../controller/customer.controller";
import { customer } from "../interface/customer";

const prisma = new PrismaClient()
const router = Router();

router.post("/", CustomerController.create);

router.delete("/:id", async(req, res, next) => {
    const customerId = parseInt(req.params.id.toString());
    const customer = await prisma.customer.findUnique({
        where:{
            id: customerId
        },
        select: {
            id: true,
            bill_code: true
        }
    });

    if(customer != null && customer.bill_code.length == 0){
        prisma.customer.update({
            where:{
                id: customerId
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
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;

    const customer = await prisma.customer.findUnique({
        where:{
            id: id
        }
    });

    if(customer == null || customer.is_delete){
        res.status(404).send("Item not found.");
        return;
    }

    prisma.customer.update({
        where:{
            id: id
        },
        data: {
            name: name,
            address: address,
            npwp: npwp,
            pic: pic,
            phone_number: phone_number
        }
    }).then(result => {
        res.status(201).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
});

router.get("/autocomplete", (req, res, next) => {
    const keyword = req.query.keyword?.toString();
    if(keyword == "" || !req.query.keyword){
        res.status(200).send({
            data: [],
            count: 0
        })
    } else {
        prisma.$transaction([
            prisma.customer.findMany({
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
                        },
                        {
                            npwp: {
                                contains: keyword
                            }
                        },
                        {
                            pic: {
                                contains: keyword
                            }
                        },
                        {
                            phone_number: {
                                contains: keyword
                            }
                        }
                    ]
                },
                orderBy: {
                    name: "asc"
                },
                take: 5
            }),
            prisma.customer.count({
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

router.get("/", (req, res, next) => {
    const page: number = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = 10;
    const offset = (page - 1) * limit;
    const keyword = req.query.keyword?.toString();

    if(keyword == "" || !req.query.keyword){
        prisma.$transaction([
            prisma.customer.findMany({
                where:{
                    is_delete: false,
                },
                orderBy: {
                    name: "asc"
                },
                skip: offset,
                take: limit
            }),
            prisma.customer.count({
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
            prisma.customer.findMany({
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
                        },
                        {
                            npwp: {
                                contains: keyword
                            }
                        },
                        {
                            pic: {
                                contains: keyword
                            }
                        },
                        {
                            phone_number: {
                                contains: keyword
                            }
                        }
                    ]
                },
                orderBy: {
                    name: "asc"
                },
                skip: offset,
                take: limit
            }),
            prisma.customer.count({
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
                        },
                        {
                            npwp: {
                                contains: keyword
                            }
                        },
                        {
                            pic: {
                                contains: keyword
                            }
                        },
                        {
                            phone_number: {
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