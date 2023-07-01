"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const draft_bill_model_1 = require("../model/draft-bill.model");
const payment_method_model_1 = __importDefault(require("../model/payment-method.model"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
class DraftBillController {
}
DraftBillController.create = (req, res) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const userID = req.body.userId;
    const note = req.body.note;
    const date = new Date();
    const service = req.body.service;
    const delivery = req.body.delivery;
    const name = `INV-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    const draftBill = new draft_bill_model_1.DraftBillModel(customer_id, note, items, userID, name, service, delivery);
    draftBill
        .create()
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
DraftBillController.fetchUnconfirmed = (req, res) => {
    const page = req.query.page == undefined || req.query.page == null
        ? 1
        : parseInt(req.query.page.toString());
    const keyword = req.query.keyword == undefined
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    draft_bill_model_1.DraftBillModel.fetchUnconfirmed(page, keyword).then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    });
};
DraftBillController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    Promise.all([payment_method_model_1.default.fetchAll(), draft_bill_model_1.DraftBillModel.fetchByID(id)])
        .then((result) => {
        return res.status(200).send({
            data: result[1],
            paymentMethods: result[0],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
DraftBillController.confirm = (req, res) => {
    const id = req.body.id;
    const payment_method_id = req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const service = req.body.service;
    const delivery = req.body.delivery;
    const discount = req.body.discount;
    const userID = req.body.userId;
    const items = req.body.items;
    draft_bill_model_1.DraftBillModel.fetchByID(id).then((result) => {
        if (result == null || result.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const bill = items.map((x) => {
                var _a;
                const id = x.id;
                const discount = x.discount;
                const draftBillIndex = result.draft_bill.findIndex((y) => y.id == id);
                if (draftBillIndex != -1) {
                    return {
                        item_id: result.draft_bill[draftBillIndex].item_id,
                        item_unit_id: result.draft_bill[draftBillIndex].item_unit_id,
                        quantity: result.draft_bill[draftBillIndex].quantity,
                        discount: discount,
                        price: result.draft_bill[draftBillIndex].price,
                        conversion: result.draft_bill[draftBillIndex].item_unit == null
                            ? 1
                            : (_a = result.draft_bill[draftBillIndex].item_unit) === null || _a === void 0 ? void 0 : _a.conversion,
                    };
                }
            });
            draft_bill_model_1.DraftBillModel.confirm(id, result.name, new Date(result.created_at), result.customer_id, payment_method_id, service, delivery, discount, bill, userID)
                .then(() => {
                const socket = new socket_helper_1.default("delete-draft-bill", {
                    id: result.id,
                });
                socket.create();
                product_stock_model_1.default.updateStock(bill.map((x) => {
                    if (x != null) {
                        return {
                            item_id: x === null || x === void 0 ? void 0 : x.item_id,
                            quantity: parseFloat(x.quantity.toString()) *
                                parseFloat(x.conversion.toString()) *
                                -1,
                        };
                    }
                }))
                    .then(() => {
                    return res.status(201).send(result);
                })
                    .catch((error) => {
                    console.log(error);
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                console.log(error);
                return res.status(500).send(error);
            });
        }
    });
};
DraftBillController.delete = (req, res) => {
    const id = req.body.id;
    const userID = req.body.userId;
    draft_bill_model_1.DraftBillModel.delete(id, userID)
        .then((result) => {
        const socket = new socket_helper_1.default("delete-draft-bill", {
            id: result.id,
        });
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
DraftBillController.fetchArchives = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        draft_bill_model_1.DraftBillModel.fetchArchiveYears(mode)
            .then((result) => {
            return res.status(200).send(result.map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString()),
                };
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month == undefined) {
        const year = parseInt(req.query.year.toString());
        draft_bill_model_1.DraftBillModel.fetchArchiveMonths(year, mode)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString());
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month != undefined) {
        const year = parseInt(req.query.year.toString());
        const month = parseInt(req.query.month.toString());
        const page = req.query.page == undefined ? 1 : parseInt(req.query.page.toString());
        draft_bill_model_1.DraftBillModel.fetchArchive(year, month, page, mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.created_at,
                        is_delete: x.is_delete == 1,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            console.log(error);
            return res.status(500).send(error);
        });
    }
};
exports.default = DraftBillController;
