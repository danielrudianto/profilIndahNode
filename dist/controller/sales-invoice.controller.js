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
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const product_package_model_1 = require("../model/product-package.model");
class SalesInvoiceController {
}
_a = SalesInvoiceController;
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
    bill_code_model_1.default.create(customer_id, req.body.userId, payment_method_id, discount, delivery, service, date, uuid, bill.map((x) => {
        if (x.package_code_id != undefined) {
            return {
                package_code_id: x.package_code_id,
                item_id: null,
                item_unit_id: null,
                quantity: x.quantity,
                price: x.price,
                discount: 0,
            };
        }
        else {
            return {
                package_code_id: null,
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
            };
        }
    }))
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield item_price_model_1.default.updateMany(bill.filter((x) => x.save && x.item_id != null), req.body.userId);
            yield product_package_model_1.ProductPackageCodeModel.updatePrice(
            // Array of object with price and package_code_id
            bill.filter((x) => x.save && x.package_code_id != null));
            const bills = yield bill_code_model_1.default.fetchById(result.id);
            if (!bills) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            else {
                const updateStockArray = [];
                bills.bill.forEach((x) => {
                    if (x.package_code != null) {
                        x.package_code.package_content.forEach((content) => {
                            updateStockArray.push({
                                item_id: content.item_id,
                                quantity: (parseFloat(content.quantity.toString()) *
                                    parseFloat(x.quantity.toString()) *
                                    (content.item_unit == null
                                        ? 1
                                        : parseFloat(content.item_unit.conversion.toString())) *
                                    -1).toFixed(4),
                            });
                        });
                    }
                    else {
                        const quantity = parseFloat(x.quantity.toString()) *
                            (x.item_unit == null
                                ? 1
                                : parseFloat(x.item_unit.conversion.toString())) *
                            -1;
                        return {
                            item_id: x.item_id,
                            quantity: quantity.toFixed(4),
                        };
                    }
                });
                yield product_stock_model_1.default.updateStock(updateStockArray);
                return res.status(201).send(bills);
            }
        }
        catch (error) {
            console.error(`[error]: Error on updating stock ${error}`);
            return res.status(500).send(error);
        }
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating bill ${error}`);
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
        let subTotal = 0;
        for (let item of result.bill) {
            subTotal +=
                parseFloat(item.price.toString()) *
                    parseFloat(item.quantity.toString());
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { subTotal: subTotal, discount: parseFloat(result.discount.toString()), delivery: parseFloat(result.delivery.toString()), service: parseFloat(result.service.toString()) }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesInvoiceController.deleteById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id.toString());
        const result = yield bill_code_model_1.default.deleteById(id, req.body.userId);
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        if (!result.is_delete) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const socket = new socket_helper_1.default("deleteBill", result);
        socket.create();
        const bills = yield bill_code_model_1.default.fetchById(result.id);
        if (!bills) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        const updateStockArray = [];
        bills.bill.forEach((x) => {
            if (x.package_code != null) {
                x.package_code.package_content.forEach((content) => {
                    updateStockArray.push({
                        item_id: content.item_id,
                        quantity: (parseFloat(content.quantity.toString()) *
                            parseFloat(x.quantity.toString()) *
                            (content.item_unit == null
                                ? 1
                                : parseFloat(content.item_unit.conversion.toString()))).toFixed(4),
                    });
                });
            }
            else {
                const quantity = parseFloat(x.quantity.toString()) *
                    (x.item_unit == null
                        ? 1
                        : parseFloat(x.item_unit.conversion.toString()));
                return {
                    item_id: x.item_id,
                    quantity: quantity.toFixed(4),
                };
            }
        });
        product_stock_model_1.default.updateStock(updateStockArray)
            .then(() => {
            return res.status(201).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    catch (err) {
        return res.status(500).send(error_list_1.default["Unknown error"]);
    }
});
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
            count: parseInt(result[1][0].count.toString()),
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
            return res.status(200).send(result.map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString().replace("n", "")),
                };
            }));
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
                response[x.month - 1] = parseInt(x.count.toString().replace("n", ""));
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
                    : parseInt(result[1][0].count.toString().replace("n", "")),
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
exports.default = SalesInvoiceController;
