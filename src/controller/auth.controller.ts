import { Request, Response } from "express";
import UserModel from "../model/user.model";

class AuthController {
    static getRoles = (req: Request, res: Response) => {
        return res.status(200).send(UserModel.roles.filter(x => x.available));
    }
}

export default AuthController;