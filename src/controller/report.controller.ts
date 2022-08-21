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
import { Alignment, Margins, PageSize } from "pdfmake/interfaces";

var formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "IDR",
});

class ReportController {
  static fetchSalesStats = (req: Request, res: Response) => {
    const date = new Date();
    const date_before = new Date();
    date_before.setDate(date_before.getDate() - 1);

    Promise.all([
      BillCodeModel.fetchByDate(date),
      BillCodeModel.fetchByDate(date_before),
      ItemModel.fetchSoldByDate(date),
      ItemModel.fetchSoldByDate(date_before),
      BillModel.fetchQuantitySoldByDate(date),
      BillModel.fetchQuantitySoldByDate(date_before),
    ]).then((result) => {
      return res.status(200).send({
        sales: (result[0] as any[])[0].value || 0,
        prev_sales: (result[1] as any[])[0].value || 0,
        items: (result[2] as any[])[0].count,
        prev_items: (result[3] as any[])[0].count,
        count: (result[4] as any[])[0].quantity || 0,
        prev_count: (result[5] as any[])[0].quantity || 0,
      });
    });
  };

  static fetchMonthlySalesStats = (req: Request, res: Response) => {
    const date = new Date();
    const date_before = new Date();
    date_before.setMonth(date_before.getMonth() - 1);

    Promise.all([
      BillCodeModel.fetchMonthlyByDate(date),
      BillCodeModel.fetchMonthlyByDate(date_before),
      ItemModel.fetchMonthlySoldByDate(date),
      ItemModel.fetchMonthlySoldByDate(date_before),
      BillModel.fetchMonthlyQuantitySoldByDate(date),
      BillModel.fetchMonthlyQuantitySoldByDate(date_before),
    ]).then((result) => {
      return res.status(200).send({
        sales: (result[0] as any[])[0].value || 0,
        prev_sales: (result[1] as any[])[0].value || 0,
        items: (result[2] as any[])[0].count,
        prev_items: (result[3] as any[])[0].count,
        count: (result[4] as any[])[0].quantity || 0,
        prev_count: (result[5] as any[])[0].quantity || 0,
      });
    });
  };

