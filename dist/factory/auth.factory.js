"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const error_list_1 = __importDefault(require("../assets/error_list"));
class AuthFactory {
    // Create a factory that returns a new middleware
    static createMiddleware(roles) {
        return function (req, res, next) {
            const userID = req.body.userID;
            app_1.redisClient
                .get(`user:${userID}`)
                .then((result) => {
                if (!result) {
                    return res.status(401).send(error_list_1.default["User not authorized"]);
                }
                const user = JSON.parse(result);
                if (roles.includes(user.role)) {
                    next();
                }
                else {
                    res.status(401).send(error_list_1.default["User not authorized"]);
                }
            })
                .catch((error) => {
                return res.status(401).send(error_list_1.default["User not authorized"]);
            });
        };
    }
}
exports.default = AuthFactory;
//# sourceMappingURL=auth.factory.js.map