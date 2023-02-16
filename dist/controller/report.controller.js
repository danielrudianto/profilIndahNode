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
const exceljs_1 = __importDefault(require("exceljs"));
const stock_value_helper_1 = __importDefault(require("../helper/stock_value.helper"));
const brand_model_1 = require("../model/brand.model");
const item_type_model_1 = __importDefault(require("../model/item_type.model"));
const supplier_model_1 = __importDefault(require("../model/supplier.model"));
const item_model_1 = require("../model/item.model");
const company_model_1 = __importDefault(require("../model/company.model"));
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
                            : `${month_name[month - 1]} ${year}`,
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
                header: (currentPage, pageCount) => {
                    return currentPage == 1
                        ? []
                        : [
                            {
                                image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADOQAAAEtCAYAAAAS3V6CAAAACXBIWXMAAC4jAAAuIwF4pT92AAAHUGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTAxLTA5VDIzOjI0OjQzKzA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAxLTA5VDIzOjI0OjQzKzA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0wMS0wOVQyMzoyNDo0MyswNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmODk0ZjIzYS1lZTY5LWQ5NDctYTQwMi1kNmYyYWViMDg2N2IiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozZWYyZTI4OC01NDBlLTUyNGEtYjVmMC1hNzBiNmQ0YmNiZTYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo5MjgxZGUxOS03NDkyLTg2NGItYTI3My0wYTg5NWNmMjg3YmIiIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjkyODFkZTE5LTc0OTItODY0Yi1hMjczLTBhODk1Y2YyODdiYiIgc3RFdnQ6d2hlbj0iMjAyMy0wMS0wOVQyMzoyNDo0MyswNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmODk0ZjIzYS1lZTY5LWQ5NDctYTQwMi1kNmYyYWViMDg2N2IiIHN0RXZ0OndoZW49IjIwMjMtMDEtMDlUMjM6MjQ6NDMrMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPHBob3Rvc2hvcDpUZXh0TGF5ZXJzPiA8cmRmOkJhZz4gPHJkZjpsaSBwaG90b3Nob3A6TGF5ZXJOYW1lPSJQcm9maWwgSW5kYWggTWFuYWdlbWVudCBTeXN0ZW0iIHBob3Rvc2hvcDpMYXllclRleHQ9IlByb2ZpbCBJbmRhaCBNYW5hZ2VtZW50IFN5c3RlbSIvPiA8L3JkZjpCYWc+IDwvcGhvdG9zaG9wOlRleHRMYXllcnM+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPmFkb2JlOmRvY2lkOnBob3Rvc2hvcDoxYzc3ZDIzYS04MTZhLTEw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AAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADP8/+NFqUkKiKZrAAAAAElFTkSuQmCC",
                                width: 842,
                            },
                        ];
                },
                pageMargins: [20, 60, 20, 20],
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
            console.log(error);
            log_helper_1.default.log(new Date(), "error", error, "Report controller - Fetch Profit Loss", req.body.userId);
            return res.status(500).send(error);
        });
    }
    else {
        Promise.all([
            bill_code_model_1.default.fetchSum(month, year),
            sales_distribution_model_1.default.fetchSum(month, year),
            purchase_document_model_1.default.fetchSum(month, year),
            company_model_1.default.fetchAll(),
            expense_model_1.default.fetchSum(month, year),
            month == 0
                ? stock_value_helper_1.default.fetchCOGS(new Date(year - 1, 11, 31), new Date(year, 11, 31))
                : stock_value_helper_1.default.fetchCOGS(new Date(year, month - 1, 0), new Date(year, month, 0)),
            bill_code_model_1.default.fetchAppendix(month, year),
            purchase_document_model_1.default.fetchAppendix(month, year),
            expense_model_1.default.fetchAppendix(month, year),
            // SalesReturnModel.fetchAppendix(month, year),
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
                        text: `${new Date(x.date).getDate()} ${month_name[new Date(x.date).getMonth()]}`,
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
                        text: `${new Date(x.date).getDate()} ${month_name[new Date(x.date).getMonth()]}`,
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
                        text: `${new Date(x.date).getDate()} ${month_name[new Date(x.date).getMonth()]}`,
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
                            : `${month_name[month - 1]} ${year}`,
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
                header: (currentPage, pageCount) => {
                    return currentPage == 1
                        ? []
                        : [
                            {
                                image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAADOQAAAEtCAYAAAAS3V6CAAAACXBIWXMAAC4jAAAuIwF4pT92AAAHUGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTAxLTA5VDIzOjI0OjQzKzA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDIzLTAxLTA5VDIzOjI0OjQzKzA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMy0wMS0wOVQyMzoyNDo0MyswNzowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmODk0ZjIzYS1lZTY5LWQ5NDctYTQwMi1kNmYyYWViMDg2N2IiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDozZWYyZTI4OC01NDBlLTUyNGEtYjVmMC1hNzBiNmQ0YmNiZTYiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo5MjgxZGUxOS03NDkyLTg2NGItYTI3My0wYTg5NWNmMjg3YmIiIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjkyODFkZTE5LTc0OTItODY0Yi1hMjczLTBhODk1Y2YyODdiYiIgc3RFdnQ6d2hlbj0iMjAyMy0wMS0wOVQyMzoyNDo0MyswNzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmODk0ZjIzYS1lZTY5LWQ5NDctYTQwMi1kNmYyYWViMDg2N2IiIHN0RXZ0OndoZW49IjIwMjMtMDEtMDlUMjM6MjQ6NDMrMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPHBob3Rvc2hvcDpUZXh0TGF5ZXJzPiA8cmRmOkJhZz4gPHJkZjpsaSBwaG90b3Nob3A6TGF5ZXJOYW1lPSJQcm9maWwgSW5kYWggTWFuYWdlbWVudCBTeXN0ZW0iIHBob3Rvc2hvcDpMYXllclRleHQ9IlByb2ZpbCBJbmRhaCBNYW5hZ2VtZW50IFN5c3RlbSIvPiA8L3JkZjpCYWc+IDwvcGhvdG9zaG9wOlRleHRMYXllcnM+IDxwaG90b3Nob3A6RG9jdW1lbnRBbmNlc3RvcnM+IDxyZGY6QmFnPiA8cmRmOmxpPmFkb2JlOmRvY2lkOnBob3Rvc2hvcDoxYzc3ZDIzYS04MTZhLTEw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AAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADOQkAMAAAAAAAAAAAAAAAAAAAAAAADMQEIOAAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAMAMJOQAAAAAAAAAAAAAAAAAAAAAAAAAM5CQAwAAAAAAAAAAAAAAAAAAAAAAAMxAQg4AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAwAwk5AAAAAAAAAAAAAAAAAAAAAAAAAAzkJADAAAAAAAAAAAAAAAAAAAAAAAAzEBCDgAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAADADCTkAAAAAAAAAAAAAAAAAAAAAAAAADP8/+NFqUkKiKZrAAAAAElFTkSuQmCC",
                                width: 842,
                            },
                        ];
                },
                pageMargins: [20, 60, 20, 20],
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
            return res.status(200).send(result.filter((x) => {
                return parseFloat(x.value.toString()) > 0;
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (type == 1) {
        // Fetch by type
        item_type_model_1.default.fetchSales(start, end)
            .then((result) => {
            return res.status(200).send({
                data: result.filter((x) => {
                    return parseFloat(x.value.toString()) > 0;
                }),
            });
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
    purchase_document_model_1.default.fetchReport(start, end, type)
        .then((result) => {
        return res.status(200).send(result.filter((x) => {
            return parseFloat(x.value.toString()) > 0;
        }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ReportController.fetchFrequent = (req, res) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const brand_id = req.body.brand_id;
    const type_id = req.body.type_id;
    const limit = req.body.limit;
    if (req.body.brand_id != undefined && brand_id != null) {
        brand_model_1.BrandModel.fetchFrequent(parseInt(brand_id.toString()), start, end, limit)
            .then((result) => {
            return res.status(200).send(result.map((x) => {
                return Object.assign(Object.assign({}, x), { ordered: undefined, quantity: x.ordered });
            }));
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.body.type_id != undefined && type_id != null) {
        item_type_model_1.default.fetchFrequent(parseInt(type_id.toString()), start, end, limit)
            .then((result) => {
            return res.status(200).send(result.map((x) => {
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
        purchase_document_model_1.default.fetchTodayPurchase(todayDate),
        purchase_document_model_1.default.fetchTodayPurchase(yesterdayDate),
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
    purchase_document_model_1.default.fetchReportById(start, end, type, id)
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
            name = supplier === null || supplier === void 0 ? void 0 : supplier.name;
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
ReportController.fetchInventoryReport = (req, res) => {
    const brand = req.body.brand;
    const type = req.body.type;
    const format = req.body.format;
    const month = req.body.month;
    const year = req.body.year;
    item_model_1.ItemModel.fetchValueByBrandType(brand, type, month, year)
        .then((result) => {
        if (format == "xlsx") {
            const rows = [
                [
                    "Referensi",
                    "Deskripsi",
                    "Merek",
                    "Tipe barang",
                    "Stock awal",
                    "Jumlah keluar",
                    "Jumlah masuk",
                    "Stock akhir",
                    "Satuan",
                ],
            ];
            result[0].forEach((item) => {
                var _b;
                const reference = item.reference;
                const description = item.description;
                const brand = item.item_brand.name;
                const type = (_b = item.item_type) === null || _b === void 0 ? void 0 : _b.name;
                const unit = item.unit;
                const quantityIndex = result[1].findIndex((x) => x.item_id == item.id);
                const quantity = quantityIndex == -1
                    ? 0
                    : result[1][quantityIndex]._sum == null ||
                        result[1][quantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[1][quantityIndex]._sum.quantity.toString());
                const quantityInIndex = result[2].findIndex((x) => x.item_id == item.id);
                const quantityIn = quantityInIndex == -1
                    ? 0
                    : result[2][quantityInIndex]._sum == null ||
                        result[2][quantityInIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[2][quantityInIndex]._sum.quantity.toString());
                const initialQuantityIndex = result[3].findIndex((x) => x.item_id == item.id);
                const initial_quantity = initialQuantityIndex == -1
                    ? 0
                    : result[3][initialQuantityIndex]._sum == null ||
                        result[3][initialQuantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[3][initialQuantityIndex]._sum.quantity.toString());
                const finalQuantityIndex = result[3].findIndex((x) => x.item_id == item.id);
                const final_quantity = finalQuantityIndex == -1
                    ? 0
                    : result[4][finalQuantityIndex]._sum == null ||
                        result[4][finalQuantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[4][finalQuantityIndex]._sum.quantity.toString());
                rows.push([
                    reference,
                    description,
                    brand,
                    type,
                    initial_quantity,
                    quantity == 0 ? 0 : quantity * -1,
                    quantityIn,
                    final_quantity,
                    unit,
                ]);
            });
            const workbook = new exceljs_1.default.Workbook();
            // Setting up workbook properties
            workbook.creator = "Toko Profil Indah";
            workbook.created = new Date();
            const sheet = workbook.addWorksheet("Laporan pengeluaran barang");
            rows.forEach((x) => {
                sheet.addRow(x);
            });
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
            const fontDescriptors = {
                Roboto: {
                    normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                    bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                    italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                    bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                },
            };
            const report_table = [];
            report_table.push([
                {
                    text: "Referensi",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Deskripsi",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Merek",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Tipe barang",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Stock awal",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Jumlah keluar",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Jumlah masuk",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Stock akhir",
                    bold: true,
                    alignment: "left",
                },
                {
                    text: "Satuan",
                    bold: true,
                    alignment: "left",
                },
            ]);
            result[0].forEach((item) => {
                var _b;
                const reference = item.reference;
                const description = item.description;
                const brand = item.item_brand.name;
                const type = (_b = item.item_type) === null || _b === void 0 ? void 0 : _b.name;
                const unit = item.unit;
                const quantityIndex = result[1].findIndex((x) => x.item_id == item.id);
                const quantity = quantityIndex == -1
                    ? 0
                    : result[1][quantityIndex]._sum == null ||
                        result[1][quantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[1][quantityIndex]._sum.quantity.toString());
                const quantityInIndex = result[2].findIndex((x) => x.item_id == item.id);
                const quantityIn = quantityInIndex == -1
                    ? 0
                    : result[2][quantityInIndex]._sum == null ||
                        result[2][quantityInIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[2][quantityInIndex]._sum.quantity.toString());
                const initialQuantityIndex = result[2].findIndex((x) => x.item_id == item.id);
                const initial_quantity = initialQuantityIndex == -1
                    ? 0
                    : result[3][initialQuantityIndex]._sum == null ||
                        result[3][initialQuantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[3][initialQuantityIndex]._sum.quantity.toString());
                const finalQuantityIndex = result[4].findIndex((x) => x.item_id == item.id);
                const final_quantity = finalQuantityIndex == -1
                    ? 0
                    : result[4][finalQuantityIndex]._sum == null ||
                        result[4][finalQuantityIndex]._sum.quantity == null
                        ? 0
                        : parseFloat(result[4][finalQuantityIndex]._sum.quantity.toString());
                report_table.push([
                    {
                        text: reference,
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: description,
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: brand,
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: type,
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: Intl.NumberFormat().format(initial_quantity),
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: Intl.NumberFormat().format(quantity == 0 ? 0 : quantity * -1),
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: Intl.NumberFormat().format(quantityIn == 0 ? 0 : quantityIn),
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: Intl.NumberFormat().format(final_quantity),
                        bold: true,
                        alignment: "left",
                    },
                    {
                        text: unit,
                        bold: true,
                        alignment: "left",
                    },
                ]);
            });
            let documentDefinition = {
                pageSize: "A4",
                pageOrientation: "landscape",
                permissions: {
                    modifying: false,
                    annotating: true,
                    contentAccessibility: true,
                    documentAssembly: true,
                },
                content: [
                    {
                        text: "Laporan Transaksi",
                        bold: true,
                        fontSize: 20,
                        alignment: "center",
                        margin: [0, 0, 0, 5],
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: [
                                "auto",
                                "auto",
                                "auto",
                                "auto",
                                "*",
                                "*",
                                "*",
                                "*",
                                "auto",
                            ],
                            body: report_table,
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
        }
    })
        .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
    });
};
exports.default = ReportController;
