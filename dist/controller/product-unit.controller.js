"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const item_model_1 = require("../model/item.model");
const product_unit_model_1 = __importStar(require("../model/product-unit.model"));
class ItemUnitController {
}
/**
 * Update item unit
 * @param req
 * @param res
 */
ItemUnitController.create = (req, res) => {
    const itemID = req.body.item_id;
    const itemUnit = req.body.item_unit;
    const itemUnits = req.body.item_units;
    const userID = req.body.userID;
    item_model_1.ItemModel.fetchByID(itemID)
        .then((item) => {
        if (!item) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (item.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (item[0].is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        product_unit_model_1.default.update({
            item_id: itemID,
            unit: itemUnit,
            units: itemUnits,
            created_by: userID,
        })
            .then((result) => {
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on creating item unit ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item by ID ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item unit by item ID
 * @param req
 * @param res
 */
ItemUnitController.fetch = (req, res) => {
    const id = parseInt(req.params.id);
    product_unit_model_1.default.fetchByItemID(id, product_unit_model_1.ItemUnitMode.Plain)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item by ID ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch sales price based on itemID
 * @param req
 * @param res
 */
ItemUnitController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    product_unit_model_1.default.fetchByItemID(id, product_unit_model_1.ItemUnitMode.Sales)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const anyResult = result;
        const index = anyResult.item_price.findIndex((x) => x.item_unit_id == null);
        return res.status(200).send({
            id: result.id,
            reference: result.reference,
            description: result.description,
            unit: result.unit,
            price: index > -1 ? anyResult.item_price[index].price : 0,
            item_unit: result.item_unit.map((x) => {
                const idx = anyResult.item_price.findIndex((y) => y.item_unit_id == x.id);
                return {
                    id: x.id,
                    unit: x.unit,
                    conversion: x.conversion,
                    price: idx > -1 ? anyResult.item_price[idx].price : 0,
                };
            }),
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item by ID ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
exports.default = ItemUnitController;
//# sourceMappingURL=product-unit.controller.js.map