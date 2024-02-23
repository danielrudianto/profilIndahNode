"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.administratorMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const client_1 = require("@prisma/client");
const error_list_1 = __importDefault(require("../assets/error_list"));
const app_1 = require("../app");
const prisma = new client_1.PrismaClient();
const authMiddleware = (req, res, next) => {
    var _a;
    let tokenHeader = (_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.toString();
    if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
        return res.status(401).json({
            auth: false,
            message: "Incorrect token format",
        });
    }
    let token = tokenHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            auth: false,
            message: "No token provided",
        });
    }
    (0, jsonwebtoken_1.verify)(token, process.env.TOKEN_KEY, (error, decoded) => {
        if (!error) {
            const decodedData = decoded;
            app_1.redisClient.get(`user:${decodedData.id}`).then((user) => {
                if (!user) {
                    return res.status(401).send(error_list_1.default["User not authorized"]);
                }
                req.body.userID = decodedData.id;
                next();
            });
        }
        else {
            console.log(`[error]: Error on retrieving token: ${error}`);
            return res.status(401).send("User not authorized");
        }
    });
};
exports.authMiddleware = authMiddleware;
const administratorMiddleware = (req, res, next) => {
    var _a;
    let tokenHeader = (_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.toString();
    if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
        return res.status(401).json({
            auth: false,
            message: "Incorrect token format",
        });
    }
    let token = tokenHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            auth: false,
            message: "No token provided",
        });
    }
    (0, jsonwebtoken_1.verify)(token, process.env.TOKEN_KEY, (error, decoded) => {
        if (!error) {
            const decodedData = decoded;
            prisma.user
                .findFirst({
                where: {
                    id: decodedData.id,
                    is_active: true,
                },
                select: {
                    id: true,
                    is_active: true,
                    role: true,
                },
            })
                .then((user) => {
                // If user is still active, then proceed
                if (user == null || !user.is_active) {
                    return res.status(401).send(error_list_1.default["User not authorized"]);
                }
                else if (user.role == 5) {
                    next();
                }
                else {
                    return res.status(400).send(error_list_1.default["Non-administrator user"]);
                }
            })
                .catch(() => {
                return res.status(400).send(error_list_1.default["Non-administrator user"]);
            });
        }
        else {
            return res.status(400).send(error_list_1.default["Non-administrator user"]);
        }
    });
};
exports.administratorMiddleware = administratorMiddleware;
//# sourceMappingURL=auth.helper.js.map