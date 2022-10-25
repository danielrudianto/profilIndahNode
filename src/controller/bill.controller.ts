import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";
import PdfPrinter from "pdfmake";
import {
  Alignment,
  Margins,
  PageOrientation,
  PageSize,
  TableLayout,
} from "pdfmake/interfaces";
import path from "path";

class BillController {
  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill as any[];
    const date =
      !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);

    const bill_code = new BillCodeModel(
      customer_id,
      req.body.userId,
      payment_method_id,
      discount,
      delivery,
      service,
      date
    );

    bill_code
      .create()
      .then((result) => {
        Promise.all([
          BillModel.create(
            bill.map((x) => {
              return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                price: x.price,
                discount: x.discount,
                quantity: x.quantity,
                bill_code_id: result.id,
              };
            })
          ),
          ItemPriceModel.updateMany(
            bill.filter((x) => x.save),
            req.body.userId
          ),
        ])
          .then(() => {
            LogHelper.log(
              new Date(),
              "info",
              `${result.user_bill_code_created_byTouser.name} berhasil menambahkan faktur penjualan ${result.name} (ID: ${result.id})`,
              "Bill controller - Create",
              req.body.userId
            );
            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(error);
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Bill controller - Create",
              req.body.userId
            );
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        console.error(error);
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Bill controller - Create",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static createPrintoutDraft = (req: Request, res: Response) => {
    const items = req.body as any[];
    ItemModel.fetchByItemUnitIds(
      items.map((x) => {
        return {
          item_id: x.id,
          item_unit_id: x.item_unit_id,
        };
      })
    ).then((result) => {
      return res.status(200).send(result);
    });
  };

  static createPrintout = (req: Request, res: Response) => {
    var formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "IDR",
    });

    var numberFormatter = new Intl.NumberFormat();
    const bill_table: any[] = [];

    let i = 0;
    let totalBill = 0;
    let blackLinesIndex: string[] = [];
    let greyLinesIndex: string[] = [];

    (req.body.items as any[]).forEach((x) => {
      if(i != 0){
        greyLinesIndex.push(i.toString());
      }
      bill_table.push([
        {
          stack: [
            {
              text: x.reference,
              bold: true,
              fontSize: 10,
              alignment: "left" as Alignment,
            },
            {
              text: x.description,
              bold: false,
              fontSize: 12,
              alignment: "left" as Alignment,
              margins: [0, 0, 0, 10] as Margins,
            },
          ],
        },
        {},
      ]);

      i++;
      blackLinesIndex.push(i.toString());

      (x.quantity as any[]).forEach((item) => {
        const price = parseFloat(item.price);
        const discount = parseFloat(item.discount);
        const nettPrice = price - discount;
        const quantity = item.quantity;
        const unit = item.unit;
        const total = quantity * nettPrice;

        bill_table.push([
          {
            text: `${numberFormatter.format(
              quantity
            )} ${unit} x ${formatter.format(nettPrice)}`,
          },
          {
            text: formatter.format(total),
          },
        ]);

        totalBill += total;
        i++;
      });
    });

    blackLinesIndex.push(i.toString());

    bill_table.push([
      {
        text: "Total",
        bold: true,
        fontSize: 12,
      },
      {
        text: formatter.format(totalBill),
      },
    ]);

    const fontDescriptors = {
      Roboto: {
        normal: path.join(
          __dirname,
          "..",
          "assets",
          "/fonts/Cairo-Regular.ttf"
        ),
        bold: path.join(__dirname, "..", "assets", "/fonts/Cairo-Medium.ttf"),
        italics: path.join(
          __dirname,
          "..",
          "assets",
          "/fonts/Cairo-Italic.ttf"
        ),
        bolditalics: path.join(
          __dirname,
          "..",
          "assets",
          "/fonts/Cairo-MediumItalic.ttf"
        ),
      },
    };

    let documentDefinition = {
      pageSize: req.body.size as PageSize,
      pageOrientation: "portrait" as PageOrientation,
      content: [
        {
          layout: {
            hLineColor: function (i, node) {
              return blackLinesIndex.includes(i.toString()) ||
                i == node.table.body.length ||
                i == 0
                ? "black"
                : "grey";
            },
            hLineWidth: function (i, node) {
              return (blackLinesIndex.includes(i.toString()) || i == 0)
                ? 1
                : 0
            },
            vLineWidth: function(i, node){
              return 0
            }
          } as TableLayout,
          table: {
            headerRows: 0,
            widths: ["*", "auto"],
            body: bill_table,
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
  };

  static fetchCodeById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillCodeModel.fetchCodeById(id)
      .then((result) => {
        return res.status(200).send(result?.bill_code);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Bill controller - Fetch code by ID",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!req.params.year && !req.params.month) {
      const archive_years = BillCodeModel.fetchArchiveYears();
      const count_archive_years = BillCodeModel.countArchiveByYear();

      const transaction = new QueryTransactionHelper();
      transaction
        .create([archive_years, count_archive_years])
        .then((result) => {
          const response: any[] = [];
          (result[0] as any[]).forEach((item) => {
            response.push({
              year: item.year,
              count: (result[1] as any[]).filter((x) => x.year == item.year)[0]
                .count,
            });
          });

          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (!req.params.month) {
      const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      BillCodeModel.countArchiveByMonth(year)
        .then((counts) => {
          (counts as any[]).forEach((x) => {
            const month = x.month;
            const num = x.count;

            count[month - 1] = num;
          });

          return res.status(200).send(count);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.params.year && req.params.month) {
      const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
      const limit = parseInt(process.env.LIMIT!.toString());
      const offset = (page - 1) * limit;

      const transaction = new QueryTransactionHelper();
      transaction
        .create([
          BillCodeModel.fetchArchive(year, month, offset, limit),
          BillCodeModel.countArchive(year, month),
        ])
        .then((result) => {
          return res.status(200).send({
            data: result[0],
            count: result[1],
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Input tidak dikenal.");
    }
  };

  static deleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillCodeModel.deleteById(id, req.body.userId)
      .then((result) => {
        const socket = new SocketHelper("deleteBill", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default BillController;
