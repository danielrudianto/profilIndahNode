"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = require("bcryptjs");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const customer_model_1 = __importDefault(require("../model/customer.model"));
const user_model_1 = __importDefault(require("../model/user.model"));
const user_role_model_1 = __importDefault(require("../model/user_role.model"));
class UserController {
}
UserController.create = (req, res) => {
    const roleId = parseInt(req.body.role);
    const role = user_model_1.default.roles.filter((x) => x.id == roleId && x.available);
    const username = req.body.username;
    const nik = req.body.nik;
    const name = req.body.name;
    if (role.length == 0 || role == null) {
        return res.status(500).send("Peran tidak ditemukan.");
    }
    user_model_1.default.fetchByIdentifiers(username, nik).then((count) => {
        if (count > 0) {
            return res.status(400).send(error_list_1.default["Duplicate error"]);
        }
        else {
            let password = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < 8; i++) {
                password +=
                    characters[Math.floor(Math.random() * (characters.length - 1))];
            }
            (0, bcryptjs_1.hash)(password, 12)
                .then((hashedPassword) => {
                const user = new user_model_1.default(name, nik, username, hashedPassword, req.body.userId);
                user
                    .create()
                    .then((user_create) => {
                    const user_role = new user_role_model_1.default(user_create.id, roleId);
                    user_role
                        .create()
                        .then((user_role_create) => {
                        const socket = new socket_helper_1.default("createUser", {
                            id: user_create.id,
                            name: user_create.name,
                            nik: user_create.nik,
                            username: user_create.username,
                            password: password,
                            role_id: user_role_create.role,
                            role: user_model_1.default.roles.filter((x) => x.id == user_role_create.role)[0].name,
                            user: user_create.user,
                        });
                        socket.create();
                        return res.status(201).send({
                            id: user_create.id,
                            name: user_create.name,
                            nik: user_create.nik,
                            username: user_create.username,
                            password: password,
                            role_id: user_role_create.role,
                            role: user_model_1.default.roles.filter((x) => x.id == user_role_create.role)[0].name,
                        });
                    })
                        .catch((error) => {
                        return res.status(500).send(error);
                    });
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
UserController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    user_model_1.default.fetchById(id)
        .then((user) => {
        if (user == null) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, user), { role: user_model_1.default.roles.filter((y) => { var _a; return y.id == ((_a = user.user_department) === null || _a === void 0 ? void 0 : _a.role); })[0].name }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
UserController.fetch = (req, res) => {
    var _a, _b;
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt((_a = req.query.page) === null || _a === void 0 ? void 0 : _a.toString()));
    const keyword = !req.query.keyword ? "" : (_b = req.query.keyword) === null || _b === void 0 ? void 0 : _b.toString();
    const limit = parseInt(process.env.LIMIT.toString());
    const offset = (page - 1) * limit;
    user_model_1.default.fetch(keyword, offset, limit)
        .then((result) => {
        const response = [];
        result[0].forEach((x) => {
            response.push({
                id: x.id,
                nik: x.nik,
                name: x.name,
                username: x.username,
                user_department: x.user_department,
                role: x.user_department == null
                    ? null
                    : user_model_1.default.roles.filter((y) => { var _a; return y.id == ((_a = x.user_department) === null || _a === void 0 ? void 0 : _a.role); })[0].name,
            });
        });
        return res.status(200).send({
            data: response,
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
UserController.update = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleId = req.body.role;
    const role = user_model_1.default.roles.filter((x) => x.id == roleId && x.available);
    const userID = req.body.userId;
    if (role == null || role.length == 0) {
        return res.status(400).send(error_list_1.default["Parameter error"]);
    }
    else {
        user_model_1.default.fetchById(id)
            .then((user) => {
            if (user == null || !user.is_active) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                const userRoleModel = new user_role_model_1.default(id, role[0].id);
                Promise.all([
                    user_model_1.default.update(id, name, null, userID),
                    userRoleModel.update(),
                ])
                    .then((result) => {
                    const user_object = {
                        id: result[0].id,
                        name: result[0].name,
                        nik: result[0].nik,
                        username: result[0].username,
                        password: null,
                        role: user_model_1.default.roles.filter((x) => x.id == result[1].role)[0],
                    };
                    const socket = new socket_helper_1.default("updateUser", user_object);
                    socket.create();
                    return res.status(201).send(user_object);
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
UserController.toggleActive = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    try {
        const id = parseInt(req.params.id);
        user_model_1.default.fetchById(id)
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
UserController.changePassword = (req, res) => {
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
UserController.fetchStats = (req, res) => {
    const id = req.body.userId;
    Promise.all([
        bill_model_1.default.fetchBySales(id),
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
                value: totalSales,
                target: 10000000,
                achieved: totalSales > 10000000,
            },
            {
                name: "Extraordinary sales",
                shortName: "ExtraordinarySales",
                description: "Sales value is more than 100.000.000 IDR",
                value: totalSales,
                target: 100000000,
                achieved: totalSales > 100000000,
            },
            {
                name: "Super sales",
                shortName: "SuperSales",
                description: "Sales value is more than 1.000.000.000 IDR",
                value: totalSales,
                target: 1000000000,
                achieved: totalSales > 1000000000,
            },
            {
                name: "Mega sales",
                shortName: "MegaSales",
                description: "Sales value is more than 10.000.000.000 IDR",
                value: totalSales,
                target: 10000000000,
                achieved: totalSales > 10000000000,
            },
            {
                name: "Junior customer hunter",
                shortName: "JuniorCustomerHunter",
                description: "Acquired new customer",
                value: customers,
                target: 1,
                achieved: customers >= 1,
            },
            {
                name: "Customer hunter",
                shortName: "CustomerHunter",
                description: "Acquired more than 50 new customer",
                value: customers,
                target: 50,
                achieved: customers >= 50,
            },
            {
                name: "Senior customer hunter",
                shortName: "SeniorCustomerHunter",
                description: "Acquired more than 150 new customer",
                value: customers,
                target: 150,
                achieved: customers >= 250,
            },
            {
                name: "Master customer hunter",
                shortName: "MasterCustomerHunter",
                description: "Acquired more than 500 new customer",
                value: customers,
                target: 500,
                achieved: customers >= 500,
            },
        ];
        return res.status(200).send(achivements);
    });
};
exports.default = UserController;
