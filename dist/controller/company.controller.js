"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const escape_helper_1 = require("../helper/escape.helper");
class CompanyController {
    constructor(companyRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const address = req.body.address;
            const npwp = req.body.npwp == null
                ? null
                : req.body.npwp.toString().length == 15 ||
                    req.body.npwp.toString().length == 16
                    ? req.body.npwp
                    : null;
            const userID = req.body.userId;
            try {
                const company = await this.companyRepository.create({
                    name: name,
                    address: address,
                    npwp: npwp,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("createCompany", company);
                socket.create();
                return res.status(201).send(company);
            }
            catch (error) {
                console.error(`[error]: Error on creating company: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const id = req.body.id;
            const name = req.body.name;
            const address = req.body.address;
            const npwp = req.body.npwp == null ||
                req.body.npwp.toString().length != 15 ||
                req.body.npwp.toString().length != 16
                ? null
                : req.body.npwp;
            const userID = req.body.userId;
            try {
                const result = await this.companyRepository.update({
                    id: id,
                    name: name,
                    address: address,
                    npwp: npwp,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("updateCompany", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating company: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const company = await this.companyRepository.fetchByID(id);
                if (!company) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (company.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (!company.can_delete) {
                    return res.status(404).send(error_list_1.default["Unable to delete"]);
                }
                const result = await this.companyRepository.delete(id, userID);
                const socket = new socket_helper_1.default("deleteCompany", result);
                socket.create();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting company: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const pageSize = Number(process.env.LIMIT);
            try {
                const data = await this.companyRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(data);
            }
            catch (error) {
                console.error(`[error]: Error on fetching company: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const companies = await this.companyRepository.fetchAutocomplete(keyword);
                return res.status(200).send(companies);
            }
            catch (error) {
                console.error(`[error]: Error on fetching company autocomplete: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAll = async (req, res) => {
            try {
                const companies = await this.companyRepository.fetchAll();
                return res.status(200).send(companies);
            }
            catch (error) {
                console.error(`[error]: Error on fetching all companies: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            const company = await this.companyRepository.fetchByID(id);
            if (!company) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            if (company.is_delete) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            return res.status(200).send(company);
        };
        this.companyRepository = companyRepository;
    }
}
exports.default = CompanyController;
//# sourceMappingURL=company.controller.js.map