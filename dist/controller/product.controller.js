"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const product_model_1 = require("../model/product.model");
const error_list_1 = __importDefault(require("../assets/error_list"));
const meili_helper_1 = require("../helper/meili.helper");
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
class ProductController {
    constructor(productRepository, productUnitRepository, stockCardRepository) {
        this.create = async (req, res) => {
            const reference = req.body.reference;
            const description = req.body.description;
            const product_brand_id = req.body.product_brand_id;
            const product_type_id = req.body.product_type_id;
            const minimum_stock = req.body.minimum_stock;
            const userID = req.body.userId;
            const unit = req.body.unit;
            const sales_price = req.body.sales_price;
            const sales_discount = req.body.sales_discount;
            const purchase_price = req.body.purchase_price;
            const purchase_discount = req.body.purchase_discount;
            const created_at = new Date();
            const units = req.body.units;
            try {
                const existingItem = await this.productRepository.fetchByReference(reference);
                if (existingItem != null) {
                    return res.status(400).send(error_list_1.default["Reference unique constraint"]);
                }
                const product = await this.productRepository.create({
                    reference: reference,
                    description: description,
                    product_brand_id: product_brand_id,
                    product_type_id: product_type_id,
                    created_by: userID,
                    created_at: created_at,
                    minimum_stock: minimum_stock,
                    unit: unit,
                    sales_price: sales_price,
                    sales_discount: sales_discount,
                    purchase_price: purchase_price,
                    purchase_discount: purchase_discount,
                });
                if (units.length > 0) {
                    await this.productUnitRepository.create(units.map((x) => {
                        return {
                            product_id: product.id,
                            unit: x.unit,
                            conversion: x.conversion,
                            created_by: userID,
                            created_at: created_at,
                            sales_price: x.sales_price,
                            sales_discount: x.sales_discount,
                            purchase_price: x.purchase_price,
                            purchase_discount: x.purchase_discount,
                        };
                    }));
                }
                // Add to Meilisearch index
                await queue_helper_1.queue.add("product-created", {
                    id: product.id,
                });
                return res.status(201).send(product);
            }
            catch (error) {
                console.error(`[error]: Error on creating item ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.updateSalesPrice = async (req, res) => {
            const items = req.body.items;
            try {
                const result = await this.productRepository.updateSalesPrice(items.map((x) => {
                    return {
                        product_id: x.product_id,
                        product_unit_id: x.product_unit_id,
                        price: x.price,
                        discount: x.discount,
                    };
                }));
                for (let i = 0; i < items.length; i++) {
                    await queue_helper_1.queue.add("product-updated", {
                        id: items[i].product_id,
                    });
                }
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating purchase price ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.updatePurchasePrice = async (req, res) => {
            const items = req.body.items;
            try {
                const result = await this.productRepository.updatePurchasePrice(items.map((x) => {
                    return {
                        product_id: x.product_id,
                        product_unit_id: x.product_unit_id,
                        price: x.price,
                        discount: x.discount,
                    };
                }));
                for (const item of items) {
                    await queue_helper_1.queue.add("product-updated", {
                        id: item.product_id,
                    });
                }
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating purchase price ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const reference = req.body.reference;
            const description = req.body.description;
            const product_brand_id = req.body.product_brand_id;
            const product_type_id = req.body.product_type_id;
            const minimum_stock = req.body.minimum_stock;
            const userID = req.body.userId;
            const unit = req.body.unit;
            const created_at = new Date();
            const id = req.body.id;
            const product = await this.productRepository.fetchByID(id);
            if (!product) {
                return res.status(404).send(error_list_1.default["Product not found"]);
            }
            if (product.is_delete) {
                return res.status(400).send(error_list_1.default["Product not found"]);
            }
            try {
                const existingItem = await this.productRepository.fetchByReference(reference);
                if (existingItem != null && existingItem.id !== id) {
                    return res.status(400).send(error_list_1.default["Reference unique constraint"]);
                }
                const updatedProduct = await this.productRepository.update({
                    id: id,
                    reference: reference,
                    description: description,
                    product_brand_id: product_brand_id,
                    product_type_id: product_type_id,
                    created_by: userID,
                    created_at: created_at,
                    minimum_stock: minimum_stock,
                    unit: unit,
                });
                // Add to Meilisearch index
                await queue_helper_1.queue.add("product-updated", {
                    id: id,
                });
                return res.status(200).send(updatedProduct);
            }
            catch (error) {
                console.error(`[error]: Error on updating item ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.toggleActive = async (req, res) => {
            const id = Number(req.body.id);
            try {
                const product = await this.productRepository.fetchByID(id);
                if (!product) {
                    return res.status(404).send(error_list_1.default["Product not found"]);
                }
                if (product.is_delete) {
                    return res.status(400).send(error_list_1.default["Product not found"]);
                }
                const updatedProduct = await this.productRepository.toggleActive(id, product.is_active);
                return res.status(201).send(updatedProduct);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item by id ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            // const pageSize = Number(process.env.LIMIT!);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await meili_helper_1.meili.index("product").search(keyword, {
                    limit: pageSize,
                    offset: (page - 1) * pageSize,
                    filter: ["is_delete = false"]
                });
                return res.status(200).send({
                    data: result.hits.map((x) => {
                        return product_model_1.ProductModel.fromMeilisearch(x);
                    }),
                    count: result.estimatedTotalHits,
                });
            }
            catch (error) {
                console.error(`[error]: Error on fetching items ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchSelector = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            // const pageSize = Number(process.env.LIMIT!);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await meili_helper_1.meili.index("product").search(keyword, {
                    limit: pageSize,
                    offset: (page - 1) * pageSize,
                    filter: ["is_active = true", "is_delete = false"],
                });
                return res.status(200).send({
                    data: result.hits.map((x) => {
                        return product_model_1.ProductModel.fromMeilisearch(x);
                    }),
                    count: result.estimatedTotalHits,
                });
            }
            catch (error) {
                console.error(`[error]: Error on fetching items ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const result = await this.productRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetch autocomplete item ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.productRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Product not found"]);
                }
                const exists = await this.stockCardRepository.checkExistingByProductID(id);
                result.can_delete = !exists;
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching item by id ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const product = await this.productRepository.fetchByID(Number(id));
                if (!product) {
                    return res.status(404).send(error_list_1.default["Product not found"]);
                }
                if (product.is_delete) {
                    return res.status(400).send(error_list_1.default["Product not found"]);
                }
                const exists = await this.stockCardRepository.checkExistingByProductID(Number(id));
                if (exists) {
                    return res.status(400).send(error_list_1.default["Product cannot be deleted"]);
                }
                const result = await this.productRepository.delete(id, userID);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Product not found"]);
                }
                await queue_helper_1.queue.add("product-updated", {
                    id: id,
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting item by id ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.productRepository = productRepository;
        this.productUnitRepository = productUnitRepository;
        this.stockCardRepository = stockCardRepository;
    }
}
exports.default = ProductController;
//# sourceMappingURL=product.controller.js.map