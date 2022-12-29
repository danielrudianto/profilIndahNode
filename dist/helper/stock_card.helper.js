"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pdfmake_1 = __importDefault(require("pdfmake"));
const path_1 = __importDefault(require("path"));
class StockCardHelper {
    static createPdf(data, callback, errorCallback) {
        try {
            const stockItems = data;
            const fontDescriptors = {
                Roboto: {
                    normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                    bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                    italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                    bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                },
            };
            const printer = new pdfmake_1.default(fontDescriptors);
            const stockBody = [];
            const month = [
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
            stockBody.push([
                "Tanggal",
                "Dokumen",
                "Lawan Transaksi",
                "Kuantitas",
                "Stock",
            ]);
            stockItems.forEach((x) => {
                const date = x.date;
                const date_format = `${date.getDate()} ${month[date.getMonth()]} ${date.getFullYear()}`;
                stockBody.push([date_format, x.name, x.op, x.quantity, x.stock]);
            });
            const docDefinition = {
                content: [
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["auto", "*", "*", "auto", "auto"],
                            body: stockBody,
                        },
                    },
                ],
            };
            const pdfDocument = printer.createPdfKitDocument(docDefinition);
            let chunks = [];
            var result;
            pdfDocument.on("data", function (chunk) {
                chunks.push(chunk);
            });
            pdfDocument.on("end", function () {
                result = Buffer.concat(chunks);
                callback(`data:application/pdf;base64,${result.toString("base64")}`);
            });
            pdfDocument.end();
        }
        catch (error) {
            errorCallback(error);
        }
    }
    static createCsv(data, callback, errorCallback) {
        try {
            const stockItems = data;
            const stockBody = [];
            const month = [
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
            stockBody.push([
                "Tanggal",
                "Dokumen",
                "Lawan Transaksi",
                "Kuantitas",
                "Stock",
            ]);
            stockItems.forEach((x) => {
                const date = x.date;
                const date_format = `${date.getDate()} ${month[date.getMonth()]} ${date.getFullYear()}`;
                stockBody.push([date_format, x.name, x.op, x.quantity, x.stock]);
            });
            callback(stockBody);
        }
        catch (error) {
            errorCallback(error);
        }
    }
    static createInsufficientPdf(data, callback, errorCallback) {
        try {
            const items = data;
            const fontDescriptors = {
                Roboto: {
                    normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
                    bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
                    italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
                    bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Roboto-MediumItalic.ttf"),
                },
            };
            const printer = new pdfmake_1.default(fontDescriptors);
            const itemBody = [];
            itemBody.push([
                "Referensi",
                "Deskripsi",
                "Minimum stock",
                "Satuan",
                "Stock",
            ]);
            items.forEach((x) => {
                itemBody.push([
                    x.reference,
                    x.description,
                    Intl.NumberFormat().format(x.minimum_stock),
                    x.unit,
                    !x.stock || x.stock == null
                        ? "0"
                        : Intl.NumberFormat().format(x.stock.stock),
                ]);
            });
            const docDefinition = {
                content: [
                    {
                        text: "Laporan Barang Kurang",
                        bold: true,
                        fontSize: 24,
                        margin: [0, 0, 0, 20],
                        alignment: "center",
                    },
                    {
                        layout: "lightHorizontalLines",
                        table: {
                            headerRows: 1,
                            widths: ["*", "auto", "*", "*", "*"],
                            body: itemBody,
                        },
                    },
                ],
            };
            const pdfDocument = printer.createPdfKitDocument(docDefinition);
            let chunks = [];
            var result;
            pdfDocument.on("data", function (chunk) {
                chunks.push(chunk);
            });
            pdfDocument.on("end", function () {
                result = Buffer.concat(chunks);
                callback(`data:application/pdf;base64,${result.toString("base64")}`);
            });
            pdfDocument.end();
        }
        catch (error) {
            errorCallback(error);
        }
    }
}
exports.default = StockCardHelper;
