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
const item_model_1 = require("../model/item.model");
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class ItemPurchasePriceController {
}
_a = ItemPurchasePriceController;
/**
 * Fetch item purchase price by item ID and item unit ID
 * @param req
 * @param res
 */
ItemPurchasePriceController.fetchByID = (req, res) => {
    const itemID = req.body.item_id;
    const itemUnitID = req.body.item_unit_id;
    item_purchase_price_model_1.default.fetchByID(itemID, itemUnitID)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(result[0]);
    })
        .catch((error) => {
        console.error(`[error]: Error while fetching item price by ID: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item purchase price by keyword and pagination
 * @param req
 * @param res
 */
ItemPurchasePriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    item_purchase_price_model_1.default.fetch(keyword, offset, limit)
        .then(([result, count]) => {
        return res.status(200).send({
            data: result.map((x) => {
                return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    count: parseInt(x.count.toString()),
                    price: x.price,
                    discount: x.discount,
                };
            }),
            count: count,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error while fetching item price: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update item purchase price
 * @param req
 * @param res
 */
ItemPurchasePriceController.update = (req, res) => {
    const price = req.body.price;
    const discount = req.body.discount;
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const userID = req.body.userId;
    item_purchase_price_model_1.default.fetchByItemID(item_id, item_unit_id)
        .then((item) => __awaiter(void 0, void 0, void 0, function* () {
        if (!item) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const currentPrice = item.price;
        const currentDiscount = item.discount;
        if (currentDiscount == discount && currentPrice == price) {
            return res.status(200).send(item);
        }
        yield item_purchase_price_model_1.default.delete([
            {
                item_id: item_id,
                item_unit_id: item_unit_id,
                deleted_by: userID,
            },
        ]);
        item_purchase_price_model_1.default.create([
            {
                price: price,
                discount: discount,
                item_id: item_id,
                item_unit_id: item_unit_id,
                created_by: userID,
            },
        ])
            .then((result) => {
            const socket = new socket_helper_1.default("updatePurchasePrice", {
                item_id: item_id,
                item_unit_id: item_unit_id,
                price: price,
                discount: discount,
            });
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on updating item price: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }))
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Create item purchase price in bulk
 * @param req
 * @param res
 */
ItemPurchasePriceController.createBulk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body.data;
    const userID = req.body.userId;
    try {
        yield item_purchase_price_model_1.default.delete(data.map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                deleted_by: userID,
            };
        }));
        const result = yield item_purchase_price_model_1.default.create(data.map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                price: x.price,
                discount: x.discount,
                created_by: userID,
            };
        }));
        return res.status(200).send(result);
    }
    catch (error) {
        console.error(`[error]: Error on creating item price: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    }
});
/**
 * Fetch item purchase price Excel format
 * @param req
 * @param res
 *
 * @remaks Used to update item purchase price in bulk,
 * sending back an Excel file in base64 format with the current price
 *
 */
ItemPurchasePriceController.fetchFormat = (req, res) => {
    const brand_id = req.body.brand;
    const type_id = req.body.type;
    const setting = req.body.setting;
    item_model_1.ItemModel.fetchItemPurchasePriceByBrandType(brand_id, type_id, setting)
        .then((items) => {
        return res.status(200).send(items.map((x) => {
            var _b;
            return [
                x.item_id,
                x.item_unit_id == null ? 0 : x.item_unit_id,
                x.item.reference,
                x.item.description,
                x.item.item_brand.name,
                (_b = x.item.item_type) === null || _b === void 0 ? void 0 : _b.name,
                x.item_unit == null ? x.item.unit : x.item_unit.unit,
                x.item_unit == null
                    ? 1
                    : parseFloat(x.item_unit.conversion.toString()),
                x.item_unit == null ? "" : x.item.unit,
                parseFloat(x.price.toString()),
                parseFloat(x.discount.toString()),
            ];
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error while fetching item price: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = ItemPurchasePriceController;
//# sourceMappingURL=product-price-purchase.controller.js.map