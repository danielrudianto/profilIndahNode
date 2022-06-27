import { compare } from "bcrypt";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { sign } from "jsonwebtoken";
import LogHelper from "../helper/log.helper";
import UserModel from "../model/user.model";
import UserTokenModel from "../model/user_token.model";

class AuthController {
  static login = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Please fill in the correct format.");
    }

    const username = req.body.username;
    const password = req.body.password;

    UserModel.fetchByUsername(username)
      .then((user) => {
        if (!user || !user.is_active) {
          LogHelper.log(
            new Date(),
            "warn",
            `Login failed for username ${username}`,
            "Auth controller - Login",
            0
          );

          return res.status(401).send("Incorrect password or username");
        }

        compare(password, user.password).then((result) => {
          if (!result) {
            return res.status(401).send("Incorrect password or username");
          }

          const expired = new Date().getTime() + 60 * 60 * 6 * 1000;
          const jwtToken = sign(
            {
              id: user.id,
            },
            process.env.TOKEN_KEY!.toString(),
            {
              expiresIn: "6h",
            }
          );

          const userObject = {
            id: user.id,
            name: user.name,
            role: user.user_department,
          };

          const response = {
            user: userObject,
            token: jwtToken,
            expire: expired,
          };

          LogHelper.log(
            new Date(),
            "info",
            `Login success for username ${username}`,
            "Auth controller - Login",
            userObject.id
          );

          return res.status(200).send(response);
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchRoles = (req: Request, res: Response) => {
    return res.status(200).send(UserModel.roles.filter((x) => x.available));
  };

  static fetchProfile = (req: Request, res: Response) => {
    UserModel.fetchById(req.body.userId)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          `Error`,
          `${error}`,
          `Auth controller - Fetch profile`,
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static saveToken = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Please fill in the correct format.");
    }

    const token = req.body.token;
    UserTokenModel.fetchByToken(token).then((user) => {
      if (user == null) {
        const tokenModel = new UserTokenModel(req.body.userId, token);
        tokenModel.create().then((user_token) => {
          LogHelper.log(
            new Date(),
            "info",
            `Successfully register new firebase token ${token}`,
            "Auth controller - Save token",
            req.body.userId
          );
          return res.status(201).send(user_token);
        });
      } else if (user.user_id != req.body.userId) {
        const tokenModel = new UserTokenModel(req.body.userId, token);
        tokenModel.upsert().then((user_token) => {
          LogHelper.log(
            new Date(),
            "info",
            `Successfully delete firebase token ${token} from user ${user_token[0].user.name}`,
            "Auth controller - Save token",
            req.body.userId
          );

          LogHelper.log(
            new Date(),
            "info",
            `Successfully register new firebase token ${token}`,
            "Auth controller - Save token",
            req.body.userId
          );
        });
      } else {
        // Token already registered for that particular user
        return res.status(200).send({
          token: token,
        });
      }
    });
  };
}

export default AuthController;
