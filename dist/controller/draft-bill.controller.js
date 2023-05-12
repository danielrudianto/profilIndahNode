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
const draft_bill_model_1 = require("../model/draft-bill.model");
const node_cron_1 = __importDefault(require("node-cron"));
class DraftBillController {
}
_a = DraftBillController;
DraftBillController.create = (req, res) => {
    const queue_number = req.body.queue_number;
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const userID = req.body.userId;
    const note = req.body.note;
    const draftBill = new draft_bill_model_1.DraftBillModel(queue_number, customer_id, note, items, userID);
    draftBill
        .create()
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
DraftBillController.fetchByQueueNumber = (req, res) => {
    const queueNumber = req.params.queueNumber;
    try {
        const queue_number = parseInt(queueNumber);
        if (isNaN(queue_number)) {
            return res.status(400).send("Invalid queue number.");
        }
        else {
            draft_bill_model_1.DraftBillModel.fetchByQueueNumber(queue_number)
                .then((result) => {
                if (result == null) {
                    return res.status(404).send("Draft bill not found.");
                }
                else {
                    return res.status(200).send({
                        id: result.id,
                        queue_number: result.queue_number,
                        note: result.note,
                        created_at: result.created_at,
                        customer: result.customer == null
                            ? null
                            : {
                                id: result.customer.id,
                                name: result.customer.name,
                                address: result.customer.address,
                            },
                        items: result.draft_bill.map((x) => {
                            const price = x.item_unit == null
                                ? x.item.item_price.length == 0
                                    ? 0
                                    : parseFloat(x.item.item_price[0].price.toString())
                                : x.item_unit.item_price.length == 0
                                    ? 0
                                    : parseFloat(x.item_unit.item_price[0].price.toString());
                            const discount = x.item_unit == null
                                ? x.item.item_price.length == 0
                                    ? 0
                                    : parseFloat(x.item.item_price[0].discount.toString())
                                : x.item_unit.item_price.length == 0
                                    ? 0
                                    : parseFloat(x.item_unit.item_price[0].discount.toString());
                            return {
                                id: x.id,
                                item: {
                                    id: x.item.id,
                                    reference: x.item.reference,
                                    description: x.item.description,
                                    unit: x.item.unit,
                                    item_brand: {
                                        id: x.item.item_brand.id,
                                        name: x.item.item_brand.name,
                                    },
                                },
                                quantity: parseFloat(x.quantity.toString()),
                                price: price,
                                discount: discount,
                                item_unit: x.item_unit == null
                                    ? null
                                    : {
                                        unit: x.item_unit.unit,
                                        conversion: x.item_unit.conversion,
                                    },
                            };
                        }),
                        user_draft_bill_code_created_byTouser: {
                            name: result.user_draft_bill_code_created_byTouser.name,
                        },
                    });
                }
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    }
    catch (error) {
        return res.status(400).send(error);
    }
};
DraftBillController.order = (req, res) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const delivery = req.body.delivery;
    const service = req.body.service;
    const items = req.body.items;
    const payment_method_id = req.body.payment_method_id;
    draft_bill_model_1.DraftBillModel.fetchByID(id).then((result) => {
        if (result == null) {
            return res.status(404).send("Draft bill not found.");
        }
        else if (result.is_delete) {
            return res.status(404).send("Draft bill is deleted.");
        }
        else {
            const date = new Date(result.created_at);
            const name = `INV-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
            draft_bill_model_1.DraftBillModel.order(id, name, discount, delivery, service, result.customer_id, payment_method_id, items.map((x) => {
                const draftBillItemIndex = result.draft_bill.findIndex((y) => y.id == x.id);
                if (draftBillItemIndex != -1) {
                    return {
                        item_id: result.draft_bill[draftBillItemIndex].item_id,
                        item_unit_id: result.draft_bill[draftBillItemIndex].item_unit_id,
                        quantity: x.quantity,
                        price: x.price,
                        discount: x.discount,
                    };
                }
            }), date, req.body.userId)
                .then((result) => {
                return res.status(201).send(result);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
DraftBillController.truncateData = () => {
    // Create cron job
    // To truncate data every day at 00:00
    node_cron_1.default.schedule("0 0 0 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
        yield draft_bill_model_1.DraftBillModel.truncateData();
    }));
};
exports.default = DraftBillController;
