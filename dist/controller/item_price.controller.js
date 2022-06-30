"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const socket_connection_helper_1 = require("../helper/socket.connection.helper");
const item_model_1 = require("../model/item.model");
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
class ItemPriceController {
}
ItemPriceController.create = (req, res) => {
    const item_id = req.body.item_id;
    const discount = req.body.discount;
    const discount_project = req.body.discount_project;
    const price = req.body.price;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    const item_price = new item_price_model_1.default(price, discount, discount_project, item_id, req.body.userId);
    const item_price_create = item_price.create();
    const item_price_delete = item_price_model_1.default.deleteById(item_id, req.body.userId);
    const transaction = new query_transaction_helper_1.default();
    transaction
        .create([item_price_create, item_price_delete])
        .then((result) => {
        item_model_1.ItemModel.fetchById(result[1].item_id, date).then((item) => {
            log_helper_1.default.log(new Date(), "info", `${result[0].user.name} added sales item price for item ${result[0].item.reference} (ID: ${result[0].item.id}) with the price ${result[0].price} and discount (${result[0].discount} / ${result[0].discount_project}`, "Item Price - Create", req.body.userId);
            socket_connection_helper_1.io.emit("updatePrice", item);
            return res.status(200).send(result[1]);
        }).catch(error => {
            log_helper_1.default.log(new Date(), "error", error, "Item Price - Create", req.body.userId);
            return res.status(500).send(error);
        });
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "Item Price - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemPriceController.createBulk = (req, res) => {
    const effective_date = new Date(req.body.effective_date);
    const items = req.body.items;
    const references = [];
    let count = 0;
    const price_object = [];
    items.forEach((x) => {
        const reference = x.reference;
        const price = x.price;
        const discount = x.discount;
        const discount_project = x.discount_project;
        references.push(reference);
        price_object[count] = {
            price: parseFloat(price),
            discount: parseFloat(discount),
            discount_project: parseFloat(discount_project),
        };
        count++;
    });
    item_model_1.ItemModel.fetchByReferences(references).then((items) => {
        if (items.length != count) {
            res
                .status(500)
                .send(`${items.length - count} barang tidak terdefinisi. Mohon cek kembali input anda`);
        }
        else {
            const transactions = [];
            const item_ids = [];
            references.forEach((reference, index) => {
                item_ids.push(items.filter((x) => x.reference == reference)[0].id);
                const item_price = new item_price_model_1.default(price_object[index].price, price_object[index].discount, price_object[index].discount_project, items.filter((x) => x.reference == reference)[0].id, req.body.userId, effective_date);
                transactions.push(item_price.create());
            });
            const transaction = new query_transaction_helper_1.default();
            item_price_model_1.default.deleteByIds(item_ids, req.body.userId)
                .then(() => {
                transaction
                    .create(transactions)
                    .then((result) => {
                    return res.status(201).send(result);
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
ItemPriceController.fetchAll = (req, res) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    const result = [];
    item_model_1.ItemModel.fetchAll(date)
        .then((items) => {
        items.forEach((item) => {
            result.push({
                reference: item.reference,
                description: item.description,
                item_brand: item.item_brand,
                item_price: item.item_price,
            });
        });
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    item_price_model_1.default.fetch(keyword, date, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.fetchByReference = (req, res) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    item_price_model_1.default.fetchByReference(reference, date)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ItemPriceController;
