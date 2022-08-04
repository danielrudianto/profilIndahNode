"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_model_1 = require("../model/item.model");
class ReportController {
}
ReportController.fetchSalesStats = (req, res) => {
    const date = new Date();
    const date_before = new Date();
    date_before.setDate(date_before.getDate() - 1);
    Promise.all([
        bill_code_model_1.default.fetchByDate(date),
        bill_code_model_1.default.fetchByDate(date_before),
        item_model_1.ItemModel.fetchSoldByDate(date),
        item_model_1.ItemModel.fetchSoldByDate(date_before),
        bill_model_1.default.fetchQuantitySoldByDate(date),
        bill_model_1.default.fetchQuantitySoldByDate(date_before)
    ]).then(result => {
        return res.status(200).send({
            sales: result[0][0].value || 0,
            prev_sales: result[1][0].value || 0,
            items: result[2][0].count,
            prev_items: result[3][0].count,
            count: result[4][0].quantity || 0,
            prev_count: result[5][0].quantity || 0
        });
    });
};
ReportController.fetchMonthlySalesStats = (req, res) => {
    const date = new Date();
    const date_before = new Date();
    date_before.setMonth(date_before.getMonth() - 1);
    Promise.all([
        bill_code_model_1.default.fetchMonthlyByDate(date),
        bill_code_model_1.default.fetchMonthlyByDate(date_before),
        item_model_1.ItemModel.fetchMonthlySoldByDate(date),
        item_model_1.ItemModel.fetchMonthlySoldByDate(date_before),
        bill_model_1.default.fetchMonthlyQuantitySoldByDate(date),
        bill_model_1.default.fetchMonthlyQuantitySoldByDate(date_before)
    ]).then(result => {
        return res.status(200).send({
            sales: result[0][0].value || 0,
            prev_sales: result[1][0].value || 0,
            items: result[2][0].count,
            prev_items: result[3][0].count,
            count: result[4][0].quantity || 0,
            prev_count: result[5][0].quantity || 0
        });
    });
};
ReportController.fetchSalesChart = (req, res) => {
    const shift = parseInt(req.query.shift.toString());
    const monthly = (req.query.monthly === "false") ? false : (req.query.monthly === "true") ? true : false;
    const type = parseInt(req.query.type.toString());
    const limit = parseInt(process.env.LIMIT);
    const date = new Date();
    date.setMonth(date.getMonth() - shift);
    const current_year = date.getFullYear();
    const current_month = date.getMonth() + 1;
    switch (type) {
        case 0:
            // Ambil data penjualan
            bill_code_model_1.default.fetchChartItems(monthly, limit, shift).then(result => {
                if (monthly) {
                    const response = {};
                    response['current'] = [];
                    response['previous'] = [];
                    result[0].forEach(x => {
                        const value = x.value;
                        const diff = parseInt(x.diff);
                        response['current'][Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response['current'][i] = response['current'][i] || 0;
                    }
                    result[1].forEach(x => {
                        const value = x.value;
                        const diff = parseInt(x.diff);
                        response['previous'][Math.abs(diff + 12)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response['previous'][i] = response['previous'][i] | 0;
                    }
                    return res.status(200).send(response);
                }
                else {
                    const response = [];
                    result.forEach(x => {
                        const diff = x.diff;
                        const value = x.value;
                        response[Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response[i] = response[i] | 0;
                    }
                    return res.status(200).send(response);
                }
            }).catch(error => {
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
        case 1:
            // Ambil data penjualan
            item_model_1.ItemModel.fetchChartItems(monthly, limit, shift).then(result => {
                const response = [];
                if (monthly) {
                    const response = {};
                    response['current'] = [];
                    response['previous'] = [];
                    result[0].forEach(x => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response['current'][Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response['current'][i] = response['current'][i] || 0;
                    }
                    result[1].forEach(x => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response['previous'][Math.abs(diff + 12)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response['previous'][i] = response['previous'][i] | 0;
                    }
                    return res.status(200).send(response);
                }
                else {
                    const response = [];
                    result.forEach(x => {
                        const diff = x.diff;
                        const value = x.count;
                        response[Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response[i] = response[i] | 0;
                    }
                    return res.status(200).send(response);
                }
            }).catch(error => {
                console.log(error);
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
        case 2:
            item_model_1.ItemModel.fetchChartItems(monthly, limit, shift).then(result => {
                return res.status(200).send(result);
            }).catch(error => {
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
    }
};
exports.default = ReportController;
