"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const meili_helper_1 = require("../helper/meili.helper");
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const product_package_model_1 = require("../model/product-package.model");
const queue_helper_1 = require("../helper/queue.helper");
class ProductPackageController {
    constructor(productPackageRepository) {
        this.create = async (req, res) => {
            const package_content = req.body.package_content;
            const name = req.body.name;
            const price = req.body.price;
            const description = req.body.description;
            const userID = req.body.userId;
            try {
                const result = await this.productPackageRepository.create({
                    name: name,
                    description: description,
                    price: price,
                    created_by: userID,
                    created_at: new Date(),
                    package_content: package_content.map((x) => {
                        return {
                            product_id: x.product_id,
                            product_unit_id: x.product_unit_id,
                            quantity: x.quantity,
                            price: x.price,
                        };
                    }),
                });
                await meili_helper_1.meili.index("package").addDocuments([result]);
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating product package: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const price = req.body.price;
            const description = req.body.description;
            const name = req.body.name;
            const id = req.body.id;
            const userID = req.body.userId;
            try {
                const productPackage = await this.productPackageRepository.fetchByID(id);
                if (!productPackage) {
                    return res.status(404).send(error_list_1.default["Product package not found"]);
                }
                const result = await this.productPackageRepository.update({
                    id: id,
                    name: name,
                    description: description,
                    price: price,
                    created_by: userID,
                    created_at: new Date(),
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating product package: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.updateSalesPrice = async (req, res) => {
            try {
                const items = req.body.items;
                const result = await this.productPackageRepository.updateSalesPrice(items);
                for (let item of items) {
                    await queue_helper_1.queue.add("package-updated", { id: item.package_code_id });
                }
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error updating sales price ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const packageCode = await this.productPackageRepository.fetchByID(id);
                if (!packageCode) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (packageCode.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const result = await this.productPackageRepository.delete(id, userID);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                await meili_helper_1.meili.index("package").deleteDocument(id);
                const socket = new socket_helper_1.default("deleteItemPackage", result);
                socket.create();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting product package: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const content = req.query.content;
            const pageSize = Number(process.env.LIMIT);
            const result = await meili_helper_1.meili.index("package").search(keyword, {
                limit: pageSize,
                offset: (page - 1) * pageSize,
            });
            return res.status(200).send({
                data: result.hits.map((x) => {
                    return new product_package_model_1.PackageCodeModel({
                        id: x.id,
                        name: x.name,
                        description: x.description,
                        price: x.price,
                        package_content: x.package_content.map((item) => {
                            return {
                                product_id: item.product_id,
                                product_unit_id: item.product_unit_id,
                                quantity: item.quantity,
                                price: item.price,
                                discount: item.discount,
                                product: {
                                    id: item.product.id,
                                    reference: item.product.reference,
                                    description: item.product.description,
                                    unit: item.product.unit,
                                },
                                product_unit: item.product_unit
                                    ? {
                                        id: item.product_unit.id,
                                        conversion: item.product_unit.conversion,
                                        unit: item.product_unit.unit,
                                    }
                                    : null,
                            };
                        }),
                        is_delete: false, // Assuming is_delete is false for fetched packages
                    });
                }),
                count: result.estimatedTotalHits,
            });
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.productPackageRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching product package by ID ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.productPackageRepository = productPackageRepository;
    }
}
exports.default = ProductPackageController;
//# sourceMappingURL=product-package.controller.js.map