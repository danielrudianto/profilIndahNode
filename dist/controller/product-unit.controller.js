"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const item_model_1 = require("../model/item.model");
const product_unit_model_1 = __importDefault(require("../model/product-unit.model"));
class ItemUnitController {
}
ItemUnitController.fetch = (req, res) => {
    const id = parseInt(req.params.id);
    product_unit_model_1.default.fetchByItemID(id, "plain")
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemUnitController.create = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit = req.body.item_unit;
    const item_units = req.body.item_units;
    const userID = req.body.userId;
    item_model_1.ItemModel.fetchById(item_id)
        .then((itemArray) => {
        if (itemArray == null || itemArray.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const item = itemArray[0];
            if (item.is_delete) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                product_unit_model_1.default.update(item_id, item_unit, item_units, userID)
                    .then((result) => {
                    return res.status(200).send(result);
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        }
    })
        .catch((error) => { });
    console.log(item_id);
    console.log(item_unit);
    console.log(item_units);
};
ItemUnitController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    product_unit_model_1.default.fetchByItemID(id, "sales")
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const index = result.item_price.findIndex((x) => x.item_unit_id == null);
            return res.status(200).send({
                id: result === null || result === void 0 ? void 0 : result.id,
                reference: result === null || result === void 0 ? void 0 : result.reference,
                description: result === null || result === void 0 ? void 0 : result.description,
                unit: result === null || result === void 0 ? void 0 : result.unit,
                price: index > -1
                    ? result.item_price[index].price
                    : 0,
                item_unit: result.item_unit.map((x) => {
                    const idx = result.item_price.findIndex((y) => y.item_unit_id == x.id);
                    return {
                        id: x.id,
                        unit: x.unit,
                        conversion: x.conversion,
                        price: idx > -1
                            ? result.item_price[idx].price
                            : 0,
                    };
                }),
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = ItemUnitController;
