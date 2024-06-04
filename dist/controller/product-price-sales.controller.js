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
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const error_list_1 = __importDefault(require("../assets/error_list"));
class ItemPriceController {
}
_a = ItemPriceController;
/**
 * Fetch all item price
 * @param req
 * @param res
 * @remarks Development purpose only
 */
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
        return res.status(200).send(items.map((x) => {
            return {
                reference: x.reference,
                description: x.description,
                item_brand: x.item_brand,
                price: x.item_price.filter((x) => x.item_unit == null)[0].price,
                discount: x.item_price.filter((x) => x.item_unit == null)[0]
                    .discount,
                item_price: x.item_price.filter((x) => x.item_unit != null),
            };
        }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.fetchByID = (req, res) => {
    const id = Number(req.params.id);
    item_price_model_1.default.fetchByItemID(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item price: ${error}`);
        return res.status(500).send(error);
    });
};
ItemPriceController.fetchByIDV2 = (req, res) => {
    const id = Number(req.params.id);
    item_price_model_1.default.fetchByItemIDV2(id)
        .then(([item, prices]) => {
        return res.status(200).send(Object.assign(Object.assign({}, item), { item_price: prices }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item price: ${error}`);
        return res.status(500).send(error);
    });
};
ItemPriceController.updateV2 = (req, res) => {
    const data = req.body;
    const userID = req.body.userId;
    item_price_model_1.default.updateMany(data, userID)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on updating item price: ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Fetch item prices
 * @param req
 * @param res
 */
ItemPriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = Number(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    item_price_model_1.default.fetch(keyword, date, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    count: parseInt(x.count.toString()),
                    price: x.price,
                    discount: x.discount,
                    effective_date: new Date(x.effective_date),
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Update item price by ID
 * @param req
 * @param res
 */
ItemPriceController.updateByID = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const discount = req.body.discount;
    const userID = req.body.userId;
    item_price_model_1.default.fetchByItemID(item_id, item_unit_id)
        .then((itemPrice) => {
        if (!itemPrice) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (itemPrice.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const latest_price = itemPrice[0].price;
        const latest_discount = itemPrice[0].discount;
        if (latest_price == price && latest_discount == discount) {
            return res.status(400).send(error_list_1.default["No changes"]);
        }
        item_price_model_1.default.update({
            item_id: item_id,
            item_unit_id: item_unit_id,
            price: price,
            discount: discount,
            created_by: userID,
            created_at: new Date(),
        })
            .then(([_, result]) => {
            const socket = new socket_helper_1.default("updateItemPrice", result);
            socket.create();
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on updating item price. ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item price. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
ItemPriceController.updateByIDV2 = (req, res) => {
    const data = req.body.data;
    const userID = req.body.userId;
    // ItemPriceModel.upsert(data, userID)
    //   .then((result) => {
    //     return res.status(201).send(result);
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
};
/**
 * Upload data in bulk
 * Handle bulk upload of item prices
 * @param req
 * @param res
 */
ItemPriceController.createBulk = (req, res) => {
    const items = req.body;
    const userID = req.body.userId;
    const transactions = items.map((x) => {
        return item_price_model_1.default.delete({
            item_id: x.id,
            deleted_by: userID,
            item_unit_id: x.item_unit_id,
        });
    });
    transactions.push(item_price_model_1.default.createMany(items.map((x) => {
        return {
            item_id: x.id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_by: userID,
            created_at: new Date(),
        };
    })));
    Promise.all(transactions)
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on creating item price. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item price by item ID
 * @param req
 * @param res
 */
ItemPriceController.fetchByItemID = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    item_price_model_1.default.fetchByItemID(item_id, item_unit_id)
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
        return res.status(500).send(error);
    });
};
/**
 * Download format
 * @param req
 * @param res
 */
ItemPriceController.fetchFormat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const brand_id = req.body.brand;
    const type_id = req.body.type;
    const setting = 0;
    item_model_1.ItemModel.fetchItemPriceByBrandType(brand_id, type_id, setting)
        .then((items) => {
        return res.status(200).send(items.map((x) => {
            var _b;
            return [
                x.item_id,
                x.item_unit == null ? 0 : x.item_unit.id,
                x.item.reference,
                x.item.description,
                x.item.item_brand.name,
                (_b = x.item.item_type) === null || _b === void 0 ? void 0 : _b.name,
                x.item_unit == null ? x.item.unit : x.item_unit.unit,
                x.item_unit == null ? 1 : x.item_unit.conversion,
                x.item_unit == null ? "" : x.item.unit,
                x.price,
                x.discount,
            ];
        }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item price. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = ItemPriceController;
//# sourceMappingURL=product-price-sales.controller.js.map