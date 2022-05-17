import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { compareSync } from 'bcryptjs';
import { sign } from "jsonwebtoken";
import {authMiddleware} from '../middleware/auth_helper';

const prisma = new PrismaClient()
const router = Router();

router.post("/login", (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;
    prisma.user.findUnique({
        select:{
            id: true,
            name: true,
            password: true,
            is_active: true,
            user_position: {
                select: {
                    position: true,
                    name: true
                },
                orderBy: {
                    created_at: "desc"
                },
                take: 1
            },
            user_department: {
                select: {
                    departments: true,
                },
                where:{
                    is_delete: false
                }
            }
        },
        where:{
            username: username
        }
    }).then(user => {
        if(!compareSync(password, user!.password!) || !user?.is_active) {
            res.status(401).send("Incorrect password or username");
        } else {
            const jwtToken = sign({
                exp: Math.floor(Date.now() / 1000 + (60 * 60 * 6)),
                data: user,
            }, process.env.TOKEN_KEY!.toString());

            user!.password = '';
            const response = {
                ...user,
                token: jwtToken,
            }

            res.status(200).send(response);
        } 
    }).catch(e => {
        res.status(401).send("Incorrect password or username");
    })
});

router.get("/", authMiddleware, (req, res, next) => {
    res.status(200).send({
        status:"authorized"
    })
});

export default router;