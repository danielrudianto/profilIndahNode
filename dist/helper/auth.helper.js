"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superadministratorMiddleware = exports.administratorMiddleware = exports.authMiddleware = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const client_1 = require("@prisma/client");
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
            prisma.user
                .findFirst({
                where: {
                    id: decodedData.id,
                    is_active: true,
                },
            })
                .then((user) => {
                // If user is still active, then proceed
                if (user == null || !user.is_active) {
                    return res.status(401).send("User not authorized");
                }
                req.body.userId = decodedData.id;
                next();
            })
                .catch(() => {
                return res.status(401).send("User not authorized");
            });
        }
        else {
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
                    role: true,
                    id: true,
                    is_active: true,
                },
            })
                .then((user) => {
                // If user is still active, then proceed
                if (user == null || !user.is_active) {
                    return res.status(401).send("User not authorized");
                }
                else if ((user === null || user === void 0 ? void 0 : user.role) == 5 || (user === null || user === void 0 ? void 0 : user.role) == 7) {
                    next();
                }
                else {
                    return res.status(400).send("Non-administrator user");
                }
            })
                .catch(() => {
                return res.status(400).send("Non-administrator user");
            });
        }
        else {
            return res.status(400).send("Non-administrator user");
        }
    });
};
exports.administratorMiddleware = administratorMiddleware;
const superadministratorMiddleware = (req, res, next) => {
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
                    role: true,
                    id: true,
                    is_active: true,
                },
            })
                .then((user) => {
                // If user is still active, then proceed
                if (user == null || !user.is_active) {
                    return res.status(401).send("User not authorized");
                }
                else if ((user === null || user === void 0 ? void 0 : user.role) == 7) {
                    next();
                }
                else {
                    return res.status(400).send("Non-administrator user");
                }
            })
                .catch(() => {
                return res.status(400).send("Non-administrator user");
            });
        }
        else {
            return res.status(400).send("Non-administrator user");
        }
    });
};
exports.superadministratorMiddleware = superadministratorMiddleware;
//# sourceMappingURL=auth.helper.js.map