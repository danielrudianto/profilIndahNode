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
const app_1 = require("../app");
const error_list_1 = __importDefault(require("../assets/error_list"));
const queue_helper_1 = require("../helper/queue.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const product_package_model_1 = require("../model/product-package.model");
class ProductPackageController {
}
_a = ProductPackageController;
/**
 * Create a new product package
 * @param req
 * @param res
 */
ProductPackageController.create = (req, res) => {
    const package_content = req.body.package_content;
    const name = req.body.name;
    const price = req.body.price;
    const description = req.body.description;
    const userID = req.body.userId;
    product_package_model_1.ProductPackageCodeModel.create({
        name: name,
        description: description,
        price: price,
        items: package_content.map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
            };
        }),
        created_by: userID,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        yield queue_helper_1.queue.add("create-product-package", result);
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating product package: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch product packages with pagination
 * @param req
 * @param res
 */
ProductPackageController.fetch = (req, res) => {
    const page = !req.query.page ? 1 : parseInt(req.query.page);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const content = req.query.content;
    if (content == "true") {
        if (keyword == "") {
            product_package_model_1.ProductPackageCodeModel.fetch(page, keyword)
                .then((result) => {
                const data = result[0];
                const count = result[1];
                return res.status(200).send({
                    data: data.map((x) => {
                        return {
                            id: x.id,
                            name: x.name,
                            description: x.description,
                            price: x.price,
                            information: `${x.package_content.length} item${x.package_content.length > 1 ? "s" : ""}`,
                            package_content: x.package_content.map((x) => {
                                return {
                                    reference: x.item.reference,
                                    description: x.item.description,
                                    unit: x.item.unit,
                                    quantity: x.quantity,
                                    item_unit: x.item_unit,
                                };
                            }),
                            is_delete: x.is_delete,
                        };
                    }),
                    count: count,
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product package: ${error}`);
                return res.status(500).send(error);
            });
        }
        else {
            app_1.meili
                .index("package")
                .search(keyword, { limit: 10, offset: (page - 1) * 10 })
                .then((result) => {
                return res.status(200).send({
                    data: result.hits.map((x) => {
                        return {
                            id: x.id,
                            name: x.name,
                            description: x.description,
                            price: x.price,
                            information: `${x.product_content.length} item${x.product_content.length > 1 ? "s" : ""}`,
                            package_content: x.product_content.map((x) => {
                                return {
                                    reference: x.item.reference,
                                    description: x.item.description,
                                    unit: x.item.unit,
                                    quantity: x.quantity,
                                    item_unit: x.item_unit,
                                };
                            }),
                            is_delete: false,
                        };
                    }),
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product package: ${error}`);
                return res.status(500).send(error);
            });
        }
    }
    else {
        if (keyword == "") {
            product_package_model_1.ProductPackageCodeModel.fetch(page, keyword)
                .then((result) => {
                const data = result[0];
                const count = result[1];
                return res.status(200).send({
                    data: data.map((x) => {
                        return {
                            id: x.id,
                            name: x.name,
                            description: x.description,
                            price: x.price,
                            information: `${x.package_content.length} item${x.package_content.length > 1 ? "s" : ""}`,
                            is_delete: x.is_delete,
                        };
                    }),
                    count: count,
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product package: ${error}`);
                return res.status(500).send(error);
            });
        }
        else {
            app_1.meili
                .index("package")
                .search(keyword, { limit: 10, offset: (page - 1) * 10 })
                .then((result) => {
                return res.status(200).send({
                    data: result.hits.map((x) => {
                        return {
                            id: x.id,
                            name: x.name,
                            description: x.description,
                            price: x.price,
                            information: `${x.product_content.length} item${x.product_content.length > 1 ? "s" : ""}`,
                            is_delete: false,
                        };
                    }),
                });
            })
                .catch((error) => {
                console.error(`[error]: Error on fetching product package: ${error}`);
                return res.status(500).send(error);
            });
        }
    }
};
/**
 * Fetch product package by ID
 * @param req
 * @param res
 */
ProductPackageController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    product_package_model_1.ProductPackageCodeModel.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { price: result.price }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching product package by ID: ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Update product package by ID
 * @param req
 * @param res
 */
ProductPackageController.updateByID = (req, res) => {
    const price = req.body.price;
    const description = req.body.description;
    const name = req.body.name;
    const id = req.body.id;
    product_package_model_1.ProductPackageCodeModel.update(name, description, price, id)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        yield queue_helper_1.queue.add("update-product-package", result);
        const socket = new socket_helper_1.default("updateItemPackage", result);
        socket.create();
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on updating product package: ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Delete product package by ID
 * @param req
 * @param res
 */
ProductPackageController.deleteByID = (req, res) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    product_package_model_1.ProductPackageCodeModel.delete(id, userID)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        yield app_1.meili.index("package").deleteDocument(id);
        const socket = new socket_helper_1.default("deleteItemPackage", result);
        socket.create();
        return res.status(200).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on deleting product package: ${error}`);
        return res.status(500).send(error);
    });
};
exports.default = ProductPackageController;
//# sourceMappingURL=product-package.controller.js.map