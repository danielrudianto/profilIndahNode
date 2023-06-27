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
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const expense_model_1 = __importDefault(require("../model/expense.model"));
const purchase_invoice_model_1 = __importDefault(require("../model/purchase-invoice.model"));
const sales_distribution_model_1 = __importDefault(require("../model/sales_distribution.model"));
const path_1 = __importDefault(require("path"));
const exceljs_1 = __importDefault(require("exceljs"));
const stock_value_helper_1 = __importDefault(require("../helper/stock_value.helper"));
const brand_model_1 = require("../model/brand.model");
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
const item_model_1 = require("../model/item.model");
const company_model_1 = __importDefault(require("../model/company.model"));
const stock_card_helper_1 = __importDefault(require("../helper/stock_card.helper"));
const product_stock_model_1 = __importDefault(require("../model/product-stock.model"));
var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
});
var percentage_formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});
class ReportController {
}
_a = ReportController;
ReportController.monthNames = [
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
ReportController.fontDescriptors = {
    Roboto: {
        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
        italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
        bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
    },
    Cairo: {
        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Bold.ttf"),
    },
};
ReportController.fetchMoneyReceipt = (req, res) => {
    const date = new Date(req.body.date);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    bill_code_model_1.default.fetchMoneyReceipt(formattedDate)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchPurchaseReport = (req, res) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;
    purchase_invoice_model_1.default.calculateTotalPurchase(month, year, mode)
        .then((result) => {
        if (mode == "plain") {
            const date = new Date(year, month, 0).getDate();
            const purchase_dates = new Array(date).fill(0);
            for (let purchase of result[0]) {
                purchase_dates[purchase.day - 1] =
                    parseFloat(purchase.value) - parseFloat(purchase.discount);
            }
            return res.status(200).send({
                purchase: purchase_dates,
                purchase_detail: result[1]
                    .map((x) => {
                    return {
                        name: x.supplier_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "supplier") {
            return res.status(200).send({
                purchase_detail: result
                    .map((x) => {
                    return {
                        name: x.supplier_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "type") {
            return res.status(200).send({
                purchase_detail: result
                    .map((x) => {
                    return {
                        name: x.item_type_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "brand") {
            return res.status(200).send({
                purchase_detail: result
                    .map((x) => {
                    return {
                        name: x.item_brand_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchSalesReport = (req, res) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;
    bill_code_model_1.default.calculateTotalSales(month, year, mode)
        .then((result) => {
        if (mode == "plain") {
            const date = new Date(year, month, 0).getDate();
            const sales_dates = new Array(date).fill(0);
            for (let sales of result[0]) {
                sales_dates[sales.day - 1] =
                    parseFloat(sales.value) - parseFloat(sales.discount);
            }
            return res.status(200).send({
                sales: sales_dates,
                sales_detail: result[1]
                    .map((x) => {
                    return {
                        name: x.customer_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()) +
                            parseFloat(x.delivery.toString()) +
                            parseFloat(x.service.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "customer") {
            return res.status(200).send({
                sales_detail: result
                    .map((x) => {
                    return {
                        name: x.customer_name,
                        value: parseFloat(x.value.toString()) -
                            parseFloat(x.discount.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "type") {
            return res.status(200).send({
                sales_detail: result
                    .map((x) => {
                    return {
                        name: x.item_type_name,
                        value: parseFloat(x.value.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "brand") {
            return res.status(200).send({
                sales_detail: result
                    .map((x) => {
                    return {
                        name: x.item_brand_name,
                        value: parseFloat(x.value.toString()),
                    };
                })
                    .sort((a, b) => {
                    return b.value - a.value;
                }),
            });
        }
        else if (mode == "download") {
            const workbook = new exceljs_1.default.Workbook();
            // Setting up workbook properties
            workbook.creator = "Toko Profil Indah";
            workbook.created = new Date();
            workbook.modified = new Date();
            workbook.lastModifiedBy = "Toko Profil Indah";
            const customerSheet = workbook.addWorksheet("Customers", {
                state: "visible",
            });
            customerSheet.addRow([
                "Name",
                "Value",
                "Discount",
                "Delivery",
                "Service",
            ]);
            result[0].forEach((data) => {
                customerSheet.addRow([
                    data.customer_name,
                    parseFloat(data.value.toString()),
                    parseFloat(data.discount.toString()),
                    parseFloat(data.delivery.toString()),
                    parseFloat(data.service.toString()),
                ]);
            });
            customerSheet.getColumn(2).numFmt = "#,###.00";
            customerSheet.getColumn(3).numFmt = "#,###.00";
            customerSheet.getColumn(4).numFmt = "#,###.00";
            customerSheet.getColumn(5).numFmt = "#,###.00";
            customerSheet.getColumn(1).width = 18;
            customerSheet.getColumn(2).width = 25;
            customerSheet.getColumn(3).width = 25;
            customerSheet.getColumn(4).width = 25;
            customerSheet.getColumn(5).width = 25;
            const typeSheet = workbook.addWorksheet("Types", {
                state: "visible",
            });
            typeSheet.addRow(["Name", "Value"]);
            result[1].forEach((data) => {
                typeSheet.addRow([
                    data.item_type_name,
                    parseFloat(data.value.toString()),
                ]);
            });
            typeSheet.getColumn(2).numFmt = "#,###.00";
            typeSheet.getColumn(1).width = 18;
            typeSheet.getColumn(2).width = 25;
            const brandSheet = workbook.addWorksheet("Brands", {
                state: "visible",
            });
            brandSheet.addRow(["Name", "Value"]);
            result[2].forEach((data) => {
                brandSheet.addRow([
                    data.item_brand_name,
                    parseFloat(data.value.toString()),
                ]);
            });
            brandSheet.getColumn(2).numFmt = "#,###.00";
            brandSheet.getColumn(1).width = 18;
            brandSheet.getColumn(2).width = 25;
            workbook.xlsx
                .writeBuffer()
                .then((buffer) => {
                return res.status(200).send({
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchInventoryReport = (req, res) => {
    sales_distribution_model_1.default.fetchValue().then((result) => {
        var stockIn = result[0][0].value;
        var stockOut = result[1][0].value;
        return res.status(200).send({
            value: stockIn - stockOut,
        });
    });
};
ReportController.fetchPLStats = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);
    if (report == 0) {
        Promise.all([
            bill_code_model_1.default.fetchSum(month, year),
            sales_distribution_model_1.default.fetchSum(month, year),
            purchase_invoice_model_1.default.fetchSum(month, year),
            company_model_1.default.fetchAll(),
            expense_model_1.default.fetchSum(month, year),
            month == 0
                ? stock_value_helper_1.default.fetchCOGS(new Date(year - 1, 11, 31), new Date(year, 11, 31))
                : stock_value_helper_1.default.fetchCOGS(new Date(year, month - 1, 0), new Date(year, month, 0)),
        ])
            .then((result) => {
            const sales_table = [];
            let total_sales_value = [];
            const sales_value = result[0][0].value == null
                ? 0
                : parseFloat(result[0][0].value.toString());
            const sales_discount = result[0][0].discount == null
                ? 0
                : parseFloat(result[0][0].discount.toString());
            const sales_delivery = result[0][0].delivery == null
                ? 0
                : parseFloat(result[0][0].delivery.toString());
            const sales_service = result[0][0].service == null
                ? 0
                : parseFloat(result[0][0].service.toString());
            // Sales table
            sales_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Jasa",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Pengiriman Barang",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
                },
            ]);
            let total_value = 0;
            result[1].forEach((x) => {
                total_value += parseFloat(x.value.toString());
                total_sales_value.push({
                    id: x.company_id,
                    value: parseFloat(x.value.toString()),
                });
                sales_table.push([
                    {
                        text: x.name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: "N/A",
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: "N/A",
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
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
                    text: formatter.format(sales_service),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_delivery),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_value + sales_delivery + sales_service),
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
                    text: formatter.format(sales_value - sales_discount - total_value),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "N/A",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "N/A",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_value - sales_discount - total_value),
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
                    text: formatter.format(sales_value - sales_discount),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_service),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_delivery),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_value - sales_discount + sales_delivery + sales_service),
                    bold: true,
                    aligment: "left",
                },
            ]);
            const purchase_table = [];
            let total_purchase_value = 0;
            let total_purchase_discount = 0;
            purchase_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Potongan Harga",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
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
            const expense_section = [
                {
                    text: "Pengeluaran",
                    bold: true,
                    fontSize: 14,
                    alignment: "center",
                    margin: [0, 0, 0, 15],
                    tocItem: true,
                    pageOrientation: "landscape",
                },
            ];
            let total_expense_value = [];
            result[3].forEach((company, companyIndex) => {
                const expense_table = [];
                const expenses = [];
                total_expense_value.push({
                    id: company.id,
                    value: 0,
                });
                expense_section.push({
                    text: company.name,
                    bold: true,
                    fontSize: 14,
                    alignment: "left",
                    margin: [0, 0, 0, 15],
                    pageOrientation: "landscape",
                });
                let expense_value = 0;
                expense_table.push([
                    {
                        text: "Tipe",
                        bold: true,
                        alignment: "left",
                        fontSize: 12,
                    },
                    {
                        text: "Nominal",
                        bold: true,
                        alignment: "left",
                        fontSize: 12,
                    },
                ]);
                result[4]
                    .filter((x) => x.parent_id == null && x.company_id == company.id)
                    .forEach((y) => {
                    expenses.push(Object.assign(Object.assign({}, y), { value: 0, children: [] }));
                    const child_expenses = result[4].filter((z) => z.parent_id == y.id && z.company_id == company.id);
                    child_expenses.forEach((child_expense) => {
                        const index = expenses.findIndex((expense) => expense.id == child_expense.parent_id);
                        if (index != -1) {
                            expenses[index].children.push(child_expense);
                            expenses[index].value += parseFloat(child_expense.value.toString());
                            expense_value += parseFloat(child_expense.value.toString());
                            total_expense_value[companyIndex].value += parseFloat(child_expense.value.toString());
                        }
                    });
                });
                expenses.forEach((expense) => {
                    expense_table.push([
                        {
                            text: expense.name,
                            bold: true,
                            alignment: "left",
                            fontSize: 12,
                        },
                        {
                            text: formatter.format(parseFloat(expense.value.toString())),
                            bold: true,
                            alignment: "left",
                            fontSize: 12,
                        },
                    ]);
                    if (expense.children.length > 0) {
                        expense.children.forEach((child_expense) => {
                            expense_table.push([
                                {
                                    text: `${expense.name}/${child_expense.name}`,
                                    bold: false,
                                    alignment: "left",
                                    fontSize: 12,
                                },
                                {
                                    text: formatter.format(parseFloat(child_expense.value.toString())),
                                    bold: false,
                                    alignment: "left",
                                    fontSize: 12,
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
                        fontSize: 12,
                    },
                    {
                        text: formatter.format(expense_value),
                        bold: true,
                        alignment: "left",
                        fontSize: 12,
                    },
                ]);
                expense_section.push({
                    layout: "lightHorizontalLines",
                    table: {
                        headerRows: 1,
                        widths: ["*", "*"],
                        body: expense_table,
                    },
                    margin: [0, 0, 0, 15],
                    pageOrientation: "landscape",
                });
            });
            const hpp_table = [];
            let hpp_value = 0;
            hpp_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
            ]);
            let cogs_value = [];
            result[5].forEach((x) => {
                const name = x.f2;
                const value = parseFloat(x.f0);
                const company_id = x.f1;
                cogs_value.push({
                    id: company_id,
                    name: name,
                    value: value,
                });
            });
            cogs_value.forEach((cogs) => {
                hpp_value += cogs.value;
                hpp_table.push([
                    {
                        text: cogs.name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(cogs.value),
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
            const summary_section = [
                {
                    text: "Laba / Rugi",
                    bold: true,
                    fontSize: 14,
                    alignment: "center",
                    margin: [0, 0, 0, 10],
                    pageBreak: "before",
                    tocItem: true,
                    pageOrientation: "landscape",
                },
            ];
            result[3].forEach((x) => {
                summary_section.push({
                    text: x.name,
                    bold: true,
                    fontSize: 14,
                    alignment: "left",
                    margins: [0, 0, 0, 15],
                    pageOrientation: "landscape",
                });
                const summary_table = [
                    [
                        {
                            text: "Keterangan",
                            bold: true,
                            alignment: "left",
                            fontSize: 12,
                        },
                        {
                            text: "Nominal",
                            bold: true,
                            alignment: "left",
                            fontSize: 12,
                        },
                        {
                            text: "Persentase",
                            bold: true,
                            alignment: "left",
                            fontSize: 12,
                        },
                    ],
                ];
                const sales_value_company_index = total_sales_value.findIndex((y) => y.id == x.id);
                let sales_value_company = 0;
                if (sales_value_company_index != -1) {
                    sales_value_company =
                        total_sales_value[sales_value_company_index].value;
                }
                const cogs_value_company_index = cogs_value.findIndex((y) => y.id == x.id);
                let cogs_value_company = 0;
                if (cogs_value_company_index != -1) {
                    cogs_value_company = cogs_value[cogs_value_company_index].value;
                }
                const expense_value_company_index = total_expense_value.findIndex((y) => y.id == x.id);
                let expense_value_company = 0;
                if (expense_value_company_index != -1) {
                    expense_value_company =
                        total_expense_value[expense_value_company_index].value;
                }
                summary_table.push([
                    {
                        text: "Laba kotor",
                        bold: true,
                        fontSize: 12,
                    },
                    {
                        text: formatter.format(sales_value_company - cogs_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                    {
                        text: sales_value_company == 0
                            ? "0.00%"
                            : percentage_formatter.format((sales_value_company - cogs_value_company) /
                                sales_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                ]);
                summary_table.push([
                    {
                        text: "Laba bersih",
                        bold: true,
                        fontSize: 12,
                    },
                    {
                        text: formatter.format(sales_value_company -
                            cogs_value_company -
                            expense_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                    {
                        text: sales_value_company == 0
                            ? "0.00%"
                            : percentage_formatter.format((sales_value_company -
                                cogs_value_company -
                                expense_value_company) /
                                sales_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                ]);
                summary_section.push({
                    layout: "lightHorizontalLines",
                    table: {
                        headerRows: 1,
                        widths: ["*", "*", "*"],
                        body: summary_table,
                    },
                    margin: [0, 0, 0, 15],
                    pageOrientation: "landscape",
                });
            });
            let documentDefinition = {
                pageSize: "A4",
                content: [
                    {
                        text: "Laporan Laba Rugi",
                        bold: true,
                        fontSize: 20,
                        alignment: "center",
                        pageOrientation: "landscape",
                    },
                    {
                        text: month == 0
                            ? `Tahun ${year}`
                            : `${_a.monthNames[month - 1]} ${year}`,
                        bold: true,
                        fontSize: 16,
                        alignment: "center",
                        margin: [0, 0, 0, 20],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Daftar isi",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        toc: {
                            title: { text: "" },
                            pageOrientation: "landscape",
                        },
                    },
                    {
                        text: "Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
                        pageBreak: "before",
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "*", "*", "*", "*"],
                            body: sales_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                        pageBreak: "after",
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Pembelian",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "*", "*", "*"],
                            body: purchase_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                        pageBreak: "after",
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Harga Pokok Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
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
                        pageBreak: "after",
                    },
                    ...expense_section,
                    ...summary_section,
                ],
                footer: (currentPage, pageCount) => {
                    return {
                        text: currentPage.toString() + " of " + pageCount,
                        alignment: "center",
                        bold: false,
                        fontSize: 8,
                    };
                },
                pageMargins: [20, 60, 20, 20],
            };
            const printer = new pdfmake_1.default(_a.fontDescriptors);
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
            return res.status(500).send(error);
        });
    }
    else {
        Promise.all([
            bill_code_model_1.default.fetchSum(month, year),
            sales_distribution_model_1.default.fetchSum(month, year),
            purchase_invoice_model_1.default.fetchSum(month, year),
            company_model_1.default.fetchAll(),
            expense_model_1.default.fetchSum(month, year),
            month == 0
                ? stock_value_helper_1.default.fetchCOGS(new Date(year - 1, 11, 31), new Date(year, 11, 31))
                : stock_value_helper_1.default.fetchCOGS(new Date(year, month - 1, 0), new Date(year, month, 0)),
            bill_code_model_1.default.fetchAppendix(month, year),
            purchase_invoice_model_1.default.fetchAppendix(month, year),
            expense_model_1.default.fetchAppendix(month, year),
        ])
            .then((result) => {
            const sales_table = [];
            let total_sales_value = [];
            const sales_value = result[0][0].value == null
                ? 0
                : parseFloat(result[0][0].value.toString());
            const sales_discount = result[0][0].discount == null
                ? 0
                : parseFloat(result[0][0].discount.toString());
            const sales_delivery = result[0][0].delivery == null
                ? 0
                : parseFloat(result[0][0].delivery.toString());
            const sales_service = result[0][0].service == null
                ? 0
                : parseFloat(result[0][0].service.toString());
            // Sales table
            sales_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Jasa",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Pengiriman Barang",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
                },
            ]);
            let total_value = 0;
            result[1].forEach((x) => {
                total_value += parseFloat(x.value.toString());
                total_sales_value.push({
                    id: x.company_id,
                    value: parseFloat(x.value.toString()),
                });
                sales_table.push([
                    {
                        text: x.name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: "N/A",
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: "N/A",
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
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
                    text: formatter.format(sales_delivery),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_service),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(total_value + sales_delivery + sales_service),
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
                    text: formatter.format(sales_value - sales_discount - total_value),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "N/A",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "N/A",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_value - sales_discount - total_value),
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
                    text: formatter.format(sales_value - sales_discount),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_service),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_delivery),
                    bold: true,
                    alignment: "left",
                },
                {
                    text: formatter.format(sales_value - sales_discount + sales_delivery + sales_service),
                    bold: true,
                    aligment: "left",
                },
            ]);
            const purchase_table = [];
            let total_purchase_value = 0;
            let total_purchase_discount = 0;
            purchase_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Potongan Harga",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Total",
                    bold: true,
                    alignment: "left",
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
            const expense_section = [];
            let total_expense_value = [];
            result[3].forEach((company, companyIndex) => {
                const expense_table = [];
                const expenses = [];
                total_expense_value.push({
                    id: company.id,
                    value: 0,
                });
                const index = result[4].findIndex((expense) => expense.company_id == company.id);
                if (index != -1) {
                    expense_section.push({
                        text: company.name,
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    });
                    let expense_value = 0;
                    expense_table.push([
                        {
                            text: "Tipe",
                            bold: true,
                            alignment: "left",
                        },
                        {
                            text: "Nominal",
                            bold: true,
                            alignment: "left",
                        },
                    ]);
                    result[4]
                        .filter((x) => x.parent_id == null && x.company_id == company.id)
                        .forEach((y) => {
                        expenses.push(Object.assign(Object.assign({}, y), { value: 0, children: [] }));
                        const child_expenses = result[4].filter((x) => x.parent_id == y.id && x.company_id == company.id);
                        child_expenses.forEach((child_expense) => {
                            const index = expenses.findIndex((expense) => expense.id == child_expense.parent_id);
                            if (index != -1) {
                                expenses[index].children.push(child_expense);
                                expenses[index].value += parseFloat(child_expense.value.toString());
                                expense_value += parseFloat(child_expense.value.toString());
                                total_expense_value[companyIndex].value += parseFloat(child_expense.value.toString());
                            }
                        });
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
                            text: formatter.format(expense_value),
                            bold: true,
                            alignment: "left",
                        },
                    ]);
                    expense_section.push({
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["*", "*"],
                            body: expense_table,
                        },
                        margin: [0, 0, 0, 15],
                    });
                }
            });
            const hpp_table = [];
            let hpp_value = 0;
            hpp_table.push([
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
            ]);
            let cogs_value = [];
            result[5].forEach((x) => {
                const name = x.f2;
                const value = parseFloat(x.f0);
                const company_id = x.f1;
                cogs_value.push({
                    id: company_id,
                    value: value,
                });
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
            const sales_appendix_table = [];
            sales_appendix_table.push([
                {
                    text: "Tanggal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Konsumen",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Dokumen",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
            ]);
            result[6].forEach((x) => {
                sales_appendix_table.push([
                    {
                        text: `${new Date(x.date).getDate()} ${_a.monthNames[new Date(x.date).getMonth()]}`,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.customer_name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(x.value),
                        bold: false,
                        alignment: "left",
                    },
                ]);
            });
            const purchase_appendix_table = [];
            purchase_appendix_table.push([
                {
                    text: "Tanggal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Supplier",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Dokumen",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
            ]);
            result[7].forEach((x) => {
                purchase_appendix_table.push([
                    {
                        text: `${new Date(x.date).getDate()} ${_a.monthNames[new Date(x.date).getMonth()]}`,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.supplier_name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.company_name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.purchase_invoice_name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: formatter.format(x.value),
                        bold: false,
                        alignment: "left",
                    },
                ]);
            });
            const expense_appendix_table = [];
            expense_appendix_table.push([
                {
                    text: "Tanggal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Perusahaan",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Tipe Pengeluaran",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Deskripsi",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Nominal",
                    bold: true,
                    alignment: "left",
                },
            ]);
            result[8].forEach((x) => {
                var _b;
                expense_appendix_table.push([
                    {
                        text: `${new Date(x.date).getDate()} ${_a.monthNames[new Date(x.date).getMonth()]}`,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.company.name,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: `${(_b = x.expense_type.expense_type) === null || _b === void 0 ? void 0 : _b.name} / ${x.expense_type.name}`,
                        bold: false,
                        alignment: "left",
                    },
                    {
                        text: x.description,
                    },
                    {
                        text: formatter.format(parseFloat(x.value.toString())),
                        bold: false,
                        alignment: "left",
                    },
                ]);
            });
            const summary_section = [
                {
                    text: "Laba / Rugi",
                    bold: true,
                    fontSize: 14,
                    alignment: "center",
                    margin: [0, 0, 0, 10],
                    pageBreak: "before",
                    tocItem: true,
                },
            ];
            result[3].forEach((x) => {
                summary_section.push({
                    text: x.name,
                    fontSize: 14,
                    bold: true,
                    alignment: "left",
                    margins: [0, 0, 0, 15],
                });
                const summary_table = [
                    [
                        {
                            text: "Keterangan",
                            bold: true,
                            fontSize: 12,
                        },
                        {
                            text: "Nominal",
                            bold: true,
                            fontSize: 12,
                        },
                        {
                            text: "Persentase",
                            bold: true,
                            fontSize: 12,
                        },
                    ],
                ];
                const sales_value_company_index = total_sales_value.findIndex((y) => y.id == x.id);
                let sales_value_company = 0;
                if (sales_value_company_index != -1) {
                    sales_value_company =
                        total_sales_value[sales_value_company_index].value;
                }
                const cogs_value_company_index = cogs_value.findIndex((y) => y.id == x.id);
                let cogs_value_company = 0;
                if (cogs_value_company_index != -1) {
                    cogs_value_company = cogs_value[cogs_value_company_index].value;
                }
                const expense_value_company_index = total_expense_value.findIndex((y) => y.id == x.id);
                let expense_value_company = 0;
                if (expense_value_company_index != -1) {
                    expense_value_company =
                        total_expense_value[expense_value_company_index].value;
                }
                summary_table.push([
                    {
                        text: "Laba kotor",
                        bold: true,
                        fontSize: 12,
                    },
                    {
                        text: formatter.format(sales_value_company - cogs_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                    {
                        text: sales_value_company == 0
                            ? "0.00%"
                            : percentage_formatter.format((sales_value_company - cogs_value_company) /
                                sales_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                ]);
                summary_table.push([
                    {
                        text: "Laba bersih",
                        bold: true,
                        fontSize: 12,
                    },
                    {
                        text: formatter.format(sales_value_company -
                            cogs_value_company -
                            expense_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                    {
                        text: percentage_formatter.format((sales_value_company -
                            cogs_value_company -
                            expense_value_company) /
                            sales_value_company),
                        bold: false,
                        fontSize: 12,
                    },
                ]);
                summary_section.push({
                    layout: "lightHorizontalLines",
                    table: {
                        headerRows: 1,
                        widths: ["*", "*", "*"],
                        body: summary_table,
                    },
                    margin: [0, 0, 0, 15],
                });
            });
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
                            : `${_a.monthNames[month - 1]} ${year}`,
                        bold: true,
                        fontSize: 16,
                        alignment: "center",
                        margin: [0, 0, 0, 20],
                    },
                    {
                        text: "Daftar isi",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                    },
                    {
                        toc: {
                            title: { text: "" },
                        },
                    },
                    {
                        text: "Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
                        pageBreak: "before",
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "*", "*", "*", "*"],
                            body: sales_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                        pageBreak: "after",
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Pembelian",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "*", "*", "*"],
                            body: purchase_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                        pageBreak: "after",
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Harga Pokok Penjualan",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 10],
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["*", "*"],
                            body: hpp_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
                        fontSize: 10,
                        color: "#333333",
                        margin: [0, 0, 0, 20],
                        pageBreak: "after",
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Pengeluaran",
                        bold: true,
                        fontSize: 14,
                        alignment: "center",
                        margin: [0, 0, 0, 15],
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    ...expense_section,
                    ...summary_section,
                    {
                        text: "Lampiran I",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 5],
                        pageBreak: "before",
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Rincian Penjualan",
                        bold: true,
                        fontSize: 10,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "auto", "*", "*"],
                            body: sales_appendix_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Lampiran II",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 5],
                        pageBreak: "before",
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Rincian Pembelian",
                        bold: true,
                        fontSize: 10,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "auto", "auto", "*", "*"],
                            body: purchase_appendix_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Lampiran III",
                        bold: true,
                        fontSize: 14,
                        alignment: "left",
                        margin: [0, 0, 0, 5],
                        pageBreak: "before",
                        tocItem: true,
                        pageOrientation: "landscape",
                    },
                    {
                        text: "Rincian Pengeluaran",
                        bold: true,
                        fontSize: 10,
                        alignment: "left",
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "auto", "auto", "*", "*"],
                            body: expense_appendix_table,
                        },
                        margin: [0, 0, 0, 15],
                        pageOrientation: "landscape",
                    },
                ],
                footer: (currentPage, pageCount) => {
                    return {
                        text: currentPage.toString() + " of " + pageCount,
                        alignment: "center",
                        bold: false,
                        fontSize: 8,
                    };
                },
                pageMargins: [20, 60, 20, 20],
            };
            const printer = new pdfmake_1.default(_a.fontDescriptors);
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
            return res.status(500).send(error);
        });
    }
};
ReportController.fetchQuickStats = (req, res) => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
        bill_code_model_1.default.fetchTodaySales(todayDate),
        bill_code_model_1.default.fetchTodaySales(yesterdayDate),
        purchase_invoice_model_1.default.fetchTodayPurchase(todayDate),
        purchase_invoice_model_1.default.fetchTodayPurchase(yesterdayDate),
        expense_model_1.default.fetchTodaySum(),
    ])
        .then((result) => {
        const response = {
            sales: result[0].length == 0
                ? {
                    value: 0,
                    discount: 0,
                    service: 0,
                    delivery: 0,
                }
                : {
                    value: result[0][0].value == null
                        ? 0
                        : parseFloat(result[0][0].value),
                    discount: result[0][0].discount == null
                        ? 0
                        : parseFloat(result[0][0].discount),
                    delivery: result[0][0].delivery == null
                        ? 0
                        : parseFloat(result[0][0].delivery),
                    service: result[0][0].service == null
                        ? 0
                        : parseFloat(result[0][0].service),
                },
            sales_prev: result[1].length == 0
                ? {
                    value: 0,
                    discount: 0,
                    service: 0,
                    delivery: 0,
                }
                : {
                    value: result[1][0].value == null
                        ? 0
                        : parseFloat(result[1][0].value),
                    discount: result[1][0].discount == null
                        ? 0
                        : parseFloat(result[1][0].discount),
                    delivery: result[1][0].delivery == null
                        ? 0
                        : parseFloat(result[1][0].delivery),
                    service: result[1][0].service == null
                        ? 0
                        : parseFloat(result[1][0].service),
                },
            purchase: {
                value: result[2][0].value == null
                    ? 0
                    : parseFloat(result[2][0].value),
                discount: result[2][0].discount == null
                    ? 0
                    : parseFloat(result[2][0].discount),
            },
            purchase_prev: {
                value: result[3][0].value == null
                    ? 0
                    : parseFloat(result[3][0].value),
                discount: result[3][0].discount == null
                    ? 0
                    : parseFloat(result[3][0].discount),
            },
            expense: result[4][0].value,
        };
        return res.status(200).send(response);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchPurchaseReportDownload = (req, res) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = parseInt(req.body.type.toString());
    const id = parseInt(req.body.id.toString());
    const password = req.body.password;
    const fontDescriptors = {
        Roboto: {
            normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
            bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
            italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
            bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
        },
    };
    purchase_invoice_model_1.default.fetchReportById(start, end, type, id)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
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
            // name = supplier?.name;
        }
        let documentDefinition = {
            pageSize: "A4",
            pageOrientation: "landscape",
            userPassword: password,
            permissions: {
                modifying: false,
                annotating: true,
                contentAccessibility: true,
                documentAssembly: true,
            },
            content: [
                {
                    text: "Laporan Pembelian",
                    bold: true,
                    fontSize: 20,
                    alignment: "center",
                    margin: [0, 0, 0, 5],
                },
                {
                    text: type == 0
                        ? `Merek ${name}`
                        : type == 1
                            ? `Tipe ${name}`
                            : `Supplier ${name}`,
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
    }))
        .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
    });
};
ReportController.fetchPurchaseItemDetail = (req, res) => {
    const format = req.body.format;
    const start = req.body.start;
    const end = req.body.end;
    const brand_id = req.body.brand_id;
    const type_id = req.body.type_id;
    if (format === "PDF") {
        Promise.all([
            item_model_1.ItemModel.fetchOutputByBrandType(brand_id, type_id, new Date(start), new Date(end)),
            brand_model_1.BrandModel.fetchByIds(brand_id),
            item_type_model_1.default.fetchByIds(type_id),
        ])
            .then((result) => {
            const fontDescriptors = {
                Roboto: {
                    normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                    bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                    italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                    bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                },
            };
            const printer = new pdfmake_1.default(fontDescriptors);
            const content = [];
            content.push({
                text: "Laporan Pengeluaran Barang",
                bold: true,
                fontSize: 20,
                font: "Roboto",
                alignment: "center",
                margin: [0, 0, 0, 15],
            });
            brand_id.forEach((brand) => {
                const brandData = result[1].findIndex((x) => x.id == brand);
                if (brandData != -1) {
                    content.push({
                        text: `Merek: ${result[1][brandData].name}`,
                        bold: true,
                        fontSize: 14,
                        font: "Roboto",
                        alignment: "center",
                    });
                    type_id.forEach((type) => {
                        const typeData = result[2].findIndex((x) => x.id == type);
                        if (typeData != -1) {
                            content.push({
                                text: `Tipe: ${result[2][typeData].name}`,
                                bold: true,
                                fontSize: 14,
                                font: "Roboto",
                                alignment: "left",
                                margin: [0, 0, 0, 5],
                            });
                            const items = result[0].filter((item) => item.item.item_brand_id == brand &&
                                item.item.item_type_id == type);
                            const itemTable = [];
                            itemTable.push([
                                {
                                    text: "Tanggal",
                                    bold: true,
                                    alignment: "center",
                                },
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
                                    text: "Jumlah",
                                    bold: true,
                                    alignment: "center",
                                },
                            ]);
                            if (items.length > 0) {
                                items.forEach((item) => {
                                    itemTable.push([
                                        {
                                            text: item.bill_code.date == null
                                                ? ""
                                                : Intl.DateTimeFormat("en-US").format(new Date(item.bill_code.date)),
                                            bold: false,
                                            alignment: "left",
                                        },
                                        {
                                            text: item.item.reference,
                                            bold: false,
                                            alignment: "left",
                                        },
                                        {
                                            text: item.item.description,
                                            bold: false,
                                            alignment: "left",
                                        },
                                        {
                                            text: `${Intl.NumberFormat().format(parseFloat(item.quantity.toString()) -
                                                parseFloat(item.sales_return
                                                    .reduce((partial, a) => partial + parseFloat(a.toString()), 0)
                                                    .toString()))} ${item.item_unit == null
                                                ? item.item.unit
                                                : item.item_unit.unit}`,
                                            bold: false,
                                            alignemnt: "left",
                                        },
                                    ]);
                                });
                            }
                            else {
                                itemTable.push([
                                    { text: "Barang tidak ditemukan.", colSpan: 4 },
                                    { text: "" },
                                    { text: "" },
                                    { text: "" },
                                ]);
                            }
                            content.push({
                                layout: "lightHorizontalLines",
                                table: {
                                    headerRows: 1,
                                    widths: ["auto", "auto", "*", "auto"],
                                    body: itemTable,
                                },
                                margin: [0, 0, 0, 15],
                                pageBreak: "after",
                            });
                        }
                    });
                }
            });
            let documentDefinition = {
                pageSize: "A4",
                content: content,
            };
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
            console.log(error);
            return res.status(500).send(error);
        });
    }
    else if (format === "Excel") {
        item_model_1.ItemModel.fetchInputByBrandType(brand_id, type_id, new Date(start), new Date(end))
            .then((result) => { })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(400).send("Format tidak ditemukan.");
    }
};
ReportController.fetchSalesItemReport = (req, res) => {
    const brand = req.body.brand;
    const type = req.body.type;
    const format = req.body.format;
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;
    item_model_1.ItemModel.fetchValueByBrandType(brand, type, month, year)
        .then((result) => {
        stock_card_helper_1.default.createStockReport(format, group, brand, type, result, function (buffer) {
            if (format == "xlsx") {
                return res.status(200).send({
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            }
            else if (format == "PDF") {
                return res.status(200).send({
                    data: `data:application/pdf;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            }
        }, function (error) {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchProductStockProblem = (req, res) => {
    const mode = req.body.mode;
    product_stock_model_1.default.fetchProblematic().then((result) => {
        if (mode == "excel") {
            const rows = [["No", "Referensi", "Deskripsi", "Stock"]];
            result.forEach((data, index) => {
                rows.push([
                    index + 1,
                    data.item.reference,
                    data.item.description,
                    parseFloat(data.stock.toString()),
                ]);
            });
            // Create an excel file
            const workbook = new exceljs_1.default.Workbook();
            workbook.creator = "Toko Profil Indah";
            workbook.created = new Date();
            workbook.modified = new Date();
            workbook.lastModifiedBy = "Toko Profil Indah";
            const sheet = workbook.addWorksheet("Stock bermasalah", {
                state: "visible",
                views: [
                    {
                        state: "frozen",
                        xSplit: 9,
                        ySplit: 1,
                    },
                ],
            });
            sheet.state = "visible";
            rows.forEach((data) => {
                sheet.addRow(data);
            });
            sheet.columns = [
                { header: "No", key: "no", width: 5 },
                { header: "Referensi", key: "reference", width: 20 },
                { header: "Deskripsi", key: "description", width: 50 },
                { header: "Stock", key: "stock", width: 10 },
            ];
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { horizontal: "center" };
            sheet.getRow(1).height = 20;
            workbook.xlsx
                .writeBuffer()
                .then((buffer) => {
                return res.status(200).send({
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
                });
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
        else {
            // Create PDF
            const content = [];
            content.push({
                text: "Laporan Stok Bermasalah",
                bold: true,
                fontSize: 16,
                font: "Roboto",
                alignment: "center",
                margin: [0, 0, 0, 15],
            });
            const table = [];
            table.push([
                {
                    text: "No",
                    bold: true,
                    alignment: "center",
                },
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
                    text: "Stock",
                    bold: true,
                    alignment: "center",
                },
            ]);
            if (result.length > 0) {
                result.forEach((item, index) => {
                    table.push([
                        {
                            text: index + 1,
                            bold: false,
                            alignment: "center",
                        },
                        {
                            text: item.item.reference,
                            bold: false,
                            alignment: "left",
                        },
                        {
                            text: item.item.description,
                            bold: false,
                            alignment: "left",
                        },
                        {
                            text: `${item.stock} ${item.item.unit}`,
                            bold: false,
                            alignment: "left",
                        },
                    ]);
                });
                content.push({
                    layout: "lightHorizontalLines",
                    table: {
                        headerRows: 1,
                        widths: ["auto", "auto", "*", "auto"],
                        body: table,
                    },
                    margin: [0, 0, 0, 15],
                    pageBreak: "after",
                });
                let documentDefinition = {
                    pageSize: "A4",
                    content: content,
                };
                const fontDescriptors = {
                    Roboto: {
                        normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                        bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                        italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                        bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                    },
                };
                const printer = new pdfmake_1.default(fontDescriptors);
                const pdfDocument = printer.createPdfKitDocument(documentDefinition);
                let chunks = [];
                pdfDocument.on("data", function (chunk) {
                    chunks.push(chunk);
                });
                pdfDocument.on("end", function () {
                    var doc = Buffer.concat(chunks);
                    return res.status(200).send({
                        data: `data:application/pdf;base64,${doc.toString("base64")}`,
                    });
                });
                pdfDocument.end();
            }
        }
    });
};
exports.default = ReportController;
