"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthFactory {
    // Create a factory that returns a new middleware
    static createMiddleware(roles) {
        return function (req, res, next) {
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
exports.default = AuthFactory;
//# sourceMappingURL=auth.factory.js.map