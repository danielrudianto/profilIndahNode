"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTypeController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class ProductTypeController {
    constructor(productTypeRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const userID = req.body.userId;
            try {
                const result = await this.productTypeRepository.create({
                    name: name,
                    created_by: userID,
                    created_at: new Date(),
                });
                const socket = new socket_helper_1.default("createItemType", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating item type: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const name = req.body.name;
            const id = req.body.id;
            const userID = req.body.userId;
            try {
                const result = await this.productTypeRepository.update({
                    name: name,
                    created_by: userID,
                    created_at: new Date(),
                    id: id,
                });
                const socket = new socket_helper_1.default("updateItemType", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating item type: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = Number(req.body.userId);
            try {
                const productType = await this.productTypeRepository.fetchByID(id);
                if (!productType) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (productType.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const result = await this.productTypeRepository.delete(id, userID);
                const socket = new socket_helper_1.default("deleteItemType", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item type by ID: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            // const pageSize = Number(process.env.LIMIT!);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await this.productTypeRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item types: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.productTypeRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (result.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item type by ID: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAll = async (req, res) => {
            try {
                const result = await this.productTypeRepository.fetchAll();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item types: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const result = await this.productTypeRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching autocomplete item types: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.productTypeRepository = productTypeRepository;
    }
}
exports.ProductTypeController = ProductTypeController;
//# sourceMappingURL=product-type.controller.js.map