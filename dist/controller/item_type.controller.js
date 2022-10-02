"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
class ItemTypeController {
}
ItemTypeController.fetchItems = (req, res) => {
    var _a;
    const page = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = (!req.query.keyword) ? "" : (_a = req.query.keyword) === null || _a === void 0 ? void 0 : _a.toString();
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    item_type_model_1.default.fetchItems(keyword, offset, limit).then(result => {
        return res.status(200).send({
            data: result[0].map(x => {
                return Object.assign(Object.assign({}, x), { can_delete: x.item.length == 0 });
            }),
            count: result[1]
        });
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "ItemTypeController - Fetch Items", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemTypeController.createItem = (req, res) => {
    const name = req.body.name;
    const user_id = req.body.userId;
    const item_type = new item_type_model_1.default(name, user_id);
    item_type.create().then(result => {
        const socket = new socket_helper_1.default("createItemType", result);
        socket.create();
        return res.status(201).send(result);
    }).catch(error => {
        log_helper_1.default.log(new Date(), "error", error, "ItemTypeController - Submit Item", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemTypeController.updateItem = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const user_id = req.body.userId;
    const item_type = new item_type_model_1.default(name, user_id, id);
    item_type.update().then(result => {
        const socket = new socket_helper_1.default("updateItemType", result);
        socket.create();
        return res.status(201).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ItemTypeController.fetchById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    item_type_model_1.default.fetchItemById(id).then(result => {
        return res.status(200).send(Object.assign(Object.assign({}, result), { can_delete: (result === null || result === void 0 ? void 0 : result.item.length) == 0 }));
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ItemTypeController.fetchAutocomplete = (req, res) => {
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
    item_type_model_1.default.fetchAutocomplete(keyword).then(result => {
        return res.status(200).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ItemTypeController.fetchByBrandId = (req, res) => {
    const ids = req.body.ids;
    item_type_model_1.default.fetchByBrandIds(ids).then(result => {
        return res.status(200).send(result);
    }).catch(error => {
        console.error(error);
        return res.status(500).send(error);
    });
};
exports.default = ItemTypeController;
