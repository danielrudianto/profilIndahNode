import { PrismaClient } from "@prisma/client";
import { Router, Request, Response } from "express";
import { compareSync } from 'bcryptjs';
import { sign } from "jsonwebtoken";
import { authMiddleware } from '../middleware/auth.helper';
import { body, validationResult  } from 'express-validator';
import { compare } from "bcrypt";

const prisma = new PrismaClient()
const router = Router();

router.post("/login", 
    [
        body("username").not().isEmpty(),
        body("password").not().isEmpty()
    ], 
    (req: Request, res: Response) => {
        const errors = validationResult(req);
        if(errors.array().length > 0){
            return res.status(500).send("Please fill in the correct format.")
        }

        const username = req.body.username;
        const password = req.body.password;
        prisma.user.findUnique({
            select:{
                id: true,
                name: true,
                password: true,
                is_active: true,
                user_department: {
                    select: {
                        role: true
                    }
                }
            },
            where:{
                username: username
            }
        }).then(user => {
            if(!user || !user.is_active){
                return res.status(401).send("Incorrect password or username");
            }

            compare(password, user.password).then(result => {
                if(!result){
                    return res.status(401).send("Incorrect password or username");
                }

                const expired = (new Date()).getTime() + (60 * 60 * 6 * 1000)
                const jwtToken = sign({
                    id: user.id,
                }, process.env.TOKEN_KEY!.toString(), {
                    expiresIn:'6h'
                });

                const userObject = {
                    name: user.name,
                    role: user.user_department
                }

                const response = {
                    user: userObject,
                    token: jwtToken,
                    expire: expired
                }

                return res.status(200).send(response);
            })            
        }).catch(e => {
            return res.status(401).send("Incorrect password or username");
        })
    }
);

router.get("/", authMiddleware, (req, res, next) => {
    res.status(200).send({
        status:"authorized"
    })
});

router.post("/token", authMiddleware, async(req, res, next) => {
    const token = req.body.token;
    const user = await prisma.user_token.findUnique({
        where:{
            token: token
        }
    });

    // If there is no one using this token
    // Then register this token to this user
    if(user == null){
        prisma.user_token.create({
            data: {
                token: token,
                user_id: req.body.userId
            }
        }).then(result => {
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    } else if(user.id != req.body.userId){
        prisma.$transaction([
            prisma.user_token.delete({
                where:{
                    token: token
                }
            }),
            prisma.user_token.create({
                data: {
                    user_id: req.body.userId,
                    token: token
                },
                select: {
                    token: true
                }
            })
        ]).then(result => {
            return res.status(200).send(result[1]);
        }).catch(error => {
            return res.status(500).send(error);
        })
    } else {
        return res.status(200).send({
            token: token
        })
    }
})

export default router;