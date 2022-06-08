import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { io } from "../middleware/socket.helper";

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
        }).then(async(result) => {
            const count = await prisma.company.count({
                where:{
                    is_delete: false
                }
            });

            io.emit("createCompany", {
                data: result,
                count: count
            });
            
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    } else {
        return res.status(500).send("Kode perusahaan sudah ada, mohon pastikan kode perusahaan unik.")
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

router.get("/:id", (req, res, next) => {
    const id = parseInt(req.params.id);
    prisma.$transaction([
        prisma.company.findUnique({
            where:{
                id: id
            }
        }),
        prisma.good_receipt_code.count({
            where:{
                company_id: id
            }
        })
    ]).then(result => {
        res.status(200).send({
            ...result[0],
            can_delete: result[1] == 0 ? true : false
        })
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
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
                },
                take: limit,
                skip: offset
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
                },
                take: limit,
                skip: offset
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

router.delete("/:companyId", async(req, res, next) => {
    const id = parseInt(req.params.companyId);
    const company = await prisma.company.findUnique({
        where:{
            id: id
        }
    });

    if(company == null || company?.is_delete){
        return res.status(404).send("Perusahaan tidak ditemukan atau sudah dihapus.")
    }

    prisma.company.update({
        where:{
            id: id
        },
        data: {
            is_delete: true,
            deleted_by: req.body.userId
        }
    }).then(async(result) => {
        const count = await prisma.company.count({
            where:{
                is_delete: false
            }
        });

        io.emit("deleteCompany", {
            id: result.id,
            count: count
        });

        return res.status(201).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.put("/", async(req, res, next) => {
    const id = req.body.id;
    const name = req.body.name;
    const code_name = req.body.code_name;
    const address = req.body.address;
    const npwp = (req.body.npwp == null || req.body.toString().length != 15) ? null : req.body.npwp;

    const companyCount = await prisma.company.count({
        where:{
            code_name: code_name,
            is_delete: false,
            id: {
                not: id
            }
        }
    });

    if(companyCount > 0){
        return res.status(500).send("Kode perusahaan sudah ada, mohon pastikan kode perusahaan unik.")
    }

    prisma.company.update({
        where:{
            id: id
        },
        data: {
            name: name,
            address: address,
            code_name: code_name,
            npwp: npwp,
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
        io.emit("updateCompany", result);
        return res.status(201).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    })
})

export default router;