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
                    department: user.user_department
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

export default router;