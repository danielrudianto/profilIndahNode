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
const pdfmake_1 = __importDefault(require("pdfmake"));
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const purchase_document_model_1 = __importDefault(require("../model/purchase_document.model"));
const sales_distribution_model_1 = __importDefault(require("../model/sales_distribution.model"));
const path_1 = __importDefault(require("path"));
const stock_value_helper_1 = __importDefault(require("../helper/stock_value.helper"));
const brand_model_1 = require("../model/brand.model");
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
});
class ReportController {
}
_a = ReportController;
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
ReportController.fetchSalesReport = (req, res) => {
    const type = req.body.type;
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    if (type == 0) {
        // Fetch by brand
        brand_model_1.BrandModel.fetchSales(start, end)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (type == 1) {
        // Fetch by type
        item_type_model_1.default.fetchSales(start, end)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
};
ReportController.fetchPurchaseReport = (req, res) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = req.body.type;
    purchase_document_model_1.default.fetchReport(start, end, type).then(result => {
        return res.status(200).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ReportController.fetchFrequent = (req, res) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const brand_id = req.body.brand_id;
    const type_id = req.body.type_id;
    const limit = req.body.limit;
    if (brand_id != null) {
        brand_model_1.BrandModel.fetchFrequent(brand_id, start, end, limit)
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return Object.assign(Object.assign({}, x), { ordered: undefined, quantity: x.ordered });
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (type_id != null) {
        item_type_model_1.default.fetchFrequent(type_id, start, end, limit)
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return Object.assign(Object.assign({}, x), { ordered: undefined, quantity: x.ordered });
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(500).send("Mohon masukkan parameter yang sesuai");
    }
};
ReportController.fetchQuickStats = (req, res) => {
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
        bill_code_model_1.default.fetchTodaySales(),
        expense_model_1.default.fetchTodaySum(),
        // PurchaseDocumentModel.fetchTodaySum,
        // PurchaseDocumentModel.fetchUnconfirmedToday,
    ]).then(result => {
        const response = {
            sales: result[0].length == 0 ? {
                value: 0,
                discount: 0,
                service: 0,
                delivery: 0,
            } : {
                value: (result[0][0].value == null) ? 0 : parseFloat(result[0][0].value),
                discount: (result[0][0].discount == null) ? 0 : parseFloat(result[0][0].discount),
                delivery: (result[0][0].delivery == null) ? 0 : parseFloat(result[0][0].delivery),
                service: (result[0][0].service == null) ? 0 : parseFloat(result[0][0].service),
            },
            expense: result[1][0].value,
        };
        
        return res.status(200).send(response);
    }).catch(error => {
        return res.status(500).send(error);
    });
};
ReportController.fetchPurchaseReportDownload = (req, res) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = req.body.type;
    const id = req.body.id;
    const password = req.body.password;
    const fontDescriptors = {
        Roboto: {
            normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
            bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
            italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
            bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
        },
    };
    purchase_document_model_1.default.fetchReportById(start, end, type, id).then((result) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const purchase_table = [];
        purchase_table.push([
            {
                text: "Referensi",
                bold: true,
                alignment: "center",
            },
            {
                text: "Deskripsi",
                bold: true,
                alignment: "center",
            },
            {
                text: "Merek",
                bold: true,
                alignment: "center",
            },
            {
                text: "Tipe",
                bold: true,
                alignment: "center",
            },
            {
                text: "Surat Jalan",
                bold: true,
                alignment: "center",
            },
            {
                text: "Bon Pembelian",
                bold: true,
                alignment: "center",
            },
            {
                text: "Perusahaan",
                bold: true,
                alignment: "center",
            },
        ]);
        result.forEach((x) => {
            purchase_table.push([
                {
                    text: x.reference,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.description,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.item_brand_name,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.item_type_name,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.good_receipt_name,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.purchase_invoice_name,
                    bold: false,
                    alignment: "left",
                },
                {
                    text: x.company_name,
                    bold: false,
                    alignment: "left",
                },
            ]);
        });
        let name;
        if (type == 0) {
            const brand = yield brand_model_1.BrandModel.fetchById(id);
            name = (_b = brand[0]) === null || _b === void 0 ? void 0 : _b.name;
        }
        else if (type == 1) {
            const type = yield item_type_model_1.default.fetchById(id);
            name = type === null || type === void 0 ? void 0 : type.name;
        }
        else {
            const supplier = yield supplier_model_1.default.fetchById(id);
            name = supplier === null || supplier === void 0 ? void 0 : supplier.name;
        }
        let documentDefinition = {
            pageSize: "A4",
            pageOrientation: 'landscape',
            userPassword: password,
            permissions: {
                modifying: false,
                annotating: true,
                contentAccessibility: true,
                documentAssembly: true
            },
            content: [
                {
                    text: "Laporan Pembelian",
                    bold: true,
                    fontSize: 20,
                    alignment: "center",
                    margin: [0, 0, 0, 5]
                },
                {
                    text: (type == 0) ? `Merek ${name}` : (type == 1) ? `Tipe ${name}` : `Supplier ${name}`,
                    bold: true,
                    fontSize: 14,
                    alignment: "center",
                    margin: [0, 0, 0, 15],
                },
                {
                    layout: "lightHorizontalLines",
                    table: {
                        headerRows: 1,
                        widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
                        body: purchase_table,
                    },
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
    })).catch(error => {
        console.log(error);
        return res.status(500).send(error);
    });
};
exports.default = ReportController;
