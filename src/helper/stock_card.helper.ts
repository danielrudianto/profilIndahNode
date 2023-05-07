import pdfPrinter from "pdfmake";
import path from "path";
import {
  Alignment,
  Margins,
  PageOrientation,
  PageSize,
} from "pdfmake/interfaces";
import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";

interface stockItem {
  name: string;
  date: Date;
  opponent: string;
  quantity: number;
  stock: number;
}

class StockCardHelper {
  static fontDescriptors = {
    Cairo: {
      normal: path.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
      bold: path.join(__dirname, "..", "assets", "/fonts/Cairo-Medium.ttf"),
    },
    Roboto: {
      normal: path.join(__dirname, "..", "assets", "/fonts/Roboto-Regular.ttf"),
      bold: path.join(__dirname, "..", "assets", "/fonts/Roboto-Medium.ttf"),
      italics: path.join(__dirname, "..", "assets", "/fonts/Roboto-Italic.ttf"),
      bolditalics: path.join(
        __dirname,
        "..",
        "assets",
        "/fonts/Roboto-MediumItalic.ttf"
      ),
    },
  };

  static month = [
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

  static createPdf(
    item: any,
    data: any[],
    callback: Function,
    errorCallback: Function
  ) {
    try {
      const stockItems = data as stockItem[];
      const printer = new pdfPrinter(this.fontDescriptors);
      const stockBody: any[] = [];

      stockBody.push([
        {
          text: "Tanggal",
          style: "subheader",
        },
        {
          text: "Dokumen",
          style: "subheader",
        },
        {
          text: "Lawan Transaksi",
          style: "subheader",
        },
        {
          text: "Kuantitas",
          style: "subheader",
        },
        {
          text: "Stock",
          style: "subheader",
        },
      ]);

      stockItems.forEach((x) => {
        const date = x.date;
        const date_format = `${date.getDate()} ${
          this.month[date.getMonth()]
        } ${date.getFullYear()}`;
        stockBody.push([
          {
            text: date_format,
            style: "normal",
          },
          {
            text: x.name,
            style: "normal",
          },
          {
            text: x.opponent,
            style: "normal",
          },
          {
            text: x.quantity,
            style: "normal",
          },
          {
            text: x.stock,
            style: "normal",
          },
        ]);
      });
      const docDefinition = {
        content: [
          {
            text: item.reference,
            style: "header",
            margin: [0, 0, 0, 5] as Margins,
          },
          {
            text: item.description,
            style: "subheader",
            margin: [0, 0, 0, 20] as Margins,
          },
          {
            layout: "lightHorizontalLines", // optional
            table: {
              headerRows: 1,
              widths: ["auto", "*", "*", "auto", "auto"],
              body: stockBody,
            },
          },
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            font: "Cairo",
          },
          subheader: {
            fontSize: 15,
            bold: true,
            font: "Cairo",
          },
          normal: {
            fontSize: 12,
            font: "Cairo",
          },
          quote: {
            italics: true,
          },
          small: {
            fontSize: 8,
          },
        },
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
          this.month[date.getMonth()]
        } ${date.getFullYear()}`;
        stockBody.push([date_format, x.name, x.opponent, x.quantity, x.stock]);
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

      const printer = new pdfPrinter(this.fontDescriptors);
      const itemBody: any[] = [];

      itemBody.push([
        {
          text: "Reference",
          font: "Cairo",
        },
        {
          text: "Description",
          font: "Cairo",
        },
        {
          text: "Min. stock",
          font: "Cairo",
        },
        {
          text: "Unit",
          font: "Cairo",
        },
        {
          text: "Stock",
          font: "Cairo",
        },
      ]);

      items.forEach((x) => {
        itemBody.push([
          {
            text: x.reference,
            font: "Cairo",
          },
          {
            text: x.description,
            font: "Cairo",
          },
          {
            text: Intl.NumberFormat().format(x.minimum_stock),
            font: "Cairo",
          },
          {
            text: x.unit,
            font: "Cairo",
          },
          {
            text: Intl.NumberFormat().format(x.stock),
            font: "Cairo",
          },
        ]);
      });

      const docDefinition = {
        content: [
          {
            text: "Inadequate Item Report",
            bold: true,
            fontSize: 24,
            margin: [0, 0, 0, 20] as Margins,
            alignment: "left" as Alignment,
            font: "Cairo",
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

  static createStockReport(
    format: string,
    group: string,
    brand: number[],
    type: number[],
    result: any[],
    callback: Function,
    errorCallback: Function
  ) {
    if (format == "xlsx") {
      const headerRows = [
        "Referensi",
        "Deskripsi",
        "Merek",
        "Tipe barang",
        "Stock awal",
        "Jumlah keluar",
        "Jumlah masuk",
        "Stock akhir",
        "Satuan",
      ];
      const workbook = new ExcelJS.Workbook();
      // Setting up workbook properties
      workbook.creator = "Toko Profil Indah";
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastModifiedBy = "Toko Profil Indah";
      workbook.lastPrinted = new Date();
      workbook.properties.date1904 = true;

      if (group == "brand") {
        brand.forEach((itemBrand) => {
          const resultItemBrand = (result[3] as any[]).findIndex(
            (x) => x.id == itemBrand
          );
          const sheet = workbook.addWorksheet(
            resultItemBrand != -1
              ? result[3][resultItemBrand].name
              : `Brand - ${itemBrand}`
          );
          const rows: any[] = [headerRows];
          const items = (result[0] as any[]).filter(
            (x) => x.item_brand_id == itemBrand
          );
          items.forEach((item) => {
            const itemID = item.id;
            const reference = item.reference;
            const description = item.description;
            const brand = item.item_brand_name;
            const type = item.item_type_name;
            const unit = item.unit;
            const initialQuantityIndex = (result[2] as any[]).findIndex(
              (x) => x.id == itemID
            );
            const initial_quantity =
              initialQuantityIndex != -1
                ? parseFloat(result[2][initialQuantityIndex].quantity)
                : 0;

            const totalInOutIndex = (result[1] as any[]).findIndex(
              (x) => x.id == item.id
            );

            const quantityIn =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].positiveQuantity)
                : 0;

            const quantityOut =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].negativeQuantity)
                : 0;

            const finalQuantity = initial_quantity + quantityIn + quantityOut;

            rows.push([
              reference,
              description,
              brand,
              type,
              initial_quantity,
              quantityOut,
              quantityIn,
              finalQuantity,
              unit,
            ]);
          });

          rows.forEach((x) => {
            sheet.addRow(x);
          });
        });
      } else if (group == "type") {
        type.forEach((itemType) => {
          const resultItemType = (result[4] as any[]).findIndex(
            (x) => x.id == itemType
          );
          const sheet = workbook.addWorksheet(
            resultItemType != -1
              ? result[4][resultItemType].name
              : `Type - ${itemType}`
          );
          const rows: any[] = [headerRows];
          const items = (result[0] as any[]).filter(
            (x) => x.item_type_id == itemType
          );
          items.forEach((item) => {
            const itemID = item.id;
            const reference = item.reference;
            const description = item.description;
            const brand = item.item_brand_name;
            const type = item.item_type_name;
            const unit = item.unit;
            const initialQuantityIndex = (result[2] as any[]).findIndex(
              (x) => x.id == itemID
            );
            const initial_quantity =
              initialQuantityIndex != -1
                ? parseFloat(result[2][initialQuantityIndex].quantity)
                : 0;

            const totalInOutIndex = (result[1] as any[]).findIndex(
              (x) => x.id == itemID
            );

            const quantityIn =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].positiveQuantity)
                : 0;

            const quantityOut =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].negativeQuantity)
                : 0;

            const finalQuantity = initial_quantity + quantityIn - quantityOut;

            rows.push([
              reference,
              description,
              brand,
              type,
              initial_quantity,
              quantityOut,
              quantityIn,
              finalQuantity,
              unit,
            ]);
          });

          rows.forEach((x) => {
            sheet.addRow(x);
          });
        });
      }

      workbook.xlsx
        .writeBuffer()
        .then((buffer) => {
          callback(buffer);
        })
        .catch((error) => {
          errorCallback(error);
        });
    } else if (format == "PDF") {
      const tableHeader = [
        {
          text: "Referensi",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Deskripsi",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Merek",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Tipe barang",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Stock awal",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Jumlah keluar",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Jumlah masuk",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Stock akhir",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
        {
          text: "Satuan",
          bold: true,
          font: "Cairo",
          alignment: "left" as Alignment,
        },
      ];
      const content: any[] = [];
      if (group == "brand") {
        brand.forEach((itemBrand) => {
          const report_table: any[] = [];
          report_table.push(tableHeader);

          const resultItemBrand = (result[3] as any[]).findIndex(
            (x) => x.id == itemBrand
          );

          const items = (result[0] as any[]).filter(
            (x) => x.item_brand_id == brand
          );

          content.push({
            text: `Merek: ${result[3][resultItemBrand].name}`,
            margin: [0, 20, 0, 10] as Margins,
          });

          items.forEach((item) => {
            const itemID = item.id;
            const reference = item.reference;
            const description = item.description;
            const brand = item.item_brand_name;
            const type = item.item_type_name;
            const unit = item.unit;
            const initialQuantityIndex = (result[2] as any[]).findIndex(
              (x) => x.id == itemID
            );
            const initial_quantity =
              initialQuantityIndex != -1
                ? parseFloat(result[2][initialQuantityIndex].quantity)
                : 0;

            const totalInOutIndex = (result[1] as any[]).findIndex(
              (x) => x.id == itemID
            );

            const quantityIn =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].positiveQuantity)
                : 0;

            const quantityOut =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].negativeQuantity)
                : 0;

            const finalQuantity = initial_quantity + quantityIn + quantityOut;
            report_table.push([
              {
                text: reference,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: description,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: brand,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: type,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(initial_quantity),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(quantityOut),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(quantityIn),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(finalQuantity),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: unit,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
            ]);
          });

          content.push({
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
            pageBreak: "after",
          });
        });
      } else if (group == "type") {
        type.forEach((itemType) => {
          const report_table: any[] = [];
          report_table.push(tableHeader);

          const resultItemType = (result[4] as any[]).findIndex(
            (x) => x.id == itemType
          );

          const items = (result[0] as any[]).filter(
            (x) => x.item_type_id == itemType
          );

          content.push({
            text: `Tipe: ${result[4][resultItemType].name}`,
            margin: [0, 20, 0, 10] as Margins,
          });

          items.forEach((item) => {
            const itemID = item.id;
            const reference = item.reference;
            const description = item.description;
            const brand = item.item_brand_name;
            const type = item.item_type_name;
            const unit = item.unit;
            const initialQuantityIndex = (result[2] as any[]).findIndex(
              (x) => x.id == itemID
            );
            const initial_quantity =
              initialQuantityIndex != -1
                ? parseFloat(result[2][initialQuantityIndex].quantity)
                : 0;

            const totalInOutIndex = (result[1] as any[]).findIndex(
              (x) => x.id == itemID
            );

            const quantityIn =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].positiveQuantity)
                : 0;

            const quantityOut =
              totalInOutIndex != -1
                ? parseFloat(result[1][totalInOutIndex].negativeQuantity)
                : 0;

            const finalQuantity = initial_quantity + quantityIn + quantityOut;
            report_table.push([
              {
                text: reference,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: description,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: brand,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: type,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(initial_quantity),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(quantityOut),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(quantityIn),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: Intl.NumberFormat().format(finalQuantity),
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
              {
                text: unit,
                bold: true,
                font: "Cairo",
                alignment: "left" as Alignment,
              },
            ]);
          });

          content.push({
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
            pageBreak: "after",
          });
        });
      }

      let documentDefinition = {
        pageSize: "A4" as PageSize,
        pageOrientation: "landscape" as PageOrientation,
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
            font: "Cairo",
            fontSize: 20,
            alignment: "center" as Alignment,
            margin: [0, 0, 0, 5] as Margins,
          },
          ...content,
        ],
      };

      const printer = new PdfPrinter(this.fontDescriptors);
      const pdfDocument = printer.createPdfKitDocument(documentDefinition);

      let chunks: any[] = [];
      var pdfResult;

      pdfDocument.on("data", function (chunk: any) {
        chunks.push(chunk);
      });

      pdfDocument.on("end", function () {
        pdfResult = Buffer.concat(chunks);
        callback(pdfResult);
      });

      pdfDocument.end();
    }
  }
}

export default StockCardHelper;
