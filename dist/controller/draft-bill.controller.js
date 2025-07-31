"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const draft_bill_model_1 = require("../model/draft-bill.model");
class DraftBillController {
    /**
     * Generate name for draft bill
     * @param date
     * @returns Draft bill name
     */
    static generateName(date) {
        return `INV-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    }
}
_a = DraftBillController;
/**
 * Create a new draft bill
 * @param req
 * @param res
 */
DraftBillController.create = (req, res) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const userID = req.body.userId;
    const note = req.body.note;
    const date = new Date();
    const service = req.body.service;
    const delivery = req.body.delivery;
    const otc = req.body.otc;
    draft_bill_model_1.DraftBillModel.create({
        otc: otc,
        customer_id: customer_id,
        note: note,
        items: items,
        created_by: userID,
        name: _a.generateName(date),
        service: service,
        delivery: delivery,
    })
        .then((result) => {
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on create draft bill: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch draft bill by ID
 * @param req
 * @param res
 */
DraftBillController.fetchByID = (req, res) => {
    // const id = parseInt(req.params.id.toString());
    // Promise.all([
    //   PaymentMethodModel.fetch("", 0, 0, fetchMode.Autocomplete),
    //   DraftBillModel.fetchByID(id),
    // ])
    //   .then((result) => {
    //     return res.status(200).send({
    //       data: result[1],
    //       paymentMethods: result[0],
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetch draft bill by id: ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
/**
 * Fetch draft bills
 * @param req
 * @param res
 */
DraftBillController.fetch = (req, res) => {
    const page = req.query.page == undefined || req.query.page == null
        ? 1
        : parseInt(req.query.page.toString());
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const mode = req.body.mode;
    const keyword = req.query.keyword == undefined
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    // DraftBillModel.fetch(keyword, limit, offset, mode)!
    //   .then(([result, count]) => {
    //     return res.status(200).send({
    //       data: result,
    //       count: count,
    //     });
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
};
DraftBillController.fetchByName = (req, res) => {
    const name = req.body.name;
    draft_bill_model_1.DraftBillModel.fetchByName(name)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetch draft bill by name: ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Confirm bill and create new bill
 * @param req
 * @param res
 */
DraftBillController.confirmByID = (req, res) => {
    const id = req.body.id;
    const payment_methods = req.body.payment_methods;
    const service = req.body.service;
    const delivery = req.body.delivery;
    const discount = req.body.discount;
    const userID = req.body.userId;
    const items = req.body.items;
    draft_bill_model_1.DraftBillModel.fetchByID(id).then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (result.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const bills = [];
        items.forEach((x) => {
            const id = x.item_id;
            const product_unit_id = x.product_unit_id;
            const draftBillIndex = result.draft_bill.findIndex((y) => y.product_id == id && y.product_unit_id == product_unit_id);
            // if (draftBillIndex != -1) {
            //   const price = Number(result.draft_bill[draftBillIndex].price);
            //   const discount = Number(result.draft_bill[draftBillIndex].discount);
            //   bills.push({
            //     product_id: result.draft_bill[draftBillIndex].product_id,
            //     product_unit_id: result.draft_bill[draftBillIndex].product_unit_id,
            //     quantity: Number(result.draft_bill[draftBillIndex].quantity),
            //     discount: discount,
            //     price: price,
            //   });
            // }
        });
        draft_bill_model_1.DraftBillModel.confirm({
            id: id,
            name: result.name,
            date: new Date(result.created_at),
            customer_id: result.customer_id,
            payment_methods: payment_methods,
            service: service,
            delivery: delivery,
            discount: discount,
            items: bills,
            userID: userID,
        })
            .then(async ([_, bill]) => {
            const socket = new socket_helper_1.default("confirm-draft-bill", bill);
            socket.create();
            // await queue.add("create-sales-invoice", bill);
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(`[error]: Error on confirm draft bill: ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    });
};
/**
 * Delete draft bill by ID
 * @param req
 * @param res
 */
DraftBillController.deleteByID = (req, res) => {
    const id = req.body.id;
    const userID = req.body.userId;
    draft_bill_model_1.DraftBillModel.deleteByID(id, userID)
        .then((result) => {
        const socket = new socket_helper_1.default("delete-draft-bill", {
            id: result.id,
        });
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on deleting draft bill ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch draft bill archives
 * @param req
 * @param res
 */
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
            console.error(`[error]: Error on fetch draft bill archives ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
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
            console.error(`[error]: Error on fetch draft bill archives ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
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
            console.error(`[error]: Error on fetch draft bill archives ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        return res.status(404).send(error_list_1.default["Parameter error"]);
    }
};
exports.default = DraftBillController;
//# sourceMappingURL=draft-bill.controller.js.map