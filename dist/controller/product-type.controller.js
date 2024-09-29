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
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const fetch_interface_1 = require("../interface/fetch.interface");
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
class ItemTypeController {
}
_a = ItemTypeController;
/**
 * Create a new item type
 * @param req
 * @param res
 */
ItemTypeController.create = (req, res) => {
    const name = req.body.name;
    const user_id = req.body.userId;
    item_type_model_1.default.create({
        name: name,
        userID: user_id,
    })
        .then((result) => {
        const socket = new socket_helper_1.default("createItemType", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Fetch item types
 * @param req
 * @param res
 */
ItemTypeController.fetch = (req, res) => {
    var _b;
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)((_b = req.query.keyword) === null || _b === void 0 ? void 0 : _b.toString()));
    const limit = 10;
    const offset = (page - 1) * limit;
    item_type_model_1.default.fetch(keyword, limit, offset, fetch_interface_1.fetchMode.Pagination)
        .then(([result, count]) => {
        return res.status(200).send({
            data: result.map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    created_at: new Date(x.created_at),
                    user_item_type_created_byTouser: {
                        name: x.createdByName,
                        id: x.created_by,
                    },
                    can_delete: x.count == 0 ? true : false,
                };
            }),
            count: count,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch item types: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
ItemTypeController.fetchAll = (req, res) => {
    item_type_model_1.default.fetchAll()
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch item types: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item type autocomplete
 * @param req
 * @param res
 */
ItemTypeController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    item_type_model_1.default.fetch(keyword, 5, 0, fetch_interface_1.fetchMode.Autocomplete)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch item type autocomplete: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch item type by ID
 * @param req
 * @param res
 */
ItemTypeController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    item_type_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result[0].is_delete == 1) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { count: parseInt(result[0].count.toString()), can_delete: parseInt(result[0].count.toString()) == 0 ? true : false }));
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching item type: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update item type by ID
 * @param req
 * @param res
 */
ItemTypeController.updateByID = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const userID = req.body.userId;
    item_type_model_1.default.updateByID({
        name: name,
        userID: userID,
        id: id,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const socket = new socket_helper_1.default("updateItemType", Object.assign(Object.assign({}, result), { item: undefined }));
        socket.create();
        yield queue_helper_1.queue.add("update-item-type", result);
        return res.status(201).send(Object.assign(Object.assign({}, result), { item: undefined }));
    }))
        .catch((error) => {
        console.error(`[error]: Error on fetching item type: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete item type by ID
 * @param req
 * @param res
 * @returns
 */
ItemTypeController.deleteByID = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        item_type_model_1.default.fetchByID(id)
            .then((result) => {
            if (!result || result.length == 0) {
                return res.status(404).send("Data does not exist");
            }
            else if (result[0].is_delete == 1) {
                return res.status(404).send("Data does not exist");
            }
            else if (result[0].count > 0) {
                return res
                    .status(400)
                    .send("Data cannot be deleted because there are other data depending on this data");
            }
            else {
                item_type_model_1.default.deleteById(id, req.body.userId)
                    .then((result) => {
                    const socket = new socket_helper_1.default("deleteItemType", result);
                    socket.create();
                    return res.status(200).send(result);
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    catch (err) {
        if (err instanceof Error) {
            return res.status(500).send(err);
        }
        else {
            return res.status(500).send(error_list_1.default["Unknown error"]);
        }
    }
};
exports.default = ItemTypeController;
//# sourceMappingURL=product-type.controller.js.map