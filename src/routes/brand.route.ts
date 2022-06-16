import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { io } from '../helper/socket.connection.helper';

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

router.get("/:id", (req, res, next) => {
    const id = parseInt(req.params.id);

    prisma.$transaction([
        prisma.item_brand.findUnique({
            where:{
                id: id
            },
            select: {
                id: true,
                name: true,
                user: {
                    select: {
                        name: true
                    }
                },
                created_at: true
            }
        }),
        prisma.item.count({
            where:{
                item_brand_id: id,
                is_delete: false
            }
        })
    ]).then(result => {
        res.status(200).send({
            ...result[0],
            can_delete: (result[1] == 0) ? true : false
        });
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

router.put("/", (req, res, next) => {
    const id = req.body.id;
    prisma.item_brand.findUnique({
        where:{
            id: id
        }
    }).then(result => {
        if(result?.is_delete == false){
            prisma.item_brand.update({
                where:{
                    id: id
                },
                data: {
                    name: req.body.name
                },
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
            }).then(result => {
                io.emit("updateBrand", result);
                return res.status(201).send(result);
            }).catch(error => {
                res.status(500).send(error);
            })
        } else {
            return res.status(404).send("Data tidak ditemukan.");
        }
    })
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
        res.status(500).send("Mohon input nama unik.");
        return;
    } else {
        prisma.item_brand.create({
            data: {
                name: name,
                created_by: req.body.userId
            },
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
        }).then(async(result) => {
            const count = await prisma.item_brand.count({
                where:{
                    is_delete: false
                }
            })
            io.emit("createBrand", {
                data: result,
                count: count
            });
            res.status(201).send(result);
        }).catch(error => {
            console.log(error);
            res.status(500).send(error);
        })
    }
})

router.delete("/:id", async(req, res, next) => {
    const id = parseInt(req.params.id);

    prisma.$transaction([
        prisma.item.count({
            where:{
                item_brand_id: id,
                is_delete: false
            }
        }),
        prisma.item_brand.findUnique({
            where:{
                id: id
            }
        })
    ]).then(result => {
        if(result[0] > 0){
            return res.status(500).send("Masih terdapat barang yang menggunakan merek ini. Tidak dapat menghapus merek.")
        }

        if(result[1]?.is_delete){
            return res.status(404).send("Merek sudah dihapus sebelumnya.");
        }

        prisma.item_brand.update({
            where:{
                id: id
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId
            },
            select: {
                id: true,
                name: true
            }
        }).then(async(result) => {
            const count = await prisma.item_brand.count({
                where:{
                    is_delete: false
                }
            });
            io.emit("deleteBrand", {
                id: result.id,
                count: count
            });
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }).catch(error => {
        return res.status(500).send(error);
    });    
})

export default router;