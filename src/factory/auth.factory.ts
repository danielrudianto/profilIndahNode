import { NextFunction, Request, Response } from "express";
// import { redisClient } from "../app";
import ErrorList from "../assets/error_list";

class AuthFactory {
  // Create a factory that returns a new middleware
  static createMiddleware(roles: number[]) {
    return function (req: Request, res: Response, next: NextFunction) {
      const userID = req.body.userID;
      // redisClient
      //   .get(`user:${userID}`)
      //   .then((result) => {
      //     if (!result) {
      //       return res.status(401).send(ErrorList["User not authorized"]);
      //     }

      //     const user = JSON.parse(result);
      //     if (roles.includes(user.role)) {
      //       next();
      //     } else {
      //       res.status(401).send(ErrorList["User not authorized"]);
      //     }
      //   })
      //   .catch((error) => {
      //     return res.status(401).send(ErrorList["User not authorized"]);
      //   });
    };
  }
}

export default AuthFactory;