  static fetchSalesChart = (req: Request, res: Response) => {
    const shift = parseInt(req.query.shift!.toString());
    const monthly =
      req.query.monthly === "false"
        ? false
        : req.query.monthly === "true"
        ? true
        : false;
    const type = parseInt(req.query.type!.toString());
    const limit = parseInt(process.env.LIMIT!);
    const date = new Date();
    date.setMonth(date.getMonth() - shift);

    const current_year = date.getFullYear();
    const current_month = date.getMonth() + 1;
    switch (type) {
      case 0:
        // Ambil data penjualan
        BillCodeModel.fetchChartItems(monthly, limit, shift)
          .then((result) => {
            if (monthly) {
              const response: any = {};
              response["current"] = [];
              response["previous"] = [];

              ((result as any[])[0] as any[]).forEach((x) => {
                const value = x.value;
                const diff = parseInt(x.diff);
                response["current"][Math.abs(diff)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["current"][i] = response["current"][i] || 0;
              }

              ((result as any[])[1] as any[]).forEach((x) => {
                const value = x.value;
                const diff = parseInt(x.diff);
                response["previous"][Math.abs(diff + 12)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["previous"][i] = response["previous"][i] | 0;
              }

              return res.status(200).send(response);
            } else {
              const response: any = [];
              (result as any[]).forEach((x) => {
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
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Report controller - Fetch sales chart",
              req.body.userId
            );
            return res.status(500).send(error);
          });
        break;
      case 1:
        // Ambil data penjualan
        ItemModel.fetchChartItems(monthly, limit, shift)
          .then((result) => {
            const response: any[] = [];
            if (monthly) {
              const response: any = {};
              response["current"] = [];
              response["previous"] = [];

              ((result as any[])[0] as any[]).forEach((x) => {
                const value = x.count;
                const diff = parseInt(x.diff);
                response["current"][Math.abs(diff)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["current"][i] = response["current"][i] || 0;
              }

              ((result as any[])[1] as any[]).forEach((x) => {
                const value = x.count;
                const diff = parseInt(x.diff);
                response["previous"][Math.abs(diff + 12)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["previous"][i] = response["previous"][i] | 0;
              }

              return res.status(200).send(response);
            } else {
              const response: any = [];
              (result as any[]).forEach((x) => {
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
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Report controller - Fetch sales chart",
              req.body.userId
            );
            return res.status(500).send(error);
          });
        break;
      case 2:
        ItemModel.fetchChartItems(monthly, limit, shift)
          .then((result) => {
            if (monthly) {
              const response: any = {};
              response["current"] = [];
              response["previous"] = [];

              ((result as any[])[0] as any[]).forEach((x) => {
                const value = x.count;
                const diff = parseInt(x.diff);
                response["current"][Math.abs(diff)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["current"][i] = response["current"][i] || 0;
              }

              ((result as any[])[1] as any[]).forEach((x) => {
                const value = x.count;
                const diff = parseInt(x.diff);
                response["previous"][Math.abs(diff + 12)] = value;
              });

              for (var i = 0; i < 10; i++) {
                response["previous"][i] = response["previous"][i] | 0;
              }

              return res.status(200).send(response);
            } else {
              const response: any = [];
              (result as any[]).forEach((x) => {
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
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Report controller - Fetch sales chart",
              req.body.userId
            );
            return res.status(500).send(error);
          });
        break;
    }
  };

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

    const printer = new PdfPrinter(fontDescriptors);

    if (report == 0) {
      Promise.all([
        BillCodeModel.fetchSum(month, year),
        SalesDistributionModel.fetchSum(month, year),
        PurchaseDocumentModel.fetchSum(month, year),
        ExpenseModel.fetchSum(month, year),
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
            {},
            {},
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

          (result[2] as any[]).forEach(x => {
            purchase_table.push([
              {
                text: `${x.name}`,
                bold: false,
                alignment: 'left' as Alignment
              }, 
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: 'left' as Alignment
              },
              {
                text: formatter.format(parseFloat(x.discount.toString())),
                bold: false,
                alignment: 'left' as Alignment
              }, 
              {
                text: formatter.format(parseFloat(x.value.toString()) - parseFloat(x.discount.toString())),
                bold: false,
                alignment: 'left' as Alignment
              }
            ])

            total_purchase_value += parseFloat(x.value.toString());
            total_purchase_discount += parseFloat(x.discount.toString());
          });

          purchase_table.push([
            {
              text: "Keseluruhan",
              bold: true,
              alignment: 'left' as Alignment
            }, 
            {
              text: formatter.format(total_purchase_value),
              bold: true,
              alignment: 'left' as Alignment
            },
            {
              text: formatter.format(total_purchase_discount),
              bold: true,
              alignment: 'left' as Alignment
            },
            {
              text: formatter.format((total_purchase_value - total_purchase_discount)),
              bold: true,
              alignment: 'left' as Alignment
            }
          ])

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
                margin: [0, 0, 0, 15] as Margins
              },
              {
                text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                fontSize: 10,
                color: '#333333',
                margin: [0, 0, 0, 20] as Margins
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
                margin: [0, 0, 0, 15] as Margins
              },
            ],
          };

          const pdfDocument = printer.createPdfKitDocument(documentDefinition);

          let chunks: any[] = [];
          var pdfResult;

          pdfDocument.on("data", function (chunk) {
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

  static fetchFrequentItems = (req: Request, res: Response) => {
    const monthly = !req.query.monthly
      ? false
      : req.query.monthly === "true"
      ? true
      : false;
    ItemModel.fetchFrequentItems(monthly)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Report Controller - Fetch frequent items",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };
}

export default ReportController;
