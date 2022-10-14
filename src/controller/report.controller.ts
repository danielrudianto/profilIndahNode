import { Request, Response } from "express";
import PdfPrinter from "pdfmake";
import LogHelper from "../helper/log.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import ExpenseModel from "../model/expense.model";
import { ItemModel } from "../model/item.model";
import PurchaseDocumentModel from "../model/purchase_document.model";
import SalesDistributionModel from "../model/sales_distribution.model";
import path from "path";
import { Alignment, Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import StockValueHelper from "../helper/stock_value.helper";
import { BrandModel } from "../model/brand.model";
import ItemTypeModel from "../model/item_type.model";
import SupplierModel from "../model/supplier.model";

var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IDR",
});

class ReportController {
  static fetchPLStats = (req: Request, res: Response) => {
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

    if (report == 0) {
      Promise.all([
        BillCodeModel.fetchSum(month, year),
        SalesDistributionModel.fetchSum(month, year),
        PurchaseDocumentModel.fetchSum(month, year),
        ExpenseModel.fetchSum(month, year),
        month == 0
          ? StockValueHelper.fetchCOGS(new Date(year, 11, 31))
          : StockValueHelper.fetchCOGS(new Date(year, month, 0)),
      ])
        .then((result) => {
          const sales_table = [];

          // Sales table
          sales_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Pengiriman Barang",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "center" as Alignment,
            },
          ]);

          let total_value = 0;
          let total_delivery_value = parseFloat(
            (result[0] as any[])[0].delivery.toString()
          );

          (result[1] as any[]).forEach((x) => {
            total_value += parseFloat(x.value.toString());
            sales_table.push([
              {
                text: x.name,
                bold: false,
                alignment: "left" as Alignment,
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
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(total_value),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "-",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(total_value),
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          sales_table.push([
            {
              text: "Penjualan tidak teralokasi",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                parseFloat((result[0] as any[])[0].value.toString()) -
                  parseFloat((result[0] as any[])[0].discount.toString()) -
                  total_value
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "-",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                parseFloat((result[0] as any[])[0].value.toString()) -
                  parseFloat((result[0] as any[])[0].discount.toString()) -
                  total_value
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          sales_table.push([
            {
              text: "Keseluruhan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                parseFloat((result[0] as any[])[0].value.toString()) -
                  parseFloat((result[0] as any[])[0].discount.toString())
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                parseFloat((result[0] as any[])[0].delivery.toString())
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                parseFloat((result[0] as any[])[0].value.toString()) +
                  parseFloat((result[0] as any[])[0].discount.toString()) +
                  parseFloat((result[0] as any[])[0].delivery.toString())
              ),
              bold: true,
              aligment: "left" as Alignment,
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
              alignment: "center" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Potongan Harga",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "center" as Alignment,
            },
          ]);

          (result[2] as any[]).forEach((x) => {
            purchase_table.push([
              {
                text: `${x.name}`,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.discount.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(
                  parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString())
                ),
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);

            total_purchase_value += parseFloat(x.value.toString());
            total_purchase_discount += parseFloat(x.discount.toString());
          });

          purchase_table.push([
            {
              text: "Keseluruhan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(total_purchase_value),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(total_purchase_discount),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                total_purchase_value - total_purchase_discount
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          const expenses: any[] = [];
          const expense_table = [];
          let total_expense_value = 0;

          expense_table.push([
            {
              text: "Tipe",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "center" as Alignment,
            },
          ]);

          (result[3] as any[])
            .filter((x) => x.parent_id == null)
            .forEach((y) => {
              expenses.push({
                ...y,
                value: 0,
                children: [],
              });
            });

          const child_expenses = (result[3] as any[]).filter(
            (x) => x.parent_id != null
          );
          child_expenses.forEach((child_expense) => {
            const index = expenses.findIndex(
              (expense) => expense.id == child_expense.parent_id
            );
            if (index != -1) {
              expenses[index].children.push(child_expense);
              expenses[index].value += parseFloat(
                child_expense.value.toString()
              );

              total_expense_value += parseFloat(child_expense.value.toString());
            }
          });

          expenses.forEach((expense) => {
            expense_table.push([
              {
                text: expense.name,
                bold: true,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(expense.value.toString())),
                bold: true,
                alignment: "left" as Alignment,
              },
            ]);

            if (expense.children.length > 0) {
              (expense.children as any[]).forEach((child_expense) => {
                expense_table.push([
                  {
                    text: `${expense.name}/${child_expense.name}`,
                    bold: false,
                    alignment: "left" as Alignment,
                  },
                  {
                    text: formatter.format(
                      parseFloat(child_expense.value.toString())
                    ),
                    bold: false,
                    alignment: "left" as Alignment,
                  },
                ]);
              });
            }
          });

          expense_table.push([
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(total_expense_value),
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          const hpp_table = [];
          let hpp_value = 0;
          hpp_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "center" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "center" as Alignment,
            },
          ]);

          (result[4] as any[]).forEach((x) => {
            const name = x.f2;
            const value = parseFloat(x.f0);

            hpp_value += value;

            hpp_table.push([
              {
                text: name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(value),
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);
          });

          hpp_table.push([
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(hpp_value),
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          const sales_value =
            parseFloat((result[0] as any[])[0].value.toString()) -
            parseFloat((result[0] as any[])[0].discount.toString()) -
            total_value;

          let documentDefinition = {
            pageSize: "A4" as PageSize,
            content: [
              {
                text: "Laporan Laba Rugi",
                bold: true,
                fontSize: 20,
                alignment: "center" as Alignment,
              },
              {
                text:
                  month == 0
                    ? `Tahun ${year}`
                    : `${month_name[month - 1]} ${year}`,
                bold: true,
                fontSize: 16,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 20] as Margins,
              },
              {
                text: "Penjualan",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "auto", "auto", "*"],
                  body: sales_table,
                },
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
              },
              {
                text: "Pembelian",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "auto", "auto", "*"],
                  body: purchase_table,
                },
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                text: "Pengeluaran",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["*", "*"],
                  body: expense_table,
                },
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                text: "Harga Pokok Penjualan",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 10] as Margins,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["*", "*"],
                  body: hpp_table,
                },
                margin: [0, 0, 0, 15] as Margins,
              },
              {
                text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
              },
              {
                text: `Laba / Rugi: ${formatter.format(
                  total_value - hpp_value - total_expense_value
                )}`,
                bold: true,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
              },
            ],
          };

          const printer = new PdfPrinter(fontDescriptors);
          const pdfDocument = printer.createPdfKitDocument(documentDefinition);

          let chunks: any[] = [];
          var pdfResult;

          pdfDocument.on("data", function (chunk: any) {
            chunks.push(chunk);
          });

          pdfDocument.on("end", function () {
            pdfResult = Buffer.concat(chunks);
            return res.status(200).send({
              data: `data:application/pdf;base64,${pdfResult.toString(
                "base64"
              )}`,
            });
          });

          pdfDocument.end();
        })
        .catch((error) => {
          LogHelper.log(
            new Date(),
            "error",
            error,
            "Report controller - Fetch Profit Loss",
            req.body.userId
          );
          return res.status(500).send(error);
        });
    } else {
      Promise.all([]);
    }
  };

  static fetchReception = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const date = parseInt(req.params.date);

    BillCodeModel.fetchReception(year, month, date)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Report Controller - Fetch Reception",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchSalesReport = (req: Request, res: Response) => {
    const type = req.body.type;
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);

    if (type == 0) {
      // Fetch by brand
      BrandModel.fetchSales(start, end)
        .then((result) => {
          console.log(result);
          return res.status(200).send((result as any[]).filter(x => {
            parseFloat(x.value.toString()) > 0
          }));
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (type == 1) {
      // Fetch by type
      ItemTypeModel.fetchSales(start, end)
        .then((result) => {
          console.log(result);
          return res.status(200).send((result as any[]).filter(x => {
            parseFloat(x.value.toString()) > 0
          }));
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static fetchPurchaseReport = (req: Request, res: Response) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = req.body.type;

    PurchaseDocumentModel.fetchReport(start, end, type).then(result => {
      console.log(result);
      return res.status(200).send((result as any[]).filter(x => {
        parseFloat(x.value.toString()) > 0
      }));
    }).catch(error => {
      return res.status(500).send(error);
    })
  }

  static fetchFrequent = (req: Request, res: Response) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const brand_id = req.body.brand_id;
    const type_id = req.body.type_id;
    const limit = req.body.limit;

    if (brand_id != null) {
      BrandModel.fetchFrequent(brand_id, start, end, limit)
        .then((result) => {
          return res.status(200).send(
            (result as any[])
              .map((x) => {
                return {
                  ...x,
                  ordered: undefined,
                  quantity: x.ordered,
                };
              })
          );
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (type_id != null) {
      ItemTypeModel.fetchFrequent(type_id, start, end, limit)
        .then((result) => {
          return res.status(200).send(
            (result as any[])
              .map((x) => {
                return {
                  ...x,
                  ordered: undefined,
                  quantity: x.ordered,
                };
              })
          );
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(500).send("Mohon masukkan parameter yang sesuai");
    }
  };

  static fetchQuickStats = (req: Request, res: Response) => {
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
      BillCodeModel.fetchTodaySales(),
      ExpenseModel.fetchTodaySum(),
      // PurchaseDocumentModel.fetchTodaySum,
      // PurchaseDocumentModel.fetchUnconfirmedToday,
    ]).then(result => {
      const response = {
        sales: (result[0] as any[]).length == 0 ? {
          value: 0,
          discount: 0,
          service: 0,
          delivery: 0,
        }: {
          value: ((result[0] as any[])[0].value == null) ? 0 : parseFloat((result[0] as any[])[0].value),
          discount: ((result[0] as any[])[0].discount == null) ? 0 : parseFloat((result[0] as any[])[0].discount),
          delivery: ((result[0] as any[])[0].delivery == null) ? 0 : parseFloat((result[0] as any[])[0].delivery),
          service: ((result[0] as any[])[0].service == null) ? 0 : parseFloat((result[0] as any[])[0].service),
        },
        expense: (result[1] as any[])[0].value,
      };
      return res.status(200).send(response);
    }).catch(error => {
      return res.status(500).send(error);
    })
  }

  static fetchPurchaseReportDownload = (req: Request, res: Response) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = req.body.type;
    const id = req.body.id;
    const password = req.body.password;

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

    PurchaseDocumentModel.fetchReportById(start, end, type, id).then(async result => {
      const purchase_table = [];
      purchase_table.push([
        {
          text: "Referensi",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Deskripsi",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Merek",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Tipe",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Surat Jalan",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Bon Pembelian",
          bold: true,
          alignment: "center" as Alignment,
        },
        {
          text: "Perusahaan",
          bold: true,
          alignment: "center" as Alignment,
        },
      ]);

      (result as any[]).forEach((x) => {
        purchase_table.push([
          {
            text: x.reference,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.description,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.item_brand_name,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.item_type_name,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.good_receipt_name,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.purchase_invoice_name,
            bold: false,
            alignment: "left" as Alignment,
          },
          {
            text: x.company_name,
            bold: false,
            alignment: "left" as Alignment,
          },
        ]);
      });

      let name;

      if(type == 0){
        const brand = await BrandModel.fetchById(id)
        name = brand[0]?.name;
      } else if(type == 1){
        const type = await ItemTypeModel.fetchById(id);
        name = type?.name;
      } else {
        const supplier = await SupplierModel.fetchById(id);
        name = supplier?.name;
      }

      let documentDefinition = {
        pageSize: "A4" as PageSize,
        pageOrientation: 'landscape' as PageOrientation,
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
            alignment: "center" as Alignment,
            margin: [0, 0, 0, 5] as Margins
          },
          {
            text:(type == 0) ? `Merek ${name}` : (type == 1) ? `Tipe ${name}` : `Supplier ${name}`,
            bold: true,
            fontSize: 14,
            alignment: "center" as Alignment,
            margin: [0, 0, 0, 15] as Margins,
          },
          {
            layout: "lightHorizontalLines",
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
              body: purchase_table,
            },
            margin: [0, 0, 0, 15] as Margins,
          },
        ],
      };

      const printer = new PdfPrinter(fontDescriptors);
      const pdfDocument = printer.createPdfKitDocument(documentDefinition);

      let chunks: any[] = [];
      var pdfResult;

      pdfDocument.on("data", function (chunk: any) {
        chunks.push(chunk);
      });

      pdfDocument.on("end", function () {
        pdfResult = Buffer.concat(chunks);
        return res.status(200).send({
          data: `data:application/pdf;base64,${pdfResult.toString(
            "base64"
          )}`,
        });
      });

      pdfDocument.end();
    }).catch(error => {
      console.log(error);
      return res.status(500).send(error);
    })
  }
}

export default ReportController;
