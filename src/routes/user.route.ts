import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { Router } from "express";

const prisma = new PrismaClient()
const router = Router();
const roles = [
    {
        id: 1,
        name: "Pembelian",
        available: true
    }, 
    {
        id: 2,
        name: "Penjualan",
        available: false
    }, 
    {
        id: 3,
        name: "Akuntansi",
        available: false
    },
    {
        id: 4,
        name: "Keuangan",
        available: false
    }, 
    {
        id: 5,
        name: "Administrator",
        available: true
    }
];

router.get("/roles", (req, res, next) => {
    return res.status(200).send(roles.filter(x => x.available));
});

router.get("/:id", (req, res, next) => {
    const id = parseInt(req.params.id);
    prisma.user.findUnique({
        where:{
            id: id
        },
        select: {
            id: true,
            name: true,
            username: true,
            nik: true,
            user_department: {
                select: {
                    role: true
                }
            }
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.get("/", (req, res, next) => {
    const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page?.toString()));
    const keyword = (!req.query.keyword) ? "" : req.query.keyword?.toString();
    const limit = parseInt(process.env.LIMIT!.toString());
    const offset = (page - 1) * limit;

    if(keyword == ""){
        prisma.$transaction([
            prisma.user.findMany({
                where:{
                    is_active: true
                },
                select: {
                    id: true,
                    name: true,
                    nik: true,
                    username: true,
                },
                orderBy: {
                    name: "asc"
                },
                take: limit,
                skip: offset
            }),
            prisma.user.count({
                where:{
                    is_active: true
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
            prisma.user.findMany({
                where:{
                    is_active: true,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            }
                        },
                        {
                            username: {
                                contains: keyword
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    nik: true,
                    username: true,
                },
                orderBy: {
                    name: "asc"
                },
                take: limit,
                skip: offset
            }),
            prisma.user.count({
                where:{
                    is_active: true,
                    OR: [
                        {
                            name: {
                                contains: keyword
                            }
                        },
                        {
                            username: {
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
});

router.post("/", async(req, res, next) => {
    
    const roleId = parseInt(req.body.role);
    const role = roles.filter(x => x.id == roleId);
    if(role.length == 0 || !role[0].available){
        return res.status(500).send("Peran tidak ditemukan.");
    }

    const count = await prisma.user.count({
        where:{
            OR: [
                {
                    username: req.body.username
                },
                {
                    nik: req.body.nik
                }
            ]
        }
    });

    if(count > 0){
        return res.status(500).send("Mohon masukan username / NIK unik.");
    }

    let password = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < 8; i++){
        password += characters[Math.floor(Math.random() * (characters.length - 1))];
    }

    prisma.user.create({
        data: {
            name: req.body.name,
            nik: req.body.nik,
            username: req.body.username,
            password: hashSync(password, 12)
        }
    }).then(result => {
        prisma.user_department.create({
            data: {
                user_id: result.id,
                role: roleId
            }
        }).then(selectedRole => {
            return res.status(201).send({
                name: result.name,
                nik: result.nik,
                username: result.username,
                password: password,
                role: roles.filter(x => x.id == selectedRole.role)[0]
            });
        }).catch(error => {
            return res.status(500).send(error);
        })
    }).catch(error => {
        return res.status(500).send(error);
    })
});

router.put("/password", (req, res, next) => {
    // Route to accomodate change password of a user
    const newPassword = req.body.password;
    const userId = req.body.userId;

    prisma.user.update({
        where:{
            id: userId
        },
        data: {
            password: hashSync(newPassword, 12)
        },
        select: {
            id: true,
            name: true,
            nik: true,
            username: true
        }
    }).then(result => {
        res.status(201).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.put("/", (req, res, next) => {
    const username = req.body.username;
    const id = req.body.id;
    const name = req.body.name;
    const nik = req.body.nik;
    
    prisma.user.update({
        where:{
            id: id
        },
        data: {
            name: name,
            nik: nik,
            username: username
        }
    }).then(result => {
        res.status(200).send(result);
    }).catch(error => {
        res.status(500).send(error);
    })
})

router.put("/status", (req, res, next) => {
    // Route to accomodate user status changes
})

export default router;