"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const escape_helper_1 = require("../helper/escape.helper");
class CustomerController {
    constructor(customerRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const address = req.body.address;
            const pic = req.body.pic;
            const phone_number = req.body.phone_number;
            const npwp = (0, escape_helper_1.translateNPWP)(req.body.npwp);
            const userID = req.body.userId;
            try {
                const result = await this.customerRepository.create({
                    name: name,
                    address: address,
                    npwp: npwp,
                    pic: pic,
                    phone_number: phone_number,
                    created_by: userID,
                    created_at: new Date(),
                    can_delete: false,
                    is_delete: false,
                    deleted_at: null,
                    deleted_by: null,
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating customer: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const id = req.body.id;
            const name = req.body.name;
            const address = req.body.address;
            const npwp = (0, escape_helper_1.translateNPWP)(req.body.npwp);
            const pic = req.body.pic;
            const phone_number = req.body.phone_number;
            try {
                const existingCustomer = await this.customerRepository.fetchByID(id);
                if (!existingCustomer) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (existingCustomer.is_delete) {
                    return res.status(400).send(error_list_1.default["Not found"]);
                }
                const result = await this.customerRepository.update({
                    id: id,
                    name: name,
                    address: address,
                    npwp: npwp,
                    pic: pic,
                    phone_number: phone_number,
                    created_by: req.body.userId,
                    created_at: new Date(),
                    is_delete: false,
                    can_delete: false,
                    deleted_by: null,
                    deleted_at: null,
                });
                const socket = new socket_helper_1.default("updateCustomer", result);
                socket.create();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching customer: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const existingCustomer = await this.customerRepository.fetchByID(id);
                if (!existingCustomer) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (existingCustomer.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (!existingCustomer.can_delete) {
                    return res.status(400).send(error_list_1.default["Delete error"]);
                }
                const customer = await this.customerRepository.delete(id, userID);
                return res.status(200).send(customer);
            }
            catch (error) {
                console.error(`[error]: Error on deleting customer: ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const customer = await this.customerRepository.fetchByID(id);
                if (!customer) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(customer);
            }
            catch (error) {
                console.error(`[error]: Error on fetching customer by ID: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            // const pageSize = Number(process.env.LIMIT!);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await this.customerRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching customer data: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const result = await this.customerRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching customer data: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.customerRepository = customerRepository;
    }
}
exports.default = CustomerController;
//# sourceMappingURL=customer.controller.js.map