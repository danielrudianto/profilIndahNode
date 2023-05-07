"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
class ItemTypeController {
}
ItemTypeController.fetch = (req, res) => {
    var _a;
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent((0, escape_helper_1.mysql_real_escape_string)((_a = req.query.keyword) === null || _a === void 0 ? void 0 : _a.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    item_type_model_1.default.fetchItems(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    name: x.name,
                    created_at: new Date(x.created_at),
                    user_item_type_created_byTouser: {
                        name: x.createdByName,
                        id: x.createdBy,
                    },
                    can_delete: x.count == 0 ? true : false,
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemTypeController.createItem = (req, res) => {
    const name = req.body.name;
    const user_id = req.body.userId;
    const item_type = new item_type_model_1.default(name, user_id);
    item_type
        .create()
        .then((result) => {
        const socket = new socket_helper_1.default("createItemType", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemTypeController.updateItem = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const user_id = req.body.userId;
    const item_type = new item_type_model_1.default(name, user_id, id);
    item_type
        .update()
        .then((result) => {
        const socket = new socket_helper_1.default("updateItemType", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemTypeController.fetchById = (req, res) => {
    try {
        const id = parseInt(req.params.id.toString());
        item_type_model_1.default.fetchItemById(id)
            .then((result) => {
            if (!result || result.length == 0) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                const itemType = result[0];
                return res.status(200).send(Object.assign(Object.assign({}, itemType), { can_delete: itemType.count == 0 ? true : false }));
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
ItemTypeController.fetchAutocomplete = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    item_type_model_1.default.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemTypeController.fetchByBrandId = (req, res) => {
    if (typeof req.body.ids === "string") {
        try {
            const ids = JSON.parse(req.body.ids.toString().replace("'", "").replace('"', ""));
            item_type_model_1.default.fetchByBrandIds(ids)
                .then((result) => {
                return res.status(200).send(result);
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
    }
    else {
        try {
            const ids = req.body.ids;
            item_type_model_1.default.fetchByBrandIds(ids)
                .then((result) => {
                return res.status(200).send(result);
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
    }
};
ItemTypeController.deleteItem = (req, res) => {
    try {
        const id = parseInt(req.params.id);
        item_type_model_1.default.fetchItemById(id)
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
