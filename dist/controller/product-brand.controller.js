"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductBrandController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class ProductBrandController {
    constructor(productBrandRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const userID = req.body.userId;
            const validation = await this.productBrandRepository.fetchByName(name);
            if (validation != null) {
                return res.status(400).send(error_list_1.default["Brand unique constraint"]);
            }
            const result = await this.productBrandRepository.create({
                name: name,
                created_by: userID,
                created_at: new Date(),
            });
            const socket = new socket_helper_1.default("createBrand", result);
            socket.create();
            return res.status(201).send(result);
        };
        this.update = async (req, res) => {
            const id = req.body.id;
            const name = req.body.name;
            const userID = req.body.userId;
            try {
                const existingBrand = await this.productBrandRepository.fetchByID(id);
                if (!existingBrand) {
                    return res.status(400).send(error_list_1.default["Not found"]);
                }
                if (existingBrand.is_delete) {
                    return res.status(400).send(error_list_1.default["Not found"]);
                }
                const result = await this.productBrandRepository.update({
                    name: name,
                    id: id,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("updateBrand", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating brand ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = parseInt(req.params.id);
            const userID = req.body.userId;
            try {
                const existingBrand = await this.productBrandRepository.fetchByID(id);
                if (!existingBrand) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (existingBrand.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (!existingBrand.can_delete) {
                    return res.status(400).send(error_list_1.default["Unable to delete"]);
                }
                const result = await this.productBrandRepository.delete(id, userID);
                const socket = new socket_helper_1.default("deleteBrand", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting brand ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const result = await this.productBrandRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error while fetching autocomplete brands: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.productBrandRepository.fetchByID(id);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error while fetching brand by ID: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            // const pageSize = parseInt(process.env.LIMIT!);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await this.productBrandRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error while fetching brands: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.productBrandRepository = productBrandRepository;
    }
}
exports.ProductBrandController = ProductBrandController;
//# sourceMappingURL=product-brand.controller.js.map