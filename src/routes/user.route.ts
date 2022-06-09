import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { customer } from "../interface/customer";

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
})

export default router;