import { Request, Response } from "express";
import PdfPrinter from "pdfmake";
import BillCodeModel from "../model/bill_code.model";
import ExpenseModel from "../model/expense.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import SalesDistributionModel from "../model/sales_distribution.model";
import path from "path";
import ExcelJS from "exceljs";
import {
  Alignment,
  Content,
  Margins,
  PageBreak,
  PageOrientation,
  PageSize,
} from "pdfmake/interfaces";
import StockValueHelper from "../helper/stock_value.helper";
import { BrandModel } from "../model/brand.model";
import ItemTypeModel from "../model/item_type.model";
import SupplierModel from "../model/supplier.model";
import { ItemModel } from "../model/item.model";
import CompanyModel from "../model/company.model";
import StockCardHelper from "../helper/stock_card.helper";

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
  static monthNames = [
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

  static fontDescriptors = {
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
    Cairo: {
      normal: path.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
      bold: path.join(__dirname, "..", "assets", "/fonts/Cairo-Bold.ttf"),
    },
  };

  static fetchMoneyReceipt = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

    BillCodeModel.fetchMoneyReceipt(formattedDate)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchPurchaseReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;

    PurchaseInvoiceModel.calculateTotalPurchase(month, year, mode)!
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
            purchase_detail: (result[1] as any[])
              .map((x) => {
                return {
                  name: x.supplier_name,
                  value:
                    parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString()),
                };
              })
              .sort((a, b) => {
                return b.value - a.value;
              }),
          });
        } else if (mode == "supplier") {
          return res.status(200).send({
            purchase_detail: result
              .map((x) => {
                return {
                  name: x.supplier_name,
                  value:
                    parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString()),
                };
              })
              .sort((a, b) => {
                return b.value - a.value;
              }),
          });
        } else if (mode == "type") {
          return res.status(200).send({
            purchase_detail: result
              .map((x) => {
                return {
                  name: x.item_type_name,
                  value:
                    parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString()),
                };
              })
              .sort((a, b) => {
                return b.value - a.value;
              }),
          });
        } else if (mode == "brand") {
          return res.status(200).send({
            purchase_detail: result
              .map((x) => {
                return {
                  name: x.item_brand_name,
                  value:
                    parseFloat(x.value.toString()) -
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

  static fetchSalesReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;

    BillCodeModel.calculateTotalSales(month, year, mode)!
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
            sales_detail: (result[1] as any[])
              .map((x) => {
                return {
                  name: x.customer_name,
                  value:
                    parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString()) +
                    parseFloat(x.delivery.toString()) +
                    parseFloat(x.service.toString()),
                };
              })
              .sort((a, b) => {
                return b.value - a.value;
              }),
          });
        } else if (mode == "customer") {
          return res.status(200).send({
            sales_detail: result
              .map((x) => {
                return {
                  name: x.customer_name,
                  value:
                    parseFloat(x.value.toString()) -
                    parseFloat(x.discount.toString()),
                };
              })
              .sort((a, b) => {
                return b.value - a.value;
              }),
          });
        } else if (mode == "type") {
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
        } else if (mode == "brand") {
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
        } else if (mode == "download") {
          const workbook = new ExcelJS.Workbook();
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

          (result[0] as any[]).forEach((data) => {
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
          (result[1] as any[]).forEach((data) => {
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
          (result[2] as any[]).forEach((data) => {
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
                data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                  buffer
                ).toString("base64")}`,
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

  static fetchPLStats = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);

    if (report == 0) {
      Promise.all([
        BillCodeModel.fetchSum(month, year),
        SalesDistributionModel.fetchSum(month, year),
        PurchaseInvoiceModel.fetchSum(month, year),
        CompanyModel.fetchAll(),
        ExpenseModel.fetchSum(month, year),
        month == 0
          ? StockValueHelper.fetchCOGS(
              new Date(year - 1, 11, 31),
              new Date(year, 11, 31)
            )
          : StockValueHelper.fetchCOGS(
              new Date(year, month - 1, 0),
              new Date(year, month, 0)
            ),
      ])
        .then((result) => {
          const sales_table = [];
          let total_sales_value: any[] = [];

          const sales_value =
            (result[0] as any[])[0].value == null
              ? 0
              : parseFloat((result[0] as any[])[0].value.toString());
          const sales_discount =
            (result[0] as any[])[0].discount == null
              ? 0
              : parseFloat((result[0] as any[])[0].discount.toString());
          const sales_delivery =
            (result[0] as any[])[0].delivery == null
              ? 0
              : parseFloat((result[0] as any[])[0].delivery.toString());
          const sales_service =
            (result[0] as any[])[0].service == null
              ? 0
              : parseFloat((result[0] as any[])[0].service.toString());

          // Sales table
          sales_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Jasa",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Pengiriman Barang",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          let total_value = 0;

          (result[1] as any[]).forEach((x) => {
            total_value += parseFloat(x.value.toString());
            total_sales_value.push({
              id: x.company_id,
              value: parseFloat(x.value.toString()),
            });
            sales_table.push([
              {
                text: x.name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: "N/A",
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: "N/A",
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
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
              text: formatter.format(sales_service),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_delivery),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                total_value + sales_delivery + sales_service
              ),
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
                sales_value - sales_discount - total_value
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "N/A",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "N/A",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                sales_value - sales_discount - total_value
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
              text: formatter.format(sales_value - sales_discount),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_service),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_delivery),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                sales_value - sales_discount + sales_delivery + sales_service
              ),
              bold: true,
              aligment: "left" as Alignment,
            },
          ]);

          const purchase_table = [];
          let total_purchase_value = 0;
          let total_purchase_discount = 0;

          purchase_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Potongan Harga",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
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

          const expense_section: any[] = [
            {
              text: "Pengeluaran",
              bold: true,
              fontSize: 14,
              alignment: "center" as Alignment,
              margin: [0, 0, 0, 15] as Margins,
              tocItem: true,
              pageOrientation: "landscape" as PageOrientation,
            },
          ];
          let total_expense_value: any[] = [];
          (result[3] as any[]).forEach((company, companyIndex) => {
            const expense_table: any[] = [];
            const expenses: any[] = [];
            total_expense_value.push({
              id: company.id,
              value: 0,
            });

            expense_section.push({
              text: company.name,
              bold: true,
              fontSize: 14,
              alignment: "left" as Alignment,
              margin: [0, 0, 0, 15] as Margins,
              pageOrientation: "landscape" as PageOrientation,
            });

            let expense_value = 0;
            expense_table.push([
              {
                text: "Tipe",
                bold: true,
                alignment: "left" as Alignment,
                fontSize: 12,
              },
              {
                text: "Nominal",
                bold: true,
                alignment: "left" as Alignment,
                fontSize: 12,
              },
            ]);

            (result[4] as any[])
              .filter((x) => x.parent_id == null && x.company_id == company.id)
              .forEach((y) => {
                expenses.push({
                  ...y,
                  value: 0,
                  children: [],
                });

                const child_expenses = (result[4] as any[]).filter(
                  (z) => z.parent_id == y.id && z.company_id == company.id
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

                    expense_value += parseFloat(child_expense.value.toString());

                    total_expense_value[companyIndex].value += parseFloat(
                      child_expense.value.toString()
                    );
                  }
                });
              });

            expenses.forEach((expense) => {
              expense_table.push([
                {
                  text: expense.name,
                  bold: true,
                  alignment: "left" as Alignment,
                  fontSize: 12,
                },
                {
                  text: formatter.format(parseFloat(expense.value.toString())),
                  bold: true,
                  alignment: "left" as Alignment,
                  fontSize: 12,
                },
              ]);

              if (expense.children.length > 0) {
                (expense.children as any[]).forEach((child_expense) => {
                  expense_table.push([
                    {
                      text: `${expense.name}/${child_expense.name}`,
                      bold: false,
                      alignment: "left" as Alignment,
                      fontSize: 12,
                    },
                    {
                      text: formatter.format(
                        parseFloat(child_expense.value.toString())
                      ),
                      bold: false,
                      alignment: "left" as Alignment,
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
                alignment: "left" as Alignment,
                fontSize: 12,
              },
              {
                text: formatter.format(expense_value),
                bold: true,
                alignment: "left" as Alignment,
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
              margin: [0, 0, 0, 15] as Margins,
              pageOrientation: "landscape" as PageOrientation,
            });
          });

          const hpp_table = [];
          let hpp_value = 0;
          hpp_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          let cogs_value: any[] = [];

          (result[5] as any[]).forEach((x) => {
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
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(cogs.value),
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

          const summary_section: any[] = [
            {
              text: "Laba / Rugi",
              bold: true,
              fontSize: 14,
              alignment: "center" as Alignment,
              margin: [0, 0, 0, 10] as Margins,
              pageBreak: "before" as PageBreak,
              tocItem: true,
              pageOrientation: "landscape" as PageOrientation,
            },
          ];

          result[3].forEach((x) => {
            summary_section.push({
              text: x.name,
              bold: true,
              fontSize: 14,
              alignment: "left" as Alignment,
              margins: [0, 0, 0, 15] as Margins,
              pageOrientation: "landscape" as PageOrientation,
            });

            const summary_table: any[] = [
              [
                {
                  text: "Keterangan",
                  bold: true,
                  alignment: "left" as Alignment,
                  fontSize: 12,
                },
                {
                  text: "Nominal",
                  bold: true,
                  alignment: "left" as Alignment,
                  fontSize: 12,
                },
                {
                  text: "Persentase",
                  bold: true,
                  alignment: "left" as Alignment,
                  fontSize: 12,
                },
              ],
            ];
            const sales_value_company_index = total_sales_value.findIndex(
              (y) => y.id == x.id
            );
            let sales_value_company = 0;
            if (sales_value_company_index != -1) {
              sales_value_company =
                total_sales_value[sales_value_company_index].value;
            }

            const cogs_value_company_index = cogs_value.findIndex(
              (y) => y.id == x.id
            );
            let cogs_value_company = 0;
            if (cogs_value_company_index != -1) {
              cogs_value_company = cogs_value[cogs_value_company_index].value;
            }

            const expense_value_company_index = total_expense_value.findIndex(
              (y) => y.id == x.id
            );
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
                text: formatter.format(
                  sales_value_company - cogs_value_company
                ),
                bold: false,
                fontSize: 12,
              },
              {
                text:
                  sales_value_company == 0
                    ? "0.00%"
                    : percentage_formatter.format(
                        (sales_value_company - cogs_value_company) /
                          sales_value_company
                      ),
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
                text: formatter.format(
                  sales_value_company -
                    cogs_value_company -
                    expense_value_company
                ),
                bold: false,
                fontSize: 12,
              },
              {
                text:
                  sales_value_company == 0
                    ? "0.00%"
                    : percentage_formatter.format(
                        (sales_value_company -
                          cogs_value_company -
                          expense_value_company) /
                          sales_value_company
                      ),
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
              margin: [0, 0, 0, 15] as Margins,
              pageOrientation: "landscape" as PageOrientation,
            });
          });

          let documentDefinition = {
            pageSize: "A4" as PageSize,
            content: [
              {
                text: "Laporan Laba Rugi",
                bold: true,
                fontSize: 20,
                alignment: "center" as Alignment,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text:
                  month == 0
                    ? `Tahun ${year}`
                    : `${this.monthNames[month - 1]} ${year}`,
                bold: true,
                fontSize: 16,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 20] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Daftar isi",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                toc: {
                  title: { text: "" },
                  pageOrientation: "landscape" as PageOrientation,
                },
              },
              {
                text: "Penjualan",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
                pageBreak: "before" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "*", "*", "*"],
                  body: sales_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
                pageBreak: "after" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Pembelian",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "*", "*"],
                  body: purchase_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
                pageBreak: "after" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Harga Pokok Penjualan",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
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
                pageBreak: "after" as PageBreak,
              },
              ...expense_section,
              ...summary_section,
            ],
            footer: (currentPage: number, pageCount: number) => {
              return {
                text: currentPage.toString() + " of " + pageCount,
                alignment: "center" as Alignment,
                bold: false,
                fontSize: 8,
              };
            },
            pageMargins: [20, 60, 20, 20] as Margins,
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
            return res.status(200).send({
              data: `data:application/pdf;base64,${pdfResult.toString(
                "base64"
              )}`,
            });
          });

          pdfDocument.end();
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      Promise.all([
        BillCodeModel.fetchSum(month, year),
        SalesDistributionModel.fetchSum(month, year),
        PurchaseInvoiceModel.fetchSum(month, year),
        CompanyModel.fetchAll(),
        ExpenseModel.fetchSum(month, year),
        month == 0
          ? StockValueHelper.fetchCOGS(
              new Date(year - 1, 11, 31),
              new Date(year, 11, 31)
            )
          : StockValueHelper.fetchCOGS(
              new Date(year, month - 1, 0),
              new Date(year, month, 0)
            ),
        BillCodeModel.fetchAppendix(month, year),
        PurchaseInvoiceModel.fetchAppendix(month, year),
        ExpenseModel.fetchAppendix(month, year),
      ])
        .then((result) => {
          const sales_table = [];
          let total_sales_value: any[] = [];

          const sales_value =
            (result[0] as any[])[0].value == null
              ? 0
              : parseFloat((result[0] as any[])[0].value.toString());
          const sales_discount =
            (result[0] as any[])[0].discount == null
              ? 0
              : parseFloat((result[0] as any[])[0].discount.toString());
          const sales_delivery =
            (result[0] as any[])[0].delivery == null
              ? 0
              : parseFloat((result[0] as any[])[0].delivery.toString());
          const sales_service =
            (result[0] as any[])[0].service == null
              ? 0
              : parseFloat((result[0] as any[])[0].service.toString());

          // Sales table
          sales_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Jasa",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Pengiriman Barang",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          let total_value = 0;

          (result[1] as any[]).forEach((x) => {
            total_value += parseFloat(x.value.toString());
            total_sales_value.push({
              id: x.company_id,
              value: parseFloat(x.value.toString()),
            });
            sales_table.push([
              {
                text: x.name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: "N/A",
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: "N/A",
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
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
              text: formatter.format(sales_delivery),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_service),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                total_value + sales_delivery + sales_service
              ),
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
                sales_value - sales_discount - total_value
              ),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "N/A",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "N/A",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                sales_value - sales_discount - total_value
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
              text: formatter.format(sales_value - sales_discount),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_service),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(sales_delivery),
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: formatter.format(
                sales_value - sales_discount + sales_delivery + sales_service
              ),
              bold: true,
              aligment: "left" as Alignment,
            },
          ]);

          const purchase_table = [];
          let total_purchase_value = 0;
          let total_purchase_discount = 0;

          purchase_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Potongan Harga",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Total",
              bold: true,
              alignment: "left" as Alignment,
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

          const expense_section: any[] = [];
          let total_expense_value: any[] = [];
          (result[3] as any[]).forEach((company, companyIndex) => {
            const expense_table: any[] = [];
            const expenses: any[] = [];
            total_expense_value.push({
              id: company.id,
              value: 0,
            });

            const index = (result[4] as any[]).findIndex(
              (expense) => expense.company_id == company.id
            );

            if (index != -1) {
              expense_section.push({
                text: company.name,
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              });

              let expense_value = 0;
              expense_table.push([
                {
                  text: "Tipe",
                  bold: true,
                  alignment: "left" as Alignment,
                },
                {
                  text: "Nominal",
                  bold: true,
                  alignment: "left" as Alignment,
                },
              ]);

              (result[4] as any[])
                .filter(
                  (x) => x.parent_id == null && x.company_id == company.id
                )
                .forEach((y) => {
                  expenses.push({
                    ...y,
                    value: 0,
                    children: [],
                  });

                  const child_expenses = (result[4] as any[]).filter(
                    (x) => x.parent_id == y.id && x.company_id == company.id
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

                      expense_value += parseFloat(
                        child_expense.value.toString()
                      );

                      total_expense_value[companyIndex].value += parseFloat(
                        child_expense.value.toString()
                      );
                    }
                  });
                });

              expenses.forEach((expense) => {
                expense_table.push([
                  {
                    text: expense.name,
                    bold: true,
                    alignment: "left" as Alignment,
                  },
                  {
                    text: formatter.format(
                      parseFloat(expense.value.toString())
                    ),
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
                  text: formatter.format(expense_value),
                  bold: true,
                  alignment: "left" as Alignment,
                },
              ]);

              expense_section.push({
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["*", "*"],
                  body: expense_table,
                },
                margin: [0, 0, 0, 15] as Margins,
              });
            }
          });

          const hpp_table = [];
          let hpp_value = 0;
          hpp_table.push([
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          let cogs_value: any[] = [];

          (result[5] as any[]).forEach((x) => {
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

          const sales_appendix_table = [];
          sales_appendix_table.push([
            {
              text: "Tanggal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Konsumen",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Dokumen",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          (result[6] as any[]).forEach((x) => {
            sales_appendix_table.push([
              {
                text: `${new Date(x.date).getDate()} ${
                  this.monthNames[new Date(x.date).getMonth()]
                }`,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.customer_name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(x.value),
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);
          });

          const purchase_appendix_table = [];
          purchase_appendix_table.push([
            {
              text: "Tanggal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Supplier",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Dokumen",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          (result[7] as any[]).forEach((x) => {
            purchase_appendix_table.push([
              {
                text: `${new Date(x.date).getDate()} ${
                  this.monthNames[new Date(x.date).getMonth()]
                }`,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.supplier_name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.company_name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.purchase_invoice_name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: formatter.format(x.value),
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);
          });

          const expense_appendix_table = [];
          expense_appendix_table.push([
            {
              text: "Tanggal",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Perusahaan",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Tipe Pengeluaran",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Deskripsi",
              bold: true,
              alignment: "left" as Alignment,
            },
            {
              text: "Nominal",
              bold: true,
              alignment: "left" as Alignment,
            },
          ]);

          result[8].forEach((x) => {
            expense_appendix_table.push([
              {
                text: `${new Date(x.date).getDate()} ${
                  this.monthNames[new Date(x.date).getMonth()]
                }`,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.company.name,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: `${x.expense_type.expense_type?.name} / ${x.expense_type.name}`,
                bold: false,
                alignment: "left" as Alignment,
              },
              {
                text: x.description,
              },
              {
                text: formatter.format(parseFloat(x.value.toString())),
                bold: false,
                alignment: "left" as Alignment,
              },
            ]);
          });

          const summary_section: any[] = [
            {
              text: "Laba / Rugi",
              bold: true,
              fontSize: 14,
              alignment: "center" as Alignment,
              margin: [0, 0, 0, 10] as Margins,
              pageBreak: "before" as PageBreak,
              tocItem: true,
            },
          ];

          result[3].forEach((x) => {
            summary_section.push({
              text: x.name,
              fontSize: 14,
              bold: true,
              alignment: "left" as Alignment,

              margins: [0, 0, 0, 15] as Margins,
            });

            const summary_table: any[] = [
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
            const sales_value_company_index = total_sales_value.findIndex(
              (y) => y.id == x.id
            );
            let sales_value_company = 0;
            if (sales_value_company_index != -1) {
              sales_value_company =
                total_sales_value[sales_value_company_index].value;
            }

            const cogs_value_company_index = cogs_value.findIndex(
              (y) => y.id == x.id
            );
            let cogs_value_company = 0;
            if (cogs_value_company_index != -1) {
              cogs_value_company = cogs_value[cogs_value_company_index].value;
            }

            const expense_value_company_index = total_expense_value.findIndex(
              (y) => y.id == x.id
            );
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
                text: formatter.format(
                  sales_value_company - cogs_value_company
                ),
                bold: false,
                fontSize: 12,
              },
              {
                text:
                  sales_value_company == 0
                    ? "0.00%"
                    : percentage_formatter.format(
                        (sales_value_company - cogs_value_company) /
                          sales_value_company
                      ),
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
                text: formatter.format(
                  sales_value_company -
                    cogs_value_company -
                    expense_value_company
                ),
                bold: false,
                fontSize: 12,
              },
              {
                text: percentage_formatter.format(
                  (sales_value_company -
                    cogs_value_company -
                    expense_value_company) /
                    sales_value_company
                ),
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
              margin: [0, 0, 0, 15] as Margins,
            });
          });

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
                    : `${this.monthNames[month - 1]} ${year}`,
                bold: true,
                fontSize: 16,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 20] as Margins,
              },
              {
                text: "Daftar isi",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
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
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
                pageBreak: "before" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "*", "*", "*"],
                  body: sales_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Penjualan tidak teralokasi disebabkan karena adanya ketidakcocokan tingkat ketersediaan dengan penjualan.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
                pageBreak: "after" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Pembelian",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "*", "*"],
                  body: purchase_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Pembelian yang diperoleh merupakan pembelian yang telah dikonfirmasi.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
                pageBreak: "after" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Harga Pokok Penjualan",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 10] as Margins,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["*", "*"],
                  body: hpp_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Harga pokok penjualan termasuk dengan perhitungan atas kehilangan barang yang terjadi.",
                fontSize: 10,
                color: "#333333",
                margin: [0, 0, 0, 20] as Margins,
                pageBreak: "after" as PageBreak,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Pengeluaran",
                bold: true,
                fontSize: 14,
                alignment: "center" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              ...expense_section,
              ...summary_section,
              {
                text: "Lampiran I",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 5] as Margins,
                pageBreak: "before" as PageBreak,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Rincian Penjualan",
                bold: true,
                fontSize: 10,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "auto", "*", "*"],
                  body: sales_appendix_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Lampiran II",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 5] as Margins,
                pageBreak: "before" as PageBreak,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Rincian Pembelian",
                bold: true,
                fontSize: 10,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "auto", "auto", "*", "*"],
                  body: purchase_appendix_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Lampiran III",
                bold: true,
                fontSize: 14,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 5] as Margins,
                pageBreak: "before" as PageBreak,
                tocItem: true,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                text: "Rincian Pengeluaran",
                bold: true,
                fontSize: 10,
                alignment: "left" as Alignment,
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
              {
                layout: "lightHorizontalLines",
                table: {
                  headerRows: 1,
                  widths: ["auto", "auto", "auto", "*", "*"],
                  body: expense_appendix_table,
                },
                margin: [0, 0, 0, 15] as Margins,
                pageOrientation: "landscape" as PageOrientation,
              },
            ],
            footer: (currentPage: number, pageCount: number) => {
              return {
                text: currentPage.toString() + " of " + pageCount,
                alignment: "center" as Alignment,
                bold: false,
                fontSize: 8,
              };
            },
            pageMargins: [20, 60, 20, 20] as Margins,
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
            return res.status(200).send({
              data: `data:application/pdf;base64,${pdfResult.toString(
                "base64"
              )}`,
            });
          });

          pdfDocument.end();
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static fetchQuickStats = (req: Request, res: Response) => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    // Fetch sales
    // Fetch expenses
    // Fetch purchase
    // Fetch unconfirmed purchase document
    Promise.all([
      BillCodeModel.fetchTodaySales(todayDate),
      BillCodeModel.fetchTodaySales(yesterdayDate),
      PurchaseInvoiceModel.fetchTodayPurchase(todayDate),
      PurchaseInvoiceModel.fetchTodayPurchase(yesterdayDate),
      ExpenseModel.fetchTodaySum(),
    ])
      .then((result) => {
        const response = {
          sales:
            (result[0] as any[]).length == 0
              ? {
                  value: 0,
                  discount: 0,
                  service: 0,
                  delivery: 0,
                }
              : {
                  value:
                    (result[0] as any[])[0].value == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].value),
                  discount:
                    (result[0] as any[])[0].discount == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].discount),
                  delivery:
                    (result[0] as any[])[0].delivery == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].delivery),
                  service:
                    (result[0] as any[])[0].service == null
                      ? 0
                      : parseFloat((result[0] as any[])[0].service),
                },
          sales_prev:
            (result[1] as any[]).length == 0
              ? {
                  value: 0,
                  discount: 0,
                  service: 0,
                  delivery: 0,
                }
              : {
                  value:
                    (result[1] as any[])[0].value == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].value),
                  discount:
                    (result[1] as any[])[0].discount == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].discount),
                  delivery:
                    (result[1] as any[])[0].delivery == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].delivery),
                  service:
                    (result[1] as any[])[0].service == null
                      ? 0
                      : parseFloat((result[1] as any[])[0].service),
                },
          purchase: {
            value:
              (result[2] as any[])[0].value == null
                ? 0
                : parseFloat((result[2] as any[])[0].value),
            discount:
              (result[2] as any[])[0].discount == null
                ? 0
                : parseFloat((result[2] as any[])[0].discount),
          },
          purchase_prev: {
            value:
              (result[3] as any[])[0].value == null
                ? 0
                : parseFloat((result[3] as any[])[0].value),
            discount:
              (result[3] as any[])[0].discount == null
                ? 0
                : parseFloat((result[3] as any[])[0].discount),
          },
          expense: (result[4] as any[])[0].value,
        };

        return res.status(200).send(response);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchPurchaseReportDownload = (req: Request, res: Response) => {
    const start = new Date(req.body.start);
    const end = new Date(req.body.end);
    const type = parseInt(req.body.type.toString());
    const id = parseInt(req.body.id.toString());
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

    PurchaseInvoiceModel.fetchReportById(start, end, type, id)
      .then(async (result) => {
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

        if (type == 0) {
          const brand = await BrandModel.fetchById(id);
          name = brand[0]?.name;
        } else if (type == 1) {
          const type = await ItemTypeModel.fetchById(id);
          name = type?.name;
        } else {
          const supplier = await SupplierModel.fetchById(id);
          // name = supplier?.name;
        }

        let documentDefinition = {
          pageSize: "A4" as PageSize,
          pageOrientation: "landscape" as PageOrientation,
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
              alignment: "center" as Alignment,
              margin: [0, 0, 0, 5] as Margins,
            },
            {
              text:
                type == 0
                  ? `Merek ${name}`
                  : type == 1
                  ? `Tipe ${name}`
                  : `Supplier ${name}`,
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
            data: `data:application/pdf;base64,${pdfResult.toString("base64")}`,
          });
        });

        pdfDocument.end();
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
      });
  };

  static fetchPurchaseItemDetail = (req: Request, res: Response) => {
    const format = req.body.format;
    const start = req.body.start;
    const end = req.body.end;
    const brand_id = req.body.brand_id as number[];
    const type_id = req.body.type_id as number[];

    if (format === "PDF") {
      Promise.all([
        ItemModel.fetchOutputByBrandType(
          brand_id,
          type_id,
          new Date(start),
          new Date(end)
        ),
        BrandModel.fetchByIds(brand_id),
        ItemTypeModel.fetchByIds(type_id),
      ])
        .then((result) => {
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

          const printer = new PdfPrinter(fontDescriptors);
          const content: Content = [];

          content.push({
            text: "Laporan Pengeluaran Barang",
            bold: true,
            fontSize: 20,
            font: "Roboto",
            alignment: "center" as Alignment,
            margin: [0, 0, 0, 15] as Margins,
          });

          brand_id.forEach((brand) => {
            const brandData = result[1].findIndex((x) => x.id == brand);
            if (brandData != -1) {
              content.push({
                text: `Merek: ${result[1][brandData].name}`,
                bold: true,
                fontSize: 14,
                font: "Roboto",
                alignment: "center" as Alignment,
              });

              type_id.forEach((type) => {
                const typeData = result[2].findIndex((x) => x.id == type);
                if (typeData != -1) {
                  content.push({
                    text: `Tipe: ${result[2][typeData].name}`,
                    bold: true,
                    fontSize: 14,
                    font: "Roboto",
                    alignment: "left" as Alignment,
                    margin: [0, 0, 0, 5] as Margins,
                  });

                  const items = result[0].filter(
                    (item) =>
                      item.item.item_brand_id == brand &&
                      item.item.item_type_id == type
                  );

                  const itemTable = [];

                  itemTable.push([
                    {
                      text: "Tanggal",
                      bold: true,
                      alignment: "center" as Alignment,
                    },
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
                      text: "Jumlah",
                      bold: true,
                      alignment: "center" as Alignment,
                    },
                  ]);

                  if (items.length > 0) {
                    items.forEach((item) => {
                      itemTable.push([
                        {
                          text:
                            item.bill_code.date == null
                              ? ""
                              : Intl.DateTimeFormat("en-US").format(
                                  new Date(item.bill_code.date)
                                ),
                          bold: false,
                          alignment: "left" as Alignment,
                        },
                        {
                          text: item.item.reference,
                          bold: false,
                          alignment: "left" as Alignment,
                        },
                        {
                          text: item.item.description,
                          bold: false,
                          alignment: "left" as Alignment,
                        },
                        {
                          text: `${Intl.NumberFormat().format(
                            parseFloat(item.quantity.toString()) -
                              parseFloat(
                                item.sales_return
                                  .reduce(
                                    (partial, a) =>
                                      partial + parseFloat(a.toString()),
                                    0
                                  )
                                  .toString()
                              )
                          )} ${
                            item.item_unit == null
                              ? item.item.unit
                              : item.item_unit.unit
                          }`,
                          bold: false,
                          alignemnt: "left" as Alignment,
                        },
                      ]);
                    });
                  } else {
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
                    margin: [0, 0, 0, 15] as Margins,
                    pageBreak: "after" as PageBreak,
                  });
                }
              });
            }
          });

          let documentDefinition = {
            pageSize: "A4" as PageSize,
            content: content,
          };
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
          console.log(error);
          return res.status(500).send(error);
        });
    } else if (format === "Excel") {
      ItemModel.fetchInputByBrandType(
        brand_id,
        type_id,
        new Date(start),
        new Date(end)
      )
        .then((result) => {})
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Format tidak ditemukan.");
    }
  };

  static fetchSalesItemReport = (req: Request, res: Response) => {
    const brand = req.body.brand as number[];
    const type = req.body.type as number[];
    const format = req.body.format;
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;

    ItemModel.fetchValueByBrandType(brand, type, month, year)
      .then((result) => {
        StockCardHelper.createStockReport(
          format,
          group,
          brand,
          type,
          result,
          function (buffer: any) {
            if (format == "xlsx") {
              return res.status(200).send({
                data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                  buffer
                ).toString("base64")}`,
              });
            } else if (format == "PDF") {
              return res.status(200).send({
                data: `data:application/pdf;base64,${Buffer.from(
                  buffer
                ).toString("base64")}`,
              });
            }
          },
          function (error: any) {
            return res.status(500).send(error);
          }
        );
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ReportController;
