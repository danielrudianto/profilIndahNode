"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
const sales_return_model_1 = __importDefault(require("../model/sales_return.model"));
class SalesReturnController {
}
SalesReturnController.create = (req, res) => {
    const date = new Date(req.body.date);
    const payment_method_id = req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const items = req.body.sales_return;
    if (items.length == 0) {
        return res.status(400).send(error_list_1.default["Parameter error"]);
    }
    const name = `RJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    const sales_return_code = new sales_return_model_1.default(name, date, req.body.userId, payment_method_id, items, null, true);
    sales_return_code
        .create()
        .then((result) => {
        sales_return_model_1.default.fetchById(result.id).then((salesReturn) => {
            if (!salesReturn) {
                return res.status(400).send(error_list_1.default["Not found"]);
            }
            const updateArray = [];
            salesReturn.sales_return.forEach((x) => {
                if (x.bill.item != null) {
                    updateArray.push({
                        item_id: x.bill.item.id,
                        quantity: parseFloat(x.quantity.toString()) *
                            (x.bill.item_unit == null
                                ? 1
                                : parseFloat(x.bill.item_unit.conversion.toString())),
                    });
                }
                else if (x.bill.package_code != null) {
                    x.bill.package_code.package_content.forEach((y) => {
                        updateArray.push({
                            item_id: y.item.id,
                            quantity: parseFloat(x.quantity.toString()) *
                                parseFloat(y.quantity.toString()) *
                                (y.item_unit == null
                                    ? 1
                                    : parseFloat(y.item_unit.conversion.toString())),
                        });
                    });
                }
            });
            product_stock_model_1.default.updateStock(updateArray)
                .then(() => {
                return res.status(201).send(result);
            })
                .catch((error) => {
                console.error(`[error]: Error on updating stock ${error}`);
                return res.status(500).send(error);
            });
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.fetchSearch = (req, res) => {
    console.log(req.body);
    const date = new Date(req.body.date);
    const items = req.body.items;
    const packages = req.body.packages;
    sales_return_model_1.default.fetchSearch(date, items, packages)
        .then((result) => {
        return res.status(200).send(result.map((x) => {
            return {
                id: x.id,
                name: x.name,
                date: x.date,
                customer: {
                    name: x.customer_name,
                },
            };
        }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.fetchArchives = (req, res) => {
    const mode = req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
        sales_return_model_1.default.fetchArchiveYears(mode)
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
        sales_return_model_1.default.fetchArchiveMonths(year, mode)
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
        sales_return_model_1.default.fetchArchive(year, month, page, mode)
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        customer: (x.customer_id == null) == null
                            ? null
                            : {
                                id: x.customer_id,
                                name: x.customer_name,
                            },
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
SalesReturnController.fetchById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchById(id)
        .then((result) => {
        if (result == null || result.sales_return.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            const bill_code_id = result === null || result === void 0 ? void 0 : result.sales_return[0].bill.bill_code_id;
            bill_code_model_1.default.fetchById(bill_code_id).then((bill) => {
                let total = 0;
                for (let item of result.sales_return) {
                    total +=
                        parseFloat(item.quantity.toString()) *
                            (parseFloat(item.bill.price.toString()) -
                                parseFloat(item.bill.discount.toString()));
                }
                return res.status(200).send(Object.assign(Object.assign({}, result), { bill: bill, customer: (result === null || result === void 0 ? void 0 : result.sales_return.length) == 0 ||
                        (result === null || result === void 0 ? void 0 : result.sales_return[0].bill.bill_code.customer) == null
                        ? null
                        : {
                            name: result.sales_return[0].bill.bill_code.customer.name,
                        }, total: total }));
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.deleteById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchById(id).then((salesReturn) => {
        if (salesReturn == null || salesReturn.is_delete) {
            return res.status(404).send("Data tidak ditemukan.");
        }
        else {
            sales_return_model_1.default.deleteById(id, req.body.userId)
                .then((result) => {
                sales_return_model_1.default.fetchById(id)
                    .then(() => {
                    product_stock_model_1.default.updateStock(salesReturn.sales_return.map((x) => {
                        const quantity = parseFloat(x.quantity.toString()) *
                            -1 *
                            (x.bill.item_unit == null
                                ? 1
                                : parseFloat(x.bill.item_unit.conversion.toString()));
                        return {
                            item_id: x.bill.item.id,
                            quantity: quantity,
                        };
                    }))
                        .then(() => {
                        return res.status(201).send(result);
                    })
                        .catch(() => {
                        return res.status(201).send(result);
                    });
                })
                    .catch(() => {
                    return res.status(201).send(result);
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
SalesReturnController.fetchCodeById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchCodeById(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = SalesReturnController;
