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
const product_package_model_1 = require("../model/product-package.model");
const queue_helper_1 = require("../helper/queue.helper");
const sales_return_model_1 = __importDefault(require("../model/sales_return.model"));
class SalesInvoiceController {
}
_a = SalesInvoiceController;
/**
 * Create sales invoice data
 * @param req
 * @param res
 */
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
    const userID = req.body.userId;
    bill_code_model_1.default.create({
        name: bill_code_model_1.default.generateName(date),
        customer_id: customer_id,
        payment_method_id: payment_method_id,
        discount: discount,
        delivery: delivery,
        service: service,
        date: date,
        uuid: uuid,
        items: bill.map((x) => {
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
        }),
        created_by: userID,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield item_price_model_1.default.updateMany(bill.filter((x) => x.save && x.item_id != null), req.body.userId);
            yield product_package_model_1.ProductPackageCodeModel.updatePrice(bill.filter((x) => x.save && x.package_code_id != null));
            yield queue_helper_1.queue.add("create-sales-invoice", result);
            return res.status(201).send(result);
        }
        catch (error) {
            console.error(`[error]: Error on updating stock ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        }
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating bill ${error}`);
        return res.status(500).send(error);
    });
};
/**
 * Search sales invoice data
 * Can be narrowed down by customer, item, date, page, keyword
 * @param req
 * @param res
 */
SalesInvoiceController.fetchSearch = (req, res) => {
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
/**
 * Search sales invoice data archive
 * @param req
 * @param res
 */
SalesInvoiceController.fetchArchive = (req, res) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
        bill_code_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString().replace("n", "")),
                };
            })
                .sort((a, b) => {
                return a.year - b.year;
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        const year = req.body.year;
        bill_code_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString().replace("n", ""));
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const mode = req.body.mode;
        const page = req.body.limit.page;
        const keyword = req.body.search.keyword;
        bill_code_model_1.default.fetchArchive({
            year: year,
            month: month,
            mode: mode,
            limit: 10,
            offset: (page - 1) * 10,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
        })
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        customer_name: x.customer_name,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString().replace("n", "")),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching sales invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Fetch bill by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.fetchByID(id)
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
        console.error(`[error]: Error on fetching sales invoice by ID ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch bill code by ID
 * @param req
 * @param res
 */
SalesInvoiceController.fetchCodeByID = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching bill code ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete bill by ID
 * @param req
 * @param res
 * @returns
 */
SalesInvoiceController.deleteByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;
    const result = yield bill_code_model_1.default.fetchByID(id);
    console.log(result);
    if (!result) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (result.is_delete) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    // Check if there is any sales return on this bill
    const salesReturn = yield sales_return_model_1.default.fetchByBillIDs(result.bill.map((x) => {
        return x.id;
    }));
    if (salesReturn.length > 0) {
        return res
            .status(400)
            .send(error_list_1.default["Delete bill sales return constraint"]);
    }
    const socket = new socket_helper_1.default("deleteBill", result);
    socket.create();
    bill_code_model_1.default.deleteByID(id, userID)
        .then((updateBill) => __awaiter(void 0, void 0, void 0, function* () {
        yield queue_helper_1.queue.add("delete-sales-invoice", result);
        return res.status(201).send(updateBill);
    }))
        .catch((error) => {
        console.error(`[error]: Error on deleting bill ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
/**
 * Fetch dashboard data
 * @param req
 * @param res
 */
SalesInvoiceController.fetchDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 1 Fetch today's sales
    // 2 Fetch this month's sales
    // 3 Fetch yesterday's sales
    // 4 Fetch last month's sales
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    Promise.all([
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate() - 1),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, null),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth(), null),
        bill_code_model_1.default.fetchByDate(today.getFullYear(), today.getMonth(), -today.getDate()),
    ])
        .then(([sales1, sales2, sales3, sales4, sales5]) => {
        return res.status(200).send({
            today: sales1[0].value == null ? 0 : parseFloat(sales1[0].value),
            yesterday: sales2[0].value == null ? 0 : parseFloat(sales2[0].value),
            thisMonth: sales3[0].value == null ? 0 : parseFloat(sales3[0].value),
            lastMonth: sales4[0].value == null ? 0 : parseFloat(sales4[0].value),
            monthOnMonth: sales5[0].value == null ? 0 : parseFloat(sales5[0].value),
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = SalesInvoiceController;
//# sourceMappingURL=sales-invoice.controller.js.map