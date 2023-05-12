"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
class SalesInvoiceController {
}
SalesInvoiceController.create = (req, res) => {
    const uuid = req.body.uuid;
    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill;
    const date = !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);
    const bill_code = new bill_code_model_1.default(customer_id, req.body.userId, payment_method_id, discount, delivery, service, date, uuid);
    bill_code
        .create()
        .then((result) => {
        Promise.all([
            // Create bill items
            bill_model_1.default.create(bill.map((x) => {
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    price: x.price,
                    discount: x.discount,
                    quantity: x.quantity,
                    bill_code_id: result.id,
                };
            })),
            // Saving item price
            item_price_model_1.default.updateMany(bill.filter((x) => x.save), req.body.userId),
        ])
            .then((_) => {
            bill_code_model_1.default.fetchById(result.id).then((bills) => {
                if (bills != null) {
                    product_stock_model_1.default.updateStock(bills.bill.map((x) => {
                        const quantity = parseFloat(x.quantity.toString()) *
                            (x.item_unit == null
                                ? 1
                                : parseFloat(x.item_unit.conversion.toString())) *
                            -1;
                        return {
                            item_id: x.item_id,
                            quantity: quantity.toFixed(4),
                        };
                    }))
                        .then(() => {
                        return res.status(201).send(result);
                    })
                        .catch(() => {
                        return res.status(201).send(result);
                    });
                }
                else {
                    return res.status(201).send(result);
                }
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesInvoiceController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.fetchById(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            let subTotal = 0;
            for (let item of result.bill) {
                subTotal +=
                    parseFloat(item.price.toString()) *
                        parseFloat(item.quantity.toString());
            }
            return res.status(200).send(Object.assign(Object.assign({}, result), { subTotal: subTotal, discount: parseFloat(result.discount.toString()), delivery: parseFloat(result.delivery.toString()), service: parseFloat(result.service.toString()) }));
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesInvoiceController.deleteById = (req, res) => {
    try {
        const id = parseInt(req.params.id.toString());
        bill_code_model_1.default.deleteById(id, req.body.userId)
            .then((result) => {
            if (result.is_delete) {
                const socket = new socket_helper_1.default("deleteBill", result);
                socket.create();
                bill_code_model_1.default.fetchById(result.id).then((bills) => {
                    if (bills != null) {
                        product_stock_model_1.default.updateStock(bills.bill.map((x) => {
                            const quantity = parseFloat(x.quantity.toString()) *
                                (x.item_unit == null
                                    ? 1
                                    : parseFloat(x.item_unit.conversion.toString()));
                            return {
                                item_id: x.item_id,
                                quantity: quantity.toFixed(4),
                            };
                        }))
                            .then(() => {
                            return res.status(201).send(result);
                        })
                            .catch(() => {
                            return res.status(201).send(result);
                        });
                    }
                    else {
                        return res.status(201).send(result);
                    }
                });
                return res.status(201).send(result);
            }
            else {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    catch (err) {
        return res.status(500).send(error_list_1.default["Unknown error"]);
    }
};
SalesInvoiceController.fetchCodeById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(result === null || result === void 0 ? void 0 : result.bill_code);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesInvoiceController.search = (req, res) => {
    const customers = req.body.customers;
    const items = req.body.items;
    const date = req.body.date;
    const page = req.body.page;
    const keyword = req.body.keyword;
    const status = req.body.status;
    // status 0 => active
    // status 1 => deleted
    // status 2 => all
    const formattedDate_1 = date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(new Date(date[0]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 = date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(new Date(date[1]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    bill_code_model_1.default.search(customers, items, [formattedDate_1, formattedDate_2], (0, escape_helper_1.mysql_real_escape_string)(keyword), page, status)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1][0].count,
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesInvoiceController.fetchArchive = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        bill_code_model_1.default.fetchArchiveYears(mode)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.query.year != undefined && req.query.month == undefined) {
        const year = parseInt(req.query.year.toString());
        bill_code_model_1.default.fetchArchiveMonths(year, mode)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = x.count;
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
        bill_code_model_1.default.fetchArchive(year, month, page, mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        customer: {
                            id: x.customer_id,
                            name: x.customer_name,
                        },
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : result[1][0].count,
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
exports.default = SalesInvoiceController;
