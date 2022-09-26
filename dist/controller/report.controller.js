"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pdfmake_1 = __importDefault(require("pdfmake"));
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const item_model_1 = require("../model/item.model");
const purchase_document_model_1 = __importDefault(require("../model/purchase_document.model"));
const sales_distribution_model_1 = __importDefault(require("../model/sales_distribution.model"));
const path_1 = __importDefault(require("path"));
const stock_value_helper_1 = __importDefault(require("../helper/stock_value.helper"));
var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
});
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
        bill_model_1.default.fetchQuantitySoldByDate(date_before),
    ]).then((result) => {
        return res.status(200).send({
            sales: result[0][0].value || 0,
            prev_sales: result[1][0].value || 0,
            items: result[2][0].count,
            prev_items: result[3][0].count,
            count: result[4][0].quantity || 0,
            prev_count: result[5][0].quantity || 0,
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
        bill_model_1.default.fetchMonthlyQuantitySoldByDate(date_before),
    ]).then((result) => {
        return res.status(200).send({
            sales: result[0][0].value || 0,
            prev_sales: result[1][0].value || 0,
            items: result[2][0].count,
            prev_items: result[3][0].count,
            count: result[4][0].quantity || 0,
            prev_count: result[5][0].quantity || 0,
        });
    });
};
ReportController.fetchSalesChart = (req, res) => {
    const shift = parseInt(req.query.shift.toString());
    const monthly = req.query.monthly === "false"
        ? false
        : req.query.monthly === "true"
            ? true
            : false;
    const type = parseInt(req.query.type.toString());
    const limit = parseInt(process.env.LIMIT);
    const date = new Date();
    date.setMonth(date.getMonth() - shift);
    const current_year = date.getFullYear();
    const current_month = date.getMonth() + 1;
    switch (type) {
        case 0:
            // Ambil data penjualan
            bill_code_model_1.default.fetchChartItems(monthly, limit, shift)
                .then((result) => {
                if (monthly) {
                    const response = {};
                    response["current"] = [];
                    response["previous"] = [];
                    result[0].forEach((x) => {
                        const value = x.value;
                        const diff = parseInt(x.diff);
                        response["current"][Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["current"][i] = response["current"][i] || 0;
                    }
                    result[1].forEach((x) => {
                        const value = x.value;
                        const diff = parseInt(x.diff);
                        response["previous"][Math.abs(diff + 12)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["previous"][i] = response["previous"][i] | 0;
                    }
                    return res.status(200).send(response);
                }
                else {
                    const response = [];
                    result.forEach((x) => {
                        const diff = x.diff;
                        const value = x.value;
                        response[Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response[i] = response[i] | 0;
                    }
                    return res.status(200).send(response);
                }
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
        case 1:
            // Ambil data penjualan
            item_model_1.ItemModel.fetchChartItems(monthly, limit, shift)
                .then((result) => {
                if (monthly) {
                    const response = {};
                    response["current"] = [];
                    response["previous"] = [];
                    result[0].forEach((x) => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response["current"][Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["current"][i] = response["current"][i] || 0;
                    }
                    result[1].forEach((x) => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response["previous"][Math.abs(diff + 12)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["previous"][i] = response["previous"][i] | 0;
                    }
                    return res.status(200).send(response);
                }
                else {
                    const response = [];
                    result.forEach((x) => {
                        const diff = x.diff;
                        const value = x.count;
                        response[Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response[i] = response[i] | 0;
                    }
                    return res.status(200).send(response);
                }
            })
                .catch((error) => {
                console.log(error);
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
        case 2:
            item_model_1.ItemModel.fetchChartItems(monthly, limit, shift)
                .then((result) => {
                if (monthly) {
                    const response = {};
                    response["current"] = [];
                    response["previous"] = [];
                    result[0].forEach((x) => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response["current"][Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["current"][i] = response["current"][i] || 0;
                    }
                    result[1].forEach((x) => {
                        const value = x.count;
                        const diff = parseInt(x.diff);
                        response["previous"][Math.abs(diff + 12)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response["previous"][i] = response["previous"][i] | 0;
                    }
                    return res.status(200).send(response);
                }
                else {
                    const response = [];
                    result.forEach((x) => {
                        const diff = x.diff;
                        const value = x.count;
                        response[Math.abs(diff)] = value;
                    });
                    for (var i = 0; i < 10; i++) {
                        response[i] = response[i] | 0;
                    }
                    return res.status(200).send(response);
                }
            })
                .catch((error) => {
                log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                return res.status(500).send(error);
            });
            break;
    }
};
ReportController.fetchPLStats = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);
    const month_name = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
    ];
    const fontDescriptors = {
        Roboto: {
            normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
            bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
            italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
            bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
        },
    };
    if (report == 0) {
        Promise.all([
            bill_code_model_1.default.fetchSum(month, year),
            sales_distribution_model_1.default.fetchSum(month, year),
            purchase_document_model_1.default.fetchSum(month, year),
            expense_model_1.default.fetchSum(month, year),
            month == 0
                ? stock_value_helper_1.default.fetchCOGS(new Date(year, 11, 31))
                : stock_value_helper_1.default.fetchCOGS(new Date(year, month, 0)),
        ])
            .then((result) => {
            const sales_table = [];
            // Sales table
            sales_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Pengiriman Barang",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "center",
                },
            ]);
            let total_value = 0;
            let total_delivery_value = parseFloat(result[0][0].delivery.toString());
            result[1].forEach((x) => {
                total_value += parseFloat(x.value.toString());
                sales_table.push([
                    {
                        text: x.name,
                        bold: false,
                        alignment: "left",
                    },
                    formatter.format(parseFloat(x.value.toString())),
                    "-",
                    formatter.format(parseFloat(x.value.toString())),
                ]);
            });
            sales_table.push([
                {
                    text: "Total penjualan teralokasi",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_value),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "-",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_value),
                    bold: true,
                    alignment: "left",
                },
            ]);
            sales_table.push([
                {
                    text: "Penjualan tidak teralokasi",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(parseFloat(result[0][0].value.toString()) -
                        parseFloat(result[0][0].discount.toString()) -
                        total_value),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "-",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(parseFloat(result[0][0].value.toString()) -
                        parseFloat(result[0][0].discount.toString()) -
                        total_value),
                    bold: true,
                    alignment: "left",
                },
            ]);
            sales_table.push([
                {
                    text: "Keseluruhan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(parseFloat(result[0][0].value.toString()) -
                        parseFloat(result[0][0].discount.toString())),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(parseFloat(result[0][0].delivery.toString())),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(parseFloat(result[0][0].value.toString()) +
                        parseFloat(result[0][0].discount.toString()) +
                        parseFloat(result[0][0].delivery.toString())),
                    bold: true,
                    aligment: "left",
                },
            ]);
            // Purchase table
            const purchase_table = [];
            let total_purchase_value = 0;
            let total_purchase_discount = 0;
            purchase_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Potongan Harga",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "center",
                },
            ]);
            result[2].forEach((x) => {
                purchase_table.push([
                    {
                        text: `${x.name}`,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.discount.toString())),
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString())),
                        bold: false,
                        alignment: "left",
                    },
                ]);
                total_purchase_value += parseFloat(x.value.toString());
                total_purchase_discount += parseFloat(x.discount.toString());
            });
            purchase_table.push([
                {
                    text: "Keseluruhan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_purchase_value),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_purchase_discount),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_purchase_value - total_purchase_discount),
                    bold: true,
                    alignment: "left",
                },
            ]);
            const expenses = [];
            const expense_table = [];
            let total_expense_value = 0;
            expense_table.push([
                {
                    text: "Tipe",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "center",
                },
            ]);
            result[3]
                .filter((x) => x.parent_id == null)
                .forEach((y) => {
                expenses.push(Object.assign(Object.assign({}, y), { value: 0, children: [] }));
            });
            const child_expenses = result[3].filter((x) => x.parent_id != null);
            child_expenses.forEach((child_expense) => {
                const index = expenses.findIndex((expense) => expense.id == child_expense.parent_id);
                if (index != -1) {
                    expenses[index].children.push(child_expense);
                    expenses[index].value += parseFloat(child_expense.value.toString());
                    total_expense_value += parseFloat(child_expense.value.toString());
                }
            });
            expenses.forEach((expense) => {
                expense_table.push([
                    {
                        text: expense.name,
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(expense.value.toString())),
                        bold: true,
                        alignment: "left",
                    },
                ]);
                if (expense.children.length > 0) {
                    expense.children.forEach((child_expense) => {
                        expense_table.push([
                            {
                                text: `${expense.name}/${child_expense.name}`,
                                bold: false,
                                alignment: "left",
                            },
                            {
                                text: formatter.format(parseFloat(child_expense.value.toString())),
                                bold: false,
                                alignment: "left",
                            },
                        ]);
                    });
                }
            });
            expense_table.push([
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_expense_value),
                    bold: true,
                    alignment: "left",
                },
            ]);
            const hpp_table = [];
            let hpp_value = 0;
            hpp_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "center",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "center",
                },
            ]);
            result[4].forEach((x) => {
                const name = x.f2;
                const value = parseFloat(x.f0);
                hpp_value += value;
                hpp_table.push([
                    {
                        text: name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(value),
                        bold: false,
                        alignment: "left",
                    },
                ]);
            });
            hpp_table.push([
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(hpp_value),
                    bold: true,
                    alignment: "left",
                },
            ]);
            const sales_value = parseFloat(result[0][0].value.toString()) -
                parseFloat(result[0][0].discount.toString()) -
                total_value;
            let documentDefinition = {
                pageSize: "A4",
                content: [
                    {
                        text: "Laporan Laba Rugi",
                        bold: true,
                        fontSize: 20,
                        alignment: "center",
                    },
                    {
                        text: month == 0
                            ? `Tahun ${year}`
                            : `${month_name[month - 1]} ${year}`,
                        bold: true,
                        fontSize: 16,
                        alignment: "center",
                        margin: [0, 0, 0, 20],
                    },
                    {
                        text: "Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "auto", "auto", "*"],
                            body: sales_table,
                        },
                        margin: [0, 0, 0, 15],
                    },
                    {
                        text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                    },
                    {
                        text: "Pembelian",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "auto", "auto", "*"],
                            body: purchase_table,
                        },
                        margin: [0, 0, 0, 15],
                    },
                    {
                        text: "Pengeluaran",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["*", "*"],
                            body: expense_table,
                        },
                        margin: [0, 0, 0, 15],
                    },
                    {
                        text: "Harga Pokok Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 10],
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["*", "*"],
                            body: hpp_table,
                        },
                        margin: [0, 0, 0, 15],
                    },
                    {
                        text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                    },
                    {
                        text: `Laba / Rugi: ${formatter.format(total_value - hpp_value - total_expense_value)}`,
                        bold: true,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                    },
                ],
            };
            const printer = new pdfmake_1.default(fontDescriptors);
            const pdfDocument = printer.createPdfKitDocument(documentDefinition);
            let chunks = [];
            var pdfResult;
            pdfDocument.on("data", function (chunk) {
                chunks.push(chunk);
            });
            pdfDocument.on("end", function () {
                pdfResult = Buffer.concat(chunks);
                return res.status(200).send({
                    data: `data:application/pdf;base64,${pdfResult.toString("base64")}`,
                });
            });
            pdfDocument.end();
        })
            .catch((error) => {
            log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch Profit Loss", req.body.userId);
            return res.status(500).send(error);
        });
    }
    else {
        Promise.all([]);
    }
};
ReportController.fetchFrequentItems = (req, res) => {
    const monthly = !req.query.monthly
        ? false
        : req.query.monthly === "true"
            ? true
            : false;
    item_model_1.ItemModel.fetchFrequentItems(monthly)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Report Controller - Fetch frequent items", req.body.userId);
        return res.status(500).send(error);
    });
};
ReportController.fetchReception = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const date = parseInt(req.params.date);
    bill_code_model_1.default.fetchReception(year, month, date)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Report Controller - Fetch Reception", req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = ReportController;
