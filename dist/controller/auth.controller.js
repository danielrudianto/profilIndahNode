"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("bcrypt");
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = require("jsonwebtoken");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const user_model_1 = __importDefault(require("../model/user.model"));
const user_token_model_1 = __importDefault(require("../model/user_token.model"));
class AuthController {
}
AuthController.login = (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.array().length > 0) {
        return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }
    const username = req.body.username;
    const password = req.body.password;
    user_model_1.default.fetchByUsername(username)
        .then((user) => {
        if (!user || !user.is_active) {
            log_helper_1.default.log(new Date(), "warn", `Login failed for username ${username}`, "Auth controller - Login", 0);
            return res.status(400).send("Username / kata sandi salah.");
        }
        (0, bcrypt_1.compare)(password, user.password).then((result) => {
            if (!result) {
                return res.status(400).send("Username / kata sandi salah.");
            }
            const jwtToken = (0, jsonwebtoken_1.sign)({
                id: user.id,
            }, process.env.TOKEN_KEY.toString(), {
                expiresIn: process.env.EXPIRATION,
            });
            const refreshToken = (0, jsonwebtoken_1.sign)({
                id: user.id
            }, process.env.REFRESH_TOKEN_KEY.toString(), {
                expiresIn: process.env.REFRESH_EXPIRATION
            });
            const userObject = {
                id: user.id,
                name: user.name,
                role: user.user_department,
            };
            const response = {
                user: userObject,
                token: jwtToken,
                refreshToken: refreshToken,
            };
            log_helper_1.default.log(new Date(), "info", `Login success for username ${username}`, "Auth controller - Login", userObject.id);
            return res.status(200).send(response);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AuthController.fetchRoles = (req, res) => {
    return res.status(200).send(user_model_1.default.roles.filter((x) => x.available));
};
AuthController.fetchProfile = (req, res) => {
    user_model_1.default.fetchById(req.body.userId)
        .then((result) => {
        if (result == null || !result.is_active) {
            return res.status(404).send("Pengguna tidak ditemukan.");
        }
        else {
            return res.status(200).send({
                name: result === null || result === void 0 ? void 0 : result.name,
                username: result === null || result === void 0 ? void 0 : result.username,
                nik: result === null || result === void 0 ? void 0 : result.nik,
                role: user_model_1.default.roles.filter((x) => { var _a; return x.id == ((_a = result === null || result === void 0 ? void 0 : result.user_department) === null || _a === void 0 ? void 0 : _a.role); })[0],
                is_active: result === null || result === void 0 ? void 0 : result.is_active,
            });
        }
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), `Error`, `${error}`, `Auth controller - Fetch profile`, req.body.userId);
        return res.status(500).send(error);
    });
};
AuthController.saveToken = (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.array().length > 0) {
        return res.status(400).send("Please fill in the correct format.");
    }
    const token = req.body.token;
    user_token_model_1.default.fetchByToken(token).then((user) => {
        if (user == null) {
            const tokenModel = new user_token_model_1.default(req.body.userId, token);
            tokenModel.create().then((user_token) => {
                log_helper_1.default.log(new Date(), "info", `Successfully register new firebase token ${token}`, "Auth controller - Save token", req.body.userId);
                return res.status(201).send(user_token);
            });
        }
        else if (user.user_id != req.body.userId) {
            const tokenModel = new user_token_model_1.default(req.body.userId, token);
            tokenModel.upsert().then((user_token) => {
                log_helper_1.default.log(new Date(), "info", `Successfully delete firebase token ${token} from user ${user_token[0].user.name}`, "Auth controller - Save token", req.body.userId);
                log_helper_1.default.log(new Date(), "info", `Successfully register new firebase token ${token}`, "Auth controller - Save token", req.body.userId);
            });
        }
        else {
            // Token already registered for that particular user
            return res.status(200).send({
                token: token,
            });
        }
    });
};
AuthController.updatePassword = (req, res) => {
    const password = req.body.password;
    const userId = req.body.userId;
    user_model_1.default.updatePassword(password, userId)
        .then((result) => {
        log_helper_1.default.log(new Date(), "info", `User ${result.name} update it's password (ID: ${result.id})`, "Auth controller - UPdate Password", req.body.userId);
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AuthController.resetPassword = (req, res) => {
    const user_id = parseInt(req.body.user_id);
    user_model_1.default.fetchById(user_id)
        .then((user) => {
        if (user == null || !user.is_active) {
            return res.status(404).send("Pengguna tidak ditemukan.");
        }
        else {
            // User is found and it's password will be reseted.
            let password = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < 8; i++) {
                password +=
                    characters[Math.floor(Math.random() * (characters.length - 1))];
            }
            (0, bcrypt_1.hash)(password, 12)
                .then((hashedPassword) => {
                user_model_1.default.update(user === null || user === void 0 ? void 0 : user.id, user === null || user === void 0 ? void 0 : user.name, hashedPassword, req.body.userId)
                    .then((result) => {
                    return res.status(201).send(Object.assign(Object.assign({}, result), { password: password }));
                })
                    .catch((error) => {
                    log_helper_1.default.log(new Date(), "error", error, "Auth controller - Reset password", req.body.userId);
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", error, "Auth controller - Reset password", req.body.userId);
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Auth controller - Reset password", req.body.userId);
        return res.status(500).send(error);
    });
};
AuthController.refreshToken = (req, res) => {
    var _a;
    let tokenHeader = (_a = req.headers["x-access-token"]) === null || _a === void 0 ? void 0 : _a.toString();
    if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
        return res.status(400).json({
            auth: false,
            message: "Format token tidak sesuai. Mohon coba login ulang.",
        });
    }
    let token = tokenHeader.split(" ")[1];
    if (!token) {
        return res.status(400).json({
            auth: false,
            message: "Token tidak tersedia. Mohon coba login ulang.",
        });
    }
    (0, jsonwebtoken_1.verify)(token, process.env.REFRESH_TOKEN_KEY, (err, decoded) => {
        if (err) {
            return res.status(400).send(err);
        }
        else {
            const id = parseInt(decoded.id);
            const jwtToken = (0, jsonwebtoken_1.sign)({
                id: id
            }, process.env.TOKEN_KEY.toString(), {
                expiresIn: process.env.EXPIRATION,
            });
            return res.status(200).send({
                token: jwtToken
            });
        }
    });
};
AuthController.administratorLogin = (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    user_model_1.default.fetchByUsername(username).then(user => {
        if (user == null || !user.is_active || user.user_department == null || user.user_department.role != 5) {
            return res.status(401).send("Pengguna tidak ditemukan.");
        }
        else {
            (0, bcrypt_1.compare)(password, user.password).then(result => {
                if (!result) {
                    return res.status(401).send("Kata sandi salah.");
                }
                else {
                    const jwtToken = (0, jsonwebtoken_1.sign)({
                        id: user.id,
                    }, process.env.TOKEN_KEY.toString(), {
                        expiresIn: process.env.EXPIRATION,
                    });
                    const refreshToken = (0, jsonwebtoken_1.sign)({
                        id: user.id
                    }, process.env.REFRESH_TOKEN_KEY.toString(), {
                        expiresIn: process.env.REFRESH_EXPIRATION
                    });
                    const userObject = {
                        id: user.id,
                        name: user.name,
                        role: user.user_department,
                    };
                    const response = {
                        user: userObject,
                        token: jwtToken,
                        refreshToken: refreshToken,
                    };
                    log_helper_1.default.log(new Date(), "info", `Login success for username ${username}`, "Auth controller - Login", userObject.id);
                    return res.status(200).send(response);
                }
            }).catch(error => {
                return res.status(500).send(error);
            });
        }
    }).catch(error => {
        return res.status(500).send(error);
    });
};
exports.default = AuthController;
