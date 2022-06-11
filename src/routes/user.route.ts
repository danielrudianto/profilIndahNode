import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { Router } from "express";
import { customer } from "../interface/customer";
import { user } from "../interface/user";

const prisma = new PrismaClient()
const router = Router();

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
    
    const count = await prisma.user.count({
        where:{
            username: req.body.username
        }
    });

    if(count > 0){
        return res.status(500).send("Mohon masukan username unik.");
    }

    let password = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(var i = 0; i < 8; i++){
        password += characters[Math.floor(Math.random()) * (characters.length - 1)];
    }

    console.log(password);

    prisma.user.create({
        data: {
            name: req.body.name,
            nik: req.body.nik,
            username: req.body.username,
            password: hashSync(password, 12)
        }
    }).then(result => {
        res.status(201).send({
            name: result.name,
            nik: result.nik,
            username: result.username,
            password: password
        });
    }).catch(error => {
        res.status(500).send(error);
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

export default router;