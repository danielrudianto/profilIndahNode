import { Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import ItemPriceModel from "../model/item_price.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import ProductStockModel from "../model/product-stock.model";

class SalesInvoiceController {
  static create = (req: Request, res: Response) => {
    const uuid = req.body.uuid;
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
      date,
      uuid
    );

    bill_code
      .create()
      .then((result) => {
        Promise.all([
          // Create bill items
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
          // Saving item price
          ItemPriceModel.updateMany(
            bill.filter((x) => x.save),
            req.body.userId
          ),
        ])
          .then((_) => {
            BillCodeModel.fetchById(result.id).then((bills) => {
              if (bills != null) {
                ProductStockModel.updateStock(
                  bills!.bill.map((x) => {
                    const quantity =
                      parseFloat(x.quantity.toString()) *
                      (x.item_unit == null
                        ? 1
                        : parseFloat(x.item_unit!.conversion.toString())) *
                      -1;
                    return {
                      item_id: x.item_id,
                      quantity: quantity.toFixed(4),
                    };
                  })
                )
                  .then(() => {
                    return res.status(201).send(result);
                  })
                  .catch(() => {
                    return res.status(201).send(result);
                  });
              } else {
                return res.status(201).send(result);
              }
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchById(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          let subTotal = 0;
          for (let item of result.bill) {
            subTotal +=
              parseFloat(item.price.toString()) *
              parseFloat(item.quantity.toString());
          }
          return res.status(200).send({
            ...result,
            subTotal: subTotal,
            discount: parseFloat(result.discount.toString()),
            delivery: parseFloat(result.delivery.toString()),
            service: parseFloat(result.service.toString()),
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static deleteById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id.toString());
      BillCodeModel.deleteById(id, req.body.userId)
        .then((result) => {
          if (result.is_delete) {
            const socket = new SocketHelper("deleteBill", result);
            socket.create();

            BillCodeModel.fetchById(result.id).then((bills) => {
              if (bills != null) {
                ProductStockModel.updateStock(
                  bills!.bill.map((x) => {
                    const quantity =
                      parseFloat(x.quantity.toString()) *
                      (x.item_unit == null
                        ? 1
                        : parseFloat(x.item_unit!.conversion.toString()));
                    return {
                      item_id: x.item_id,
                      quantity: quantity.toFixed(4),
                    };
                  })
                )
                  .then(() => {
                    return res.status(201).send(result);
                  })
                  .catch(() => {
                    return res.status(201).send(result);
                  });
              } else {
                return res.status(201).send(result);
              }
            });

            return res.status(201).send(result);
          } else {
            return res.status(404).send(ErrorList["Not found"]);
          }
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } catch (err) {
      return res.status(500).send(ErrorList["Unknown error"]);
    }
  };

  // static createPrintoutDraft = (req: Request, res: Response) => {
  //   try {
  //     const items = req.body as any[];
  //     ItemModel.fetchByItemUnitIds(
  //       items.map((x) => {
  //         return {
  //           item_id: x.id,
  //           item_unit_id: x.item_unit_id,
  //         };
  //       })
  //     ).then((result) => {
  //       return res.status(200).send(result);
  //     });
  //   } catch (err: unknown) {
  //     if (err instanceof Error) {
  //       return res.status(500).send(err);
  //     } else {
  //       return res.status(500).send(ErrorList["Unknown error"]);
  //     }
  //   }
  // };

  // static createPrintout = (req: Request, res: Response) => {
  //   try {
  //     var formatter = new Intl.NumberFormat("en-US", {
  //       style: "currency",
  //       currency: "IDR",
  //     });

  //     var numberFormatter = new Intl.NumberFormat();
  //     const bill_table: any[] = [];

  //     let i = 0;
  //     let totalBill = 0;
  //     let blackLinesIndex: string[] = [];
  //     let greyLinesIndex: string[] = [];

  //     (req.body.items as any[]).forEach((x) => {
  //       if (i != 0) {
  //         greyLinesIndex.push(i.toString());
  //       }
  //       bill_table.push([
  //         {
  //           stack: [
  //             {
  //               text: x.reference,
  //               bold: true,
  //               fontSize: 10,
  //               alignment: "left" as Alignment,
  //             },
  //             {
  //               text: x.description,
  //               bold: false,
  //               fontSize: 12,
  //               alignment: "left" as Alignment,
  //               margins: [0, 0, 0, 10] as Margins,
  //             },
  //           ],
  //         },
  //         {},
  //       ]);

  //       i++;
  //       blackLinesIndex.push(i.toString());

  //       (x.quantity as any[]).forEach((item) => {
  //         const price = parseFloat(item.price);
  //         const quantity = item.quantity;
  //         const unit = item.unit;
  //         const total = quantity * price;

  //         bill_table.push([
  //           {
  //             text: `${numberFormatter.format(
  //               quantity
  //             )} ${unit} x ${formatter.format(price)}`,
  //           },
  //           {
  //             text: formatter.format(total),
  //           },
  //         ]);

  //         totalBill += total;
  //         i++;
  //       });
  //     });

  //     blackLinesIndex.push(i.toString());

  //     bill_table.push([
  //       {
  //         text: "Total",
  //         bold: true,
  //         fontSize: 12,
  //       },
  //       {
  //         text: formatter.format(totalBill),
  //       },
  //     ]);

  //     const fontDescriptors = {
  //       Roboto: {
  //         normal: path.join(
  //           __dirname,
  //           "..",
  //           "assets",
  //           "/fonts/Cairo-Regular.ttf"
  //         ),
  //         bold: path.join(__dirname, "..", "assets", "/fonts/Cairo-Medium.ttf"),
  //         italics: path.join(
  //           __dirname,
  //           "..",
  //           "assets",
  //           "/fonts/Cairo-Italic.ttf"
  //         ),
  //         bolditalics: path.join(
  //           __dirname,
  //           "..",
  //           "assets",
  //           "/fonts/Cairo-MediumItalic.ttf"
  //         ),
  //       },
  //     };

  //     let documentDefinition = {
  //       pageSize: req.body.size as PageSize,
  //       pageOrientation: "portrait" as PageOrientation,
  //       content: [
  //         {
  //           layout: {
  //             hLineColor: function (i, node) {
  //               return blackLinesIndex.includes(i.toString()) ||
  //                 i == node.table.body.length ||
  //                 i == 0
  //                 ? "black"
  //                 : "grey";
  //             },
  //             hLineWidth: function (i, node) {
  //               return blackLinesIndex.includes(i.toString()) || i == 0 ? 1 : 0;
  //             },
  //             vLineWidth: function (i, node) {
  //               return 0;
  //             },
  //           } as TableLayout,
  //           table: {
  //             headerRows: 0,
  //             widths: ["*", "auto"],
  //             body: bill_table,
  //           },
  //           margin: [0, 0, 0, 15] as Margins,
  //         },
  //         {
  //           text: "Price mentioned above does not include a discount. Discount value can be checked on register.",
  //           bold: true,
  //           color: "grey",
  //           fontSize: 10,
  //           alignment: "left" as Alignment,
  //           margin: [0, 0, 0, 5] as Margins,
  //         },
  //       ],
  //     };

  //     const printer = new PdfPrinter(fontDescriptors);
  //     const pdfDocument = printer.createPdfKitDocument(documentDefinition);

  //     let chunks: any[] = [];
  //     var pdfResult;

  //     pdfDocument.on("data", function (chunk: any) {
  //       chunks.push(chunk);
  //     });

  //     pdfDocument.on("end", function () {
  //       pdfResult = Buffer.concat(chunks);
  //       return res.status(200).send({
  //         data: `data:application/pdf;base64,${pdfResult.toString("base64")}`,
  //       });
  //     });

  //     pdfDocument.end();
  //   } catch (err: unknown) {
  //     if (err instanceof Error) {
  //       return res.status(500).send(err);
  //     } else {
  //       return res.status(500).send(ErrorList["Unknown error"]);
  //     }
  //   }
  // };

  static fetchCodeById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillModel.fetchById(id)
      .then((result) => {
        return res.status(200).send(result?.bill_code);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static search = (req: Request, res: Response) => {
    const customers = req.body.customers as number[];
    const items = req.body.items as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;
    // status 0 => active
    // status 1 => deleted
    // status 2 => all

    const formattedDate_1 =
      date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(
            new Date(date[0]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 =
      date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(
            new Date(date[1]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    BillCodeModel.search(
      customers,
      items,
      [formattedDate_1, formattedDate_2],
      mysql_real_escape_string(keyword),
      page,
      status
    )
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1][0].count,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      BillCodeModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      BillCodeModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = x.count;
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month != undefined) {
      const year = parseInt(req.query.year.toString());
      const month = parseInt(req.query.month.toString());
      const page =
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());

      BillCodeModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                customer: {
                  id: x.customer_id,
                  name: x.customer_name,
                },
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : result[1][0].count,
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };
}

export default SalesInvoiceController;
