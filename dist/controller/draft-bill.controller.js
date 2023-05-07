"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const draft_bill_model_1 = require("../model/draft-bill.model");
class DraftBillController {
}
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
exports.default = DraftBillController;
