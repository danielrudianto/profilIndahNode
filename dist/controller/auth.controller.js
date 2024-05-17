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
/**
 * Login
 * @param req
 * @param res
 */
AuthController.login = (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    user_model_1.default.fetchByUsername(username)
        .then((user) => {
        if (!user) {
            return res.status(400).send(error_list_1.default["Auth error"]);
        }
        if (!user.is_active) {
            return res.status(400).send(error_list_1.default["User not active"]);
        }
        (0, bcrypt_1.hash)(user.password, 12).then((hash) => {
            console.log(hash);
        });
        (0, bcrypt_1.compare)(password, user.password).then((result) => {
            if (!result) {
                return res.status(400).send(error_list_1.default["Auth error"]);
            }
            return res.status(200).send({
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                },
                token: (0, jsonwebtoken_1.sign)({
                    id: user.id,
                }, process.env.TOKEN_KEY.toString(), {
                    expiresIn: process.env.EXPIRATION,
                }),
                exp: new Date().getTime() +
                    parseInt(process.env.EXPIRATION.toString().replace("d", "")) *
                        24 *
                        60 *
                        60 *
                        1000,
                refreshToken: (0, jsonwebtoken_1.sign)({
                    id: user.id,
                }, process.env.REFRESH_TOKEN_KEY.toString(), {
                    expiresIn: process.env.REFRESH_EXPIRATION,
                }),
            });
        });
    })
        .catch((error) => {
        console.error(`[error]: Error while login. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Refresh token
 * @param req
 * @param res
 */
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
                exp: new Date().getTime() +
                    parseInt(process.env.EXPIRATION.toString().replace("d", "")) *
                        24 *
                        60 *
                        60 *
                        1000,
            });
        }
    });
};
/**
 * Fetch profile
 * @param req
 * @param res
 */
AuthController.fetchProfile = (req, res) => {
    user_model_1.default.fetchByID(req.body.userId)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Auth error"]);
        }
        if (!result.is_active) {
            return res.status(400).send(error_list_1.default["User not active"]);
        }
        return res.status(200).send({
            name: result === null || result === void 0 ? void 0 : result.name,
            username: result === null || result === void 0 ? void 0 : result.username,
            nik: result === null || result === void 0 ? void 0 : result.nik,
            role: user_model_1.default.roles.filter((x) => x.id == (result === null || result === void 0 ? void 0 : result.role))[0],
            is_active: result === null || result === void 0 ? void 0 : result.is_active,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error while fetching profile. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Reset password
 * @param req
 * @param res
 */
AuthController.updatePassword = (req, res) => {
    const user_id = parseInt(req.body.userId);
    const password = req.body.password;
    user_model_1.default.fetchByID(user_id)
        .then((user) => {
        if (!user) {
            return res.status(404).send(error_list_1.default["User not found"]);
        }
        if (!user.is_active) {
            return res.status(400).send(error_list_1.default["User not active"]);
        }
        // If password is not provided, generate random password
        // But if password is provided, hash it
        if (password == undefined || password == null) {
            let password = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < 8; i++) {
                password +=
                    characters[Math.floor(Math.random() * (characters.length - 1))];
            }
            (0, bcrypt_1.hash)(password, 12)
                .then((hashedPassword) => {
                user_model_1.default.updatePassword(hashedPassword, user.id)
                    .then((result) => {
                    return res.status(201).send(Object.assign(Object.assign({}, result), { password: password }));
                })
                    .catch((error) => {
                    console.error(`[error]: error on updating user ${error}`);
                    return res
                        .status(500)
                        .send(error_list_1.default["Internal server error"]);
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on hashing password ${error}}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
        else {
            (0, bcrypt_1.hash)(password, 12)
                .then((hashedPassword) => {
                user_model_1.default.updatePassword(hashedPassword, user.id)
                    .then((result) => {
                    return res.status(201).send(result);
                })
                    .catch((error) => {
                    console.error(`[error]: error on updating user ${error}`);
                    return res
                        .status(500)
                        .send(error_list_1.default["Internal server error"]);
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on hashing password ${error}}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            });
        }
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = AuthController;
//# sourceMappingURL=auth.controller.js.map