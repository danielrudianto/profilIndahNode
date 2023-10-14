import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import ProductStockModel from "../model/product-stock.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import SupplierModel from "../model/supplier.model";

class PurchaseInvoiceController {
  /**
   * Create a new purchase invoice
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur =
      !purchase_invoice.faktur || purchase_invoice.faktur?.length < 16
        ? null
        : purchase_invoice.faktur;
    const userID = req.body.userId;

    PurchaseInvoiceModel.create({
      name: name,
      date: date,
      supplier_id: supplier_id,
      company_id: company_id,
      created_by: userID,
      purchase_invoice: {
        date: date,
        name: purchase_invoice_name,
        faktur: faktur,
        discount: discount,
        created_by: userID,
      },
      good_receipt: good_receipt_items.map((x) => {
        return {
          item_id: x.item_id,
          item_unit_id: x.item_unit_id,
          quantity: x.quantity,
          price: x.price,
          discount: x.discount,
        };
      }),
      purchase_invoice_name: purchase_invoice_name,
    })
      .then((good_receipt_result) => {
        const delete_price = [];
        const insert_price: Promise<any>[] = [];
        for (let idx = 0; idx < good_receipt_items.length; idx++) {
          if (good_receipt_items[idx].save == true) {
            delete_price.push(
              ItemPurchasePriceModel.deleteByID(
                good_receipt_items[idx].item_id,
                good_receipt_items[idx].item_unit_id,
                req.body.userId
              )
            );
          }
        }
        Promise.all([delete_price, insert_price])
          .then(async () => {
            const socket = new SocketHelper("createGoodReceipt", {
              supplier_id: good_receipt_result.supplier_id,
              company_id: good_receipt_result.company_id,
            });
            socket.create();

            Promise.all([
              ProductStockModel.updateStock(
                good_receipt_result.good_receipt.map((x) => {
                  return {
                    item_id: x.item.id,
                    quantity:
                      parseFloat(x.quantity.toString()) *
                      (x.item_unit == null
                        ? 1
                        : parseFloat(x.item_unit.conversion.toString())),
                  };
                })
              ),
              queue.add("create-purchase-invoice", good_receipt_result),
            ])
              .then(() => {
                return res.status(201).send(good_receipt_result);
              })
              .catch((error) => {
                console.error(`[error]: Error on updating stock ${error}`);
                return res.status(500).send(ErrorList["Internal server error"]);
              });
          })
          .catch((error) => {
            console.error(`[error]: Error on updating price ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on creating purchase invoice ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch purchase invoice by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PurchaseInvoiceModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        let subTotal = 0;
        for (let item of result.good_receipt_code.good_receipt) {
          subTotal +=
            parseFloat(item.price.toString()) *
            parseFloat(item.quantity.toString());
        }
        return res.status(200).send({
          ...result,
          subTotal: subTotal,
          total:
            subTotal -
            (result.discount == null
              ? 0
              : parseFloat(result.discount.toString())),
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Update purchase invoice
   * @param req
   * @param res
   */
  static update = (req: Request, res: Response) => {
    // const id = req.body.id;
    // PurchaseInvoiceModel.fetchById(id).then((purchase_invoice) => {
    //   if (!purchase_invoice || purchase_invoice.is_delete) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   const date = new Date(req.body.date);
    //   const name = req.body.name;
    //   const company_id = req.body.company_id;
    //   const supplier_id = req.body.supplier_id;
    //   const good_receipt_items = req.body.good_receipt as any[];
    //   const purchase_invoice = req.body.purchase_invoice as any;
    //   const discount = purchase_invoice.discount;
    //   const purchase_invoice_name = purchase_invoice.name;
    //   const faktur =
    //     !purchase_invoice.faktur || purchase_invoice.faktur?.length < 16
    //       ? null
    //       : purchase_invoice.faktur;
    //   const userID = req.body.userId;
    //   Promise.all([
    //     CompanyModel.fetchById(company_id),
    //     SupplierModel.fetchById(supplier_id),
    //   ])
    //     .then((validation) => {
    //       if (
    //         validation[0] == null ||
    //         validation[1] == null ||
    //         validation[0].length == 0 ||
    //         validation[1].length == 0 ||
    //         validation[0][0].is_delete ||
    //         validation[1][0].is_delete
    //       ) {
    //         return res.status(400).send(ErrorList["Not found"]);
    //       } else {
    //         GoodReceiptModel.fetchById(purchase_invoice.good_receipt_code_id)
    //           .then((document) => {
    //             if (document == null) {
    //               return res.status(404).send(ErrorList["Not found"]);
    //             } else {
    //               const good_receipt_code = new GoodReceiptModel(
    //                 name,
    //                 date,
    //                 userID,
    //                 supplier_id,
    //                 company_id,
    //                 purchase_invoice.good_receipt_code_id
    //               );
    //               good_receipt_code.update().then((good_receipt_result) => {
    //                 const good_receipt = [];
    //                 for (let idx = 0; idx < good_receipt_items.length; idx++) {
    //                   good_receipt.push({
    //                     item_id: good_receipt_items[idx].item_id,
    //                     quantity: good_receipt_items[idx].quantity,
    //                     good_receipt_code_id: good_receipt_result.id,
    //                     price: good_receipt_items[idx].price,
    //                     item_unit_id: good_receipt_items[idx].item_unit_id,
    //                   });
    //                 }
    //                 const purchase_document = new PurchaseInvoiceModel(
    //                   purchase_invoice_name,
    //                   faktur,
    //                   date,
    //                   discount,
    //                   good_receipt_result.id,
    //                   req.body.userId,
    //                   req.body.userId
    //                 );
    //                 Promise.all([
    //                   ProductStockModel.updateStock(
    //                     document.good_receipt.map((x) => {
    //                       const quantity =
    //                         parseFloat(x.quantity.toString()) *
    //                         (x.item_unit == null
    //                           ? 1
    //                           : parseFloat(x.item_unit.conversion.toString())) *
    //                         -1;
    //                       return {
    //                         item_id: x.item.id,
    //                         quantity: quantity,
    //                       };
    //                     })
    //                   ),
    //                   GoodReceiptModel.deleteItemsByGoodReceiptCodeId(
    //                     purchase_invoice.good_receipt_code_id
    //                   ),
    //                   GoodReceiptModel.insertItems(good_receipt),
    //                   purchase_document.update(),
    //                 ])
    //                   .then(() => {
    //                     GoodReceiptModel.fetchById(
    //                       purchase_invoice.good_receipt_code_id
    //                     )
    //                       .then((document) => {
    //                         if (document == null) {
    //                           return res
    //                             .status(400)
    //                             .send(ErrorList["Not found"]);
    //                         } else {
    //                           ProductStockModel.updateStock(
    //                             document?.good_receipt.map((x) => {
    //                               const quantity =
    //                                 parseFloat(x.quantity.toString()) *
    //                                 (x.item_unit == null
    //                                   ? 1
    //                                   : parseFloat(
    //                                       x.item_unit.conversion.toString()
    //                                     ));
    //                               return {
    //                                 item_id: x.item.id,
    //                                 quantity: quantity,
    //                               };
    //                             })
    //                           ).then(() => {
    //                             return res.status(201).send(purchase_invoice);
    //                           });
    //                         }
    //                       })
    //                       .catch(() => {
    //                         return res.status(201).send(purchase_invoice);
    //                       });
    //                   })
    //                   .catch((error) => {
    //                     return res.status(500).send(error);
    //                   });
    //               });
    //             }
    //           })
    //           .catch(() => {
    //             return res.status(404).send(ErrorList["Not found"]);
    //           });
    //       }
    //     })
    //     .catch((error) => {
    //       return res.status(500).send(error);
    //     });
    // });
    throw new Error("Method not implemented.");
  };

