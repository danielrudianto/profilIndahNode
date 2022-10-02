"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const sales_return_model_1 = __importDefault(require("../model/sales_return.model"));
class SalesReturnController {
}
SalesReturnController.create = (req, res) => {
    const date = new Date(req.body.date);
    const payment_method_id = req.body.payment_method_id;
    const customer_id = req.body.customer_id;
    const items = req.body.sales_return;
    const name = `RJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
    const sales_return_code = new sales_return_model_1.default(name, date, req.body.userId, customer_id, payment_method_id, items, null, true);
    sales_return_code
        .create()
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.fetchSearch = (req, res) => {
    const date = new Date(req.body.date);
    const items = req.body.item;
    bill_code_model_1.default.fetchSearch(date, items)
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
SalesReturnController.fetchArchive = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        const archive_years = sales_return_model_1.default.fetchArchiveYears();
        const count_archive_years = sales_return_model_1.default.countArchiveByYear();
        Promise.all([archive_years, count_archive_years])
            .then((result) => {
            const response = [];
            result[0].forEach((item) => {
                response.push({
                    year: item.year,
                    count: result[1].filter((x) => x.year == item.year)[0]
                        .count,
                });
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (!req.params.month) {
        const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        sales_return_model_1.default.countArchiveByMonth(year)
            .then((counts) => {
            counts.forEach((x) => {
                const month = x.month;
                const num = x.count;
                count[month - 1] = num;
            });
            return res.status(200).send(count);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.params.year && req.params.month) {
        const page = !req.query.page
            ? 1
            : Math.max(parseInt(req.query.page.toString()), 1);
        const limit = parseInt(process.env.LIMIT.toString());
        const offset = (page - 1) * limit;
        Promise.all([
            sales_return_model_1.default.fetchArchive(year, month, offset, limit),
            sales_return_model_1.default.countArchive(year, month),
        ])
            .then((result) => {
            return res.status(200).send({
                data: result[0],
                count: result[1],
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(400).send("Input tidak dikenal.");
    }
};
SalesReturnController.fetchById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    sales_return_model_1.default.fetchById(id).then(result => {
        return res.status(200).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
exports.default = SalesReturnController;
