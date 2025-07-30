"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = require("bcryptjs");
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const redis_helper_1 = require("../helper/redis.helper");
const user_role_model_1 = require("../model/user_role.model");
const escape_helper_1 = require("../helper/escape.helper");
const achivement_model_1 = require("../model/achivement.model");
class UserController {
    constructor(userRepository, salesInvoiceRepository, customerRepository) {
        this.create = async (req, res) => {
            try {
                const username = req.body.username;
                const name = req.body.name;
                const nik = req.body.nik;
                const roleID = Number(req.body.role);
                const checkResult = await this.userRepository.check(username, nik);
                if (checkResult == 1) {
                    return res.status(404).send(error_list_1.default["User already exist"]);
                }
                const generated_password = await this.generatePassword();
                const hashedPassword = await this.hashPassword(generated_password);
                const data = {
                    name: name,
                    username: username,
                    nik: nik,
                    created_by: req.body.userId,
                    role: Number(req.body.role),
                    user_sales: req.body.user_sales,
                    is_active: true,
                    password: hashedPassword,
                };
                const validationErrors = this.userRepository.validateCreate(data);
                if (this.userRepository.validateCreate(data).length > 0) {
                    return res.status(400).send(validationErrors[0]);
                }
                const user = await this.userRepository.create(data);
                const result = {
                    id: user.id,
                    name: user.name,
                    nik: user.nik,
                    username: user.username,
                    password: generated_password,
                    role_id: roleID,
                    role: user_role_model_1.UserRoleModel.fromRoleID(roleID),
                    // user: user.user,
                };
                const socket = new socket_helper_1.default("createUser", result);
                socket.create();
                await redis_helper_1.redisClient.set(`user:${user.id}`, JSON.stringify(Object.assign(Object.assign({}, result), { pasword: undefined })));
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating user ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            try {
                const id = Number(req.params.id);
                const user = await this.userRepository.fetchByID(id);
                if (!user) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(user);
            }
            catch (error) {
                console.error(`[error]: Error on fetching user by ID ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            try {
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const pageSize = Number(process.env.LIMIT);
                const result = await this.userRepository.fetch({
                    page: page,
                    keyword: keyword,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching users ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchStatistics = async (req, res) => {
            const userID = req.body.userId;
            try {
                const customersCreated = await this.customerRepository.fetchSalesStatistics(userID);
                const salesInvoices = await this.salesInvoiceRepository.fetchSalesStatistics(userID);
                const achivements = new achivement_model_1.AchivementModel({
                    customer: customersCreated,
                    sales: salesInvoices,
                }).getAchivements();
                return res.status(200).send(achivements);
            }
            catch (error) {
                console.error(`[error]: Error on fetching user statistics ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const name = req.body.name;
            const id = req.body.id;
            const role = req.body.role;
            const userID = req.body.userId;
            const userSales = req.body.user_sales;
            const roleText = user_role_model_1.UserRoleModel.fromRoleID(role);
            if (roleText == null) {
                return res.status(400).send(error_list_1.default["Role not found"]);
            }
            try {
                const user = await this.userRepository.fetchByID(id);
                if (!user) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (!user.is_active) {
                    return res.status(400).send(error_list_1.default["User not active"]);
                }
                const result = await this.userRepository.update({
                    id: user.id,
                    nik: user.nik,
                    username: user.username,
                    name: name,
                    role: role,
                    user_sales: userSales,
                    created_by: userID,
                    created_at: new Date(),
                    is_active: user.is_active,
                });
                const socket = new socket_helper_1.default("updateUser", result);
                socket.create();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating user ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.toggleActive = async (req, res) => {
            try {
                const id = Number(req.params.id);
                if (!id || isNaN(id)) {
                    return res.status(400).send(error_list_1.default["Parameter error"]);
                }
                const user = await this.userRepository.fetchByID(id);
                if (!user) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const result = await this.userRepository.toggleActive(user.id, !user.is_active);
                if (user.is_active) {
                    const socket = new socket_helper_1.default("deleteUser", result);
                    socket.create();
                    redis_helper_1.redisClient.del(`user:${id}`);
                }
                else {
                    redis_helper_1.redisClient.set(`user:${id}`, JSON.stringify(result));
                }
                return res.status(201).send(result);
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
        this.updatePassword = async (req, res) => {
            try {
                const password = req.body.password;
                const hashedPassword = await (0, bcryptjs_1.hash)(password, 12);
                const userID = req.body.userId;
                const result = await this.userRepository.updatePassword(userID, hashedPassword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating password ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            try {
                const id = Number(req.params.id);
                const userID = req.body.userId;
                if (!id || isNaN(id)) {
                    return res.status(400).send(error_list_1.default["Parameter error"]);
                }
                const user = await this.userRepository.fetchByID(id);
                if (!user) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (!user.is_active) {
                    return res.status(400).send(error_list_1.default["User not active"]);
                }
                const result = await this.userRepository.delete(id, userID);
                await redis_helper_1.redisClient.del(`user:${id}`);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting user ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.userRepository = userRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.customerRepository = customerRepository;
    }
    async generatePassword() {
        let password = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 8; i++) {
            password +=
                characters[Math.floor(Math.random() * (characters.length - 1))];
        }
        return password;
    }
    async hashPassword(password) {
        return await (0, bcryptjs_1.hash)(password, 12);
    }
}
exports.default = UserController;
//# sourceMappingURL=user.controller.js.map