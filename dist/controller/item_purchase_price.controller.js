"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const app_1 = require("../app");
const item_model_1 = require("../model/item.model");
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
class ItemPurchasePriceController {
}
ItemPurchasePriceController.fetchAll = (req, res) => {
    item_purchase_price_model_1.default.fetchAll()
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.fetchByReference = (req, res) => {
    const reference = req.params.reference.toString();
    item_purchase_price_model_1.default.fetchByReference(reference)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.fetch = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    item_purchase_price_model_1.default.fetch(keyword, offset, limit).then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    });
};
ItemPurchasePriceController.create = (req, res) => {
    const item_id = req.body.item_id;
    const price = req.body.price;
    const created_by = req.body.userId;
    const item_purchase_price = new item_purchase_price_model_1.default(price, item_id, created_by);
    const create_item = item_purchase_price.create();
    const delete_item = item_purchase_price_model_1.default.deleteItems([item_id], created_by);
    const select_item = item_model_1.ItemModel.fetchById(item_id, new Date());
    const transaction = new query_transaction_helper_1.default();
    transaction
        .create([create_item, delete_item, select_item])
        .then((result) => {
        item_purchase_price_model_1.default.fetchByReference(result[2].reference)
            .then((item_purchase) => {
            app_1.io.emit("updatePurchasingPrice", item_purchase);
            return res.status(201).send(item_purchase);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.createBulk = (req, res) => {
    const items = req.body.items;
    const references = [];
    let count = 0;
    const price_object = [];
    items.forEach((x) => {
        const reference = x.reference;
        const price = x.price;
        references.push(reference);
        price_object[count] = {
            price: parseFloat(price),
        };
        count++;
    });
    item_model_1.ItemModel.fetchByReferences(references)
        .then((items) => {
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
                const create_item_purchase_price = new item_purchase_price_model_1.default(price_object[index].price, items.filter((x) => x.reference == reference)[0].id, req.body.userId);
                transactions.push(create_item_purchase_price.create());
            });
            item_purchase_price_model_1.default.deleteItems(item_ids, req.body.userId)
                .then(() => {
                const transaction = new query_transaction_helper_1.default();
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
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ItemPurchasePriceController;
