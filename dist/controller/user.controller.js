"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = require("bcryptjs");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const customer_model_1 = __importDefault(require("../model/customer.model"));
const user_model_1 = __importDefault(require("../model/user.model"));
const user_avatar_model_1 = __importDefault(require("../model/user-avatar.model"));
class UserController {
}
_a = UserController;
/**
 * Create a new user
 * @param req
 * @param res
 * @returns User
 */
UserController.create = (req, res) => {
    const roleID = parseInt(req.body.role);
    const role = user_model_1.default.roles.filter((x) => x.id == roleID && x.available);
    const username = req.body.username;
    const nik = req.body.nik;
    const name = req.body.name;
    const userID = req.body.userId;
    const types = req.body.user_sales;
    if (role.length == 0 || role == null) {
        return res.status(400).send(error_list_1.default["Role not found"]);
    }
    user_model_1.default.checkByCredential(username, nik).then((check) => {
        if (!check) {
            return res.status(404).send(error_list_1.default["User already exist"]);
        }
        let password = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 8; i++) {
            password +=
                characters[Math.floor(Math.random() * (characters.length - 1))];
        }
        (0, bcryptjs_1.hash)(password, 12)
            .then((hashedPassword) => {
            if (roleID == 6) {
                user_model_1.default.create({
                    name: name,
                    nik: nik,
                    username: username,
                    password: hashedPassword,
                    created_by: userID,
                    role: roleID,
                    user_sales: types,
                })
                    .then((result) => {
                    var _b, _c;
                    const socket = new socket_helper_1.default("createUser", {
                        id: result.id,
                        name: result.name,
                        nik: result.nik,
                        username: result.username,
                        password: password,
                        role_id: roleID,
                        role: ((_b = user_model_1.default.fetchRole(roleID)) === null || _b === void 0 ? void 0 : _b.name) || "",
                        user: result.user,
                    });
                    socket.create();
                    return res.status(201).send({
                        id: result.id,
                        name: result.name,
                        nik: result.nik,
                        username: result.username,
                        password: password,
                        role_id: roleID,
                        role: ((_c = user_model_1.default.fetchRole(roleID)) === null || _c === void 0 ? void 0 : _c.name) || "",
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on creating user. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
            else {
                user_model_1.default.create({
                    name: name,
                    nik: nik,
                    username: username,
                    password: hashedPassword,
                    created_by: userID,
                    role: roleID,
                })
                    .then((result) => {
                    var _b, _c;
                    const socket = new socket_helper_1.default("createUser", {
                        id: result.id,
                        name: result.name,
                        nik: result.nik,
                        username: result.username,
                        password: password,
                        role_id: roleID,
                        role: ((_b = user_model_1.default.fetchRole(roleID)) === null || _b === void 0 ? void 0 : _b.name) || "",
                        user: result.user,
                    });
                    socket.create();
                    return res.status(201).send({
                        id: result.id,
                        name: result.name,
                        nik: result.nik,
                        username: result.username,
                        password: password,
                        role_id: roleID,
                        role: ((_c = user_model_1.default.fetchRole(roleID)) === null || _c === void 0 ? void 0 : _c.name) || "",
                    });
                })
                    .catch((error) => {
                    console.error(`[error]: Error on creating user. ${error}`);
                    return res.status(500).send(error_list_1.default["Internal server error"]);
                });
            }
        })
            .catch((error) => {
            console.error(`[error]: Error while hashing password. ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Fetch user by ID
 * @param req
 * @param res
 */
UserController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    user_model_1.default.fetchByID(id)
        .then((user) => {
        if (!user) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, user), { role: user_model_1.default.roles.filter((y) => y.id == (user === null || user === void 0 ? void 0 : user.role))[0].name, user_sales: user.user_sales.length == 0 ? [] : user.user_sales }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch users using pagination
 * @param req
 * @param res
 */
UserController.fetch = (req, res) => {
    var _b;
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt((_b = req.query.page) === null || _b === void 0 ? void 0 : _b.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT.toString());
    const offset = (page - 1) * limit;
    user_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    nik: x.nik,
                    name: x.name,
                    username: x.username,
                    user_department: x.role,
                    role: user_model_1.default.roles.filter((y) => y.id == (x === null || x === void 0 ? void 0 : x.role))[0].name,
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch user stats
 * @param req
 * @param res
 * @returns The achievement of the user
 */
UserController.fetchStats = (req, res) => {
    const id = req.body.userId;
    Promise.all([
        bill_model_1.default.fetchSalesByUserID(id),
        customer_model_1.default.fetchBySales(id),
    ]).then((result) => {
        const customers = result[1];
        const value = result[0] == null || result[0].length == 0 ? 0 : result[0][0].value;
        const discount = result[0] == null || result[0].length == 0 ? 0 : result[0][0].discount;
        const delivery = result[0] == null || result[0].length == 0 ? 0 : result[0][0].delivery;
        const service = result[0] == null || result[0].length == 0 ? 0 : result[0][0].service;
        var totalSales = value + delivery + service - discount;
        const achivements = [
            {
                name: "Ordinary sales",
                shortName: "OrdinarySales",
                description: "Sales value is more than 10.000.000 IDR",
                value: totalSales > 10000000 ? 10000000 : totalSales,
                target: 10000000,
                achieved: totalSales > 10000000,
            },
            {
                name: "Extraordinary sales",
                shortName: "ExtraordinarySales",
                description: "Sales value is more than 100.000.000 IDR",
                value: totalSales > 100000000 ? 100000000 : totalSales,
                target: 100000000,
                achieved: totalSales > 100000000,
            },
            {
                name: "Super sales",
                shortName: "SuperSales",
                description: "Sales value is more than 1.000.000.000 IDR",
                value: totalSales >= 1000000000 ? 1000000000 : totalSales,
                target: 1000000000,
                achieved: totalSales > 1000000000,
            },
            {
                name: "Mega sales",
                shortName: "MegaSales",
                description: "Sales value is more than 10.000.000.000 IDR",
                value: totalSales >= 10000000000 ? 10000000000 : totalSales,
                target: 10000000000,
                achieved: totalSales > 10000000000,
            },
            {
                name: "Junior customer hunter",
                shortName: "JuniorCustomerHunter",
                description: "Acquired new customer",
                value: customers >= 1 ? 1 : customers,
                target: 1,
                achieved: customers >= 1,
            },
            {
                name: "Customer hunter",
                shortName: "CustomerHunter",
                description: "Acquired more than 50 new customer",
                value: customers >= 50 ? 50 : customers,
                target: 50,
                achieved: customers >= 50,
            },
            {
                name: "Senior customer hunter",
                shortName: "SeniorCustomerHunter",
                description: "Acquired more than 150 new customer",
                value: customers >= 150 ? 150 : customers,
                target: 150,
                achieved: customers >= 250,
            },
            {
                name: "Master customer hunter",
                shortName: "MasterCustomerHunter",
                description: "Acquired more than 500 new customer",
                value: customers >= 500 ? 500 : customers,
                target: 500,
                achieved: customers >= 500,
            },
        ];
        return res.status(200).send(achivements);
    });
};
/**
 * Update avatar
 * @param req
 * @param res
 */
UserController.updateAvatar = (req, res) => {
    const userID = req.body.userId;
    const top = req.body.top;
    const accessories = req.body.accessories;
    const eyes = req.body.eyes;
    const circle = req.body.circle;
    const clothes = req.body.clothes;
    const color = req.body.color;
    const eyebrows = req.body.eyebrows;
    const mouth = req.body.mouth;
    new user_avatar_model_1.default(userID, top, accessories, eyes, circle, clothes, color, eyebrows, mouth)
        .create()
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating user's avatar ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Update user data
 * @param req
 * @param res
 */
UserController.update = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleID = req.body.role;
    const role = user_model_1.default.fetchRole(roleID);
    const userID = req.body.userId;
    const userSales = req.body.user_sales;
    if (!role) {
        return res.status(400).send(error_list_1.default["Role not found"]);
    }
    user_model_1.default.fetchByID(id)
        .then((user) => __awaiter(void 0, void 0, void 0, function* () {
        if (!user) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!user.is_active) {
            return res.status(400).send(error_list_1.default["User not active"]);
        }
        user_model_1.default.update({
            id: id,
            username: user.username,
            nik: user.nik,
            name: name,
            created_by: userID,
            password: null,
            role: roleID,
            user_sales: userSales,
        })
            .then((result) => {
            const socket = new socket_helper_1.default("updateUser", {
                id: result.id,
                name: result.name,
                nik: result.nik,
                username: result.username,
                password: null,
                role: role.name,
            });
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on updating user ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }))
        .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
UserController.toggleActive = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    try {
        const id = parseInt(req.params.id);
        user_model_1.default.fetchByID(id)
            .then((user) => {
            if (user == null) {
                return res.status(404).send("Pengguna tidak ditemukan.");
            }
            user_model_1.default.delete(user.id, !user.is_active, req.body.userId)
                .then((user_delete) => {
                // If user was active and no longer active
                // Log him / her out from our system immidiately
                if (user.is_active) {
                    const socket = new socket_helper_1.default("deleteUser", user_delete);
                    socket.create();
                }
                return res.status(201).send(user_delete);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            return res.status(500).send(err);
        }
        else {
            return res.status(500).send(error_list_1.default["Unknown error"]);
        }
    }
};
/**
 * Update user password
 */
UserController.updatePassword = (req, res) => {
    const password = req.body.password;
    (0, bcryptjs_1.hash)(password, 12).then((hashed_password) => {
        user_model_1.default.updatePassword(hashed_password, req.body.userId)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    });
};
exports.default = UserController;
//# sourceMappingURL=user.controller.js.map