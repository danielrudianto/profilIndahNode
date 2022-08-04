import pdfPrinter from "pdfmake";
import { createWriteStream } from "fs";
import path from "path";

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
          bold: path.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
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

      const month = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      stockBody.push(["Tanggal", "Dokumen", "Lawan Transaksi", "Kuantitas", "Stock"]);

      stockItems.forEach((x) => {
        const date = x.date;
        const date_format = `${date.getDate()} ${month[date.getMonth()]} ${date.getFullYear()}`;
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

      pdfDocument.on('data', function (chunk) {
        chunks.push(chunk);
      });

      pdfDocument.on('end', function () {
        result = Buffer.concat(chunks);
        callback(`data:application/pdf;base64,${result.toString('base64')}`);
      });

      pdfDocument.end();
    } catch(error){
      errorCallback(error);
    }
  }

  static createCsv(data: any[], callback: Function, errorCallback: Function) {
    try {
      const stockItems = data as stockItem[];
      const stockBody = [];

      const month = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      stockBody.push(["Tanggal", "Dokumen", "Lawan Transaksi", "Kuantitas", "Stock"]);

      stockItems.forEach((x) => {
        const date = x.date;
        const date_format = `${date.getDate()} ${month[date.getMonth()]} ${date.getFullYear()}`;
        stockBody.push([date_format, x.name, x.op, x.quantity, x.stock]);
      });

      callback(stockBody);
    } catch(error){
      errorCallback(error);
    }
  }
}

export default StockCardHelper;
