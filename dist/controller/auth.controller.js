"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("bcrypt");
const jsonwebtoken_1 = require("jsonwebtoken");
const error_list_1 = __importDefault(require("../assets/error_list"));
const user_model_1 = __importDefault(require("../model/user.model"));
class AuthController {
}
AuthController.login = (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    user_model_1.default.fetchByUsername(username)
        .then((user) => {
        if (!user || !user.is_active) {
            return res.status(400).send(error_list_1.default["Auth error"]);
        }
        (0, bcrypt_1.compare)(password, user.password).then((result) => {
            if (!result) {
                return res.status(400).send(error_list_1.default["Auth error"]);
            }
            return res.status(200).send({
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.user_department,
                },
                token: (0, jsonwebtoken_1.sign)({
                    id: user.id,
                }, process.env.TOKEN_KEY.toString(), {
                    expiresIn: process.env.EXPIRATION,
                }),
                refreshToken: (0, jsonwebtoken_1.sign)({
                    id: user.id,
                }, process.env.REFRESH_TOKEN_KEY.toString(), {
                    expiresIn: process.env.REFRESH_EXPIRATION,
                }),
            });
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AuthController.fetchProfile = (req, res) => {
    user_model_1.default.fetchById(req.body.userId)
        .then((result) => {
        if (result == null || !result.is_active) {
            return res.status(404).send(error_list_1.default["Auth error"]);
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
        return res.status(500).send(error);
    });
};
AuthController.updatePassword = (req, res) => {
    const password = req.body.password;
    const userId = req.body.userId;
    (0, bcrypt_1.hash)(password, 12)
        .then((hashed_password) => {
        user_model_1.default.updatePassword(hashed_password, userId)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
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
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
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
                id: id,
            }, process.env.TOKEN_KEY.toString(), {
                expiresIn: process.env.EXPIRATION,
            });
            return res.status(200).send({
                token: jwtToken,
            });
        }
    });
};
exports.default = AuthController;
