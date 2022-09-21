import pdfPrinter from "pdfmake";
import path from "path";
import { Alignment, Margins } from "pdfmake/interfaces";

interface stockItem {
  name: string;
  date: Date;
  op: string;
  quantity: number;
  stock: number;
}

class StockCardHelper {
  static createPdf(data: any[], callback: Function, errorCallback: Function) {
    try {
      const stockItems = data as stockItem[];
      const fontDescriptors = {
        Roboto: {
          normal: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Regular.ttf"
          ),
          bold: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Medium.ttf"
          ),
          italics: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Italic.ttf"
          ),
          bolditalics: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-MediumItalic.ttf"
          ),
        },
      };
      const printer = new pdfPrinter(fontDescriptors);
      const stockBody: any[] = [];

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
        const date_format = `${date.getDate()} ${
          month[date.getMonth()]
        } ${date.getFullYear()}`;
        stockBody.push([date_format, x.name, x.op, x.quantity, x.stock]);
      });
      const docDefinition = {
        content: [
          {
            layout: "lightHorizontalLines", // optional
            table: {
              headerRows: 1,
              widths: ["auto", "*", "*", "auto", "auto"],
              body: stockBody,
            },
          },
        ],
      };

      const pdfDocument = printer.createPdfKitDocument(docDefinition);

      let chunks: any[] = [];
      var result;

      pdfDocument.on("data", function (chunk) {
        chunks.push(chunk);
      });

      pdfDocument.on("end", function () {
        result = Buffer.concat(chunks);
        callback(`data:application/pdf;base64,${result.toString("base64")}`);
      });

      pdfDocument.end();
    } catch (error) {
      errorCallback(error);
    }
  }

  static createCsv(data: any[], callback: Function, errorCallback: Function) {
    try {
      const stockItems = data as stockItem[];
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
        const date_format = `${date.getDate()} ${
          month[date.getMonth()]
        } ${date.getFullYear()}`;
        stockBody.push([date_format, x.name, x.op, x.quantity, x.stock]);
      });

      callback(stockBody);
    } catch (error) {
      errorCallback(error);
    }
  }

  static createInsufficientPdf(
    data: any[],
    callback: Function,
    errorCallback: Function
  ) {
    try {
      const items = data as any[];
      const fontDescriptors = {
        Roboto: {
          normal: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Regular.ttf"
          ),
          bold: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Medium.ttf"
          ),
          italics: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-Italic.ttf"
          ),
          bolditalics: path.join(
            __dirname,
            "..",
            "assets",
            "/fonts/Roboto-MediumItalic.ttf"
          ),
        },
      };
      const printer = new pdfPrinter(fontDescriptors);
      const itemBody: any[] = [];

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
            margin: [0, 0, 0, 20] as Margins,
            alignment: "center" as Alignment,
          },
          {
            layout: "lightHorizontalLines", // optional
            table: {
              headerRows: 1,
              widths: ["*", "auto", "*", "*", "*"],
              body: itemBody,
            },
          },
        ],
      };

      const pdfDocument = printer.createPdfKitDocument(docDefinition);

      let chunks: any[] = [];
      var result;

      pdfDocument.on("data", function (chunk) {
        chunks.push(chunk);
      });

      pdfDocument.on("end", function () {
        result = Buffer.concat(chunks);
        callback(`data:application/pdf;base64,${result.toString("base64")}`);
      });

      pdfDocument.end();
    } catch (error) {
      errorCallback(error);
    }
  }
}

export default StockCardHelper;
