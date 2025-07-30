"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("bcrypt");
const jsonwebtoken_1 = require("jsonwebtoken");
const error_list_1 = __importDefault(require("../assets/error_list"));
class AuthController {
    constructor(userRepository) {
        this.login = async (req, res) => {
            const username = req.body.username;
            const password = req.body.password;
            try {
                const user = await this.userRepository.fetchByUsername(username);
                if (!user) {
                    return res.status(400).send(error_list_1.default["Auth error"]);
                }
                if (!user.is_active) {
                    return res.status(400).send(error_list_1.default["User not active"]);
                }
                const isPasswordValid = await (0, bcrypt_1.compare)(password, user.password);
                if (!isPasswordValid) {
                    return res.status(400).send(error_list_1.default["Auth error"]);
                }
                const token = (0, jsonwebtoken_1.sign)({ id: user.id }, process.env.TOKEN_KEY.toString(), {
                    expiresIn: process.env.EXPIRATION,
                });
                const refreshToken = (0, jsonwebtoken_1.sign)({ id: user.id }, process.env.REFRESH_TOKEN_KEY.toString(), {
                    expiresIn: process.env.REFRESH_EXPIRATION,
                });
                return res.status(200).send({
                    user: {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        roleText: user.roleText,
                    },
                    user_avatar: user.user_avatar,
                    token: token,
                    exp: new Date().getTime() +
                        parseInt(process.env.EXPIRATION.toString().replace("d", "")) * 1000,
                    refreshToken: refreshToken,
                });
            }
            catch (error) {
                console.error(`[error]: Error while login. ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.updatePassword = async (req, res) => {
            const userID = parseInt(req.body.userId);
            const password = req.body.password;
            const user = await this.userRepository.fetchByID(userID);
            if (!user) {
                return res.status(404).send(error_list_1.default["User not found"]);
            }
            if (!user.is_active) {
                return res.status(400).send(error_list_1.default["User not active"]);
            }
            // If password is not provided, generate random password
            // But if password is provided, hash it
            if (password == undefined || password == null || password == "") {
                const randomPassword = this.generateRandomPassword();
                const hashedPassword = await this.hashPassword(randomPassword);
                try {
                    const result = await this.userRepository.updatePassword(userID, hashedPassword);
                    return res.status(201).send(Object.assign(Object.assign({}, result), { password: randomPassword }));
                }
                catch (error) {
                    console.error(`[erroFr]: error on updating user ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                }
            }
            else {
                try {
                    const hashedPassword = await this.hashPassword(password);
                    const result = await this.userRepository.updatePassword(userID, hashedPassword);
                    return res.status(201).send(Object.assign(Object.assign({}, result), { password: password }));
                }
                catch (error) {
                    console.error(`[error]: error on updating user ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                }
            }
        };
        this.generateRandomPassword = () => {
            let password = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (let i = 0; i < 8; i++) {
                password +=
                    characters[Math.floor(Math.random() * (characters.length - 1))];
            }
            return password;
        };
        this.hashPassword = async (password) => {
            try {
                return await (0, bcrypt_1.hash)(password, 12);
            }
            catch (error) {
                console.error(`[error]: Error on hashing password ${error}`);
                throw new Error(error_list_1.default["Internal server error"]);
            }
        };
        this.refreshToken = async (req, res) => {
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
        this.fetchProfile = async (req, res) => {
            const userID = Number(req.body.userId);
            try {
                const user = await this.userRepository.fetchByID(userID);
                if (!user) {
                    return res.status(404).send(error_list_1.default["User not found"]);
                }
                if (!user.is_active) {
                    return res.status(400).send(error_list_1.default["User not active"]);
                }
                return res.status(200).send(user);
            }
            catch (error) {
                console.error(`[error]: Error while fetching profile. ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.userRepository = userRepository;
    }
}
exports.default = AuthController;
//# sourceMappingURL=auth.controller.js.map