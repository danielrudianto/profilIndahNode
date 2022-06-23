import { Request, Response } from "express";
import UserModel from "../model/user.model";

class AuthController {
    static fetchRoles = (req: Request, res: Response) => {
        return res.status(200).send(UserModel.roles.filter(x => x.available));
    }

    static fetchProfile = (req: Request, res: Response) => {
        UserModel.fetchById(req.body.userId).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default AuthController;