  static fetchUnconfirmed = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PurchaseInvoiceModel.fetchUnconfirmed(offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static updateStatus = async (req: Request, res: Response) => {
    const id = req.body.id;
    const is_confirm = req.body.is_confirm;
    const is_delete = req.body.is_delete;
    const userID = req.body.userId;

    const purchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
    if (!purchaseInvoice) {
      return res.status(404).send(ErrorList["Invoice not found"]);
    }

    if (purchaseInvoice.is_confirm) {
      return res.status(400).send(ErrorList["Invoice already confirmed"]);
    }

    if (purchaseInvoice.is_delete) {
      return res.status(400).send(ErrorList["Invoice already deleted"]);
    }

    const goodReceipt = (await GoodReceiptModel.fetchByID(id)) as any;
    if (!goodReceipt) {
      return res.status(404).send(ErrorList["Good receipt not found"]);
    }

    if (is_confirm) {
      const discount = req.body.discount;
      const good_receipt = req.body.good_receipt as any[];
      const good_receipt_name = req.body.good_receipt_name;
      const purchase_invoice_name = req.body.name;
      const date = new Date(req.body.date);

      if (goodReceipt.purchase_invoice == null) {
        return res.status(404).send(ErrorList["Purchase invoice not found"]);
      }

      if (goodReceipt.purchase_invoice.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Purchase invoice already confirmed"]);
      }

      if (goodReceipt.purchase_invoice.is_delete) {
        return res
          .status(400)
          .send(ErrorList["Purchase invoice already deleted"]);
      }

      PurchaseInvoiceModel.confirmByID({
        id: id,
        discount: discount,
        good_receipt: good_receipt.map((x) => {
          return {
            id: x.id,
            price: x.price,
          };
        }),
        good_receipt_name: good_receipt_name,
        purchase_invoice_name: purchase_invoice_name,
        date: date,
        confirmed_by: userID,
      }).then(async (updatePurchaseInvoiceResult) => {
        const socket = new SocketHelper(
          "updatePurchaseDocumentStatus",
          updatePurchaseInvoiceResult[0]
        );
        socket.create();

        await queue.add("confirm-purchase-invoice", {
          good_receipt_name: good_receipt_name,
          purchase_invoice_name: purchase_invoice_name,
          discount: discount,
          good_receipt:
            updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt,
        });

        if (good_receipt.filter((x) => x.save).length > 0) {
          // Search for saved items
          // const filtered_good_receipt = good_receipt.filter((x) => x.save);
          // ItemPurchasePriceModel.update(filtered_good_receipt).then(() => {
          //   return res.status(200).send(updatePurchaseInvoiceResult[0]);
          // }
        } else {
        }
      });
    } else if (is_delete) {
      const deletedPurchaseInvoice = await PurchaseInvoiceModel.deleteByID(
        id,
        userID
      );

      if (!goodReceipt) {
        return res.status(404).send(ErrorList["Good receipt not found"]);
      }

      Promise.all([
        ProductStockModel.updateStock(
          ((goodReceipt as any).good_receipt as any[]).map((x) => {
            return {
              item_id: x.item.id,
              quantity:
                parseFloat(x.quantity.toString()) *
                -1 *
                (x.item_unit == null
                  ? 1
                  : parseFloat(x.item_unit.conversion.toString())),
            };
          })
        ),
        queue.add("delete-purchase-invoice", goodReceipt),
      ]).then(() => {
        const socket = new SocketHelper(
          "updatePurchaseDocumentStatus",
          deletedPurchaseInvoice[0]
        );
        socket.create();

        return res.status(200).send(deletedPurchaseInvoice[0]);
      });
    }
  };

  static fetchArchive = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      PurchaseInvoiceModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                count: parseInt(x.count.toString()),
              };
            })
          );
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      PurchaseInvoiceModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
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

      PurchaseInvoiceModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                supplier: {
                  id: x.supplier_id,
                  name: x.supplier_name,
                },
                company: {
                  id: x.company_id,
                  name: x.company_name,
                },
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString()),
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static searchArchive = (req: Request, res: Response) => {
    const suppliers = req.body.suppliers as number[];
    const items = req.body.items as number[];
    const companies = req.body.companies as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;

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
    PurchaseInvoiceModel.search(
      suppliers,
      companies,
      items,
      [formattedDate_1, formattedDate_2],
      mysql_real_escape_string(keyword),
      page,
      status
    )
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: parseInt(result[1][0].count.toString()),
        });
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
      });
  };
}

export default PurchaseInvoiceController;
