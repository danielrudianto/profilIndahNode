import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import PurchaseDocumentModel from "../model/purchase_document.model";
import SupplierModel from "../model/supplier.model";

class PurchaseDocumentController {
  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PurchaseDocumentModel.fetchById(id)
      .then((result) => {
        return res.status(200).send({
          ...result,
          purchase_invoice: result?.purchase_invoice,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = (purchase_invoice.faktur.length < 16) ? null : purchase_invoice.faktur;

    const company_validation = CompanyModel.fetchById(company_id);
    const supplier_validation = SupplierModel.fetchById(supplier_id);
    const transaction_validation = new QueryTransactionHelper();
    transaction_validation
      .create([company_validation, supplier_validation])
      .then((validation) => {
        if (
          validation[0] == null ||
          validation[1] == null ||
          validation[0].is_delete ||
          validation[1].is_delete
        ) {
          return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }

        const good_receipt = new GoodReceiptModel(
          name,
          date,
          req.body.userId,
          supplier_id,
          company_id,
          id
        );

        good_receipt
          .update()
          .then((good_receipt_result) => {
            const good_receipt_items_input: any[] = [];

            for (let idx = 0; idx < good_receipt_items.length; idx++) {
              good_receipt_items_input.push({
                item_id: good_receipt_items[idx].item_id,
                quantity: good_receipt_items[idx].quantity,
                good_receipt_code_id: good_receipt_result.id,
                price: good_receipt_items[idx].price,
                item_unit_id: good_receipt_items[idx].item_unit_id,
              });
            }

            const insert_item = GoodReceiptModel.insertItems(
              good_receipt_items_input
            );

            const delete_item = GoodReceiptModel.deleteItemsByGoodReceiptCodeId(
              good_receipt_result.id
            );

            PurchaseDocumentModel.fetchById(
              good_receipt_result.purchase_invoice?.id!
            )
              .then((purchase_document) => {
                const updated_purchase_document = new PurchaseDocumentModel(
                  purchase_invoice_name,
                  faktur,
                  date,
                  discount,
                  good_receipt_result.id,
                  req.body.userId,
                  purchase_document?.user_good_receipt_code_confirmed_byTouser?.id,
                  good_receipt_result.purchase_invoice?.id
                );

                const update_purchase_document =
                  updated_purchase_document.update();

                Promise.all([update_purchase_document, delete_item])
                  .then(() => {
                    insert_item
                      .then((items) => {
                        return res.status(201).send({
                          ...good_receipt_result,
                          good_receipt: items,
                        });
                      })
                      .catch((error) => {
                        return res.status(500).send(error);
                      });
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              })
              .catch((error) => {
                return res.status(500).send(error);
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

  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = (purchase_invoice.faktur.length < 16) ? null : purchase_invoice.faktur;

    const company_validation = CompanyModel.fetchById(company_id);
    const supplier_validation = SupplierModel.fetchById(supplier_id);
    const transaction_validation = new QueryTransactionHelper();
    transaction_validation
      .create([company_validation, supplier_validation])
      .then((validation) => {
        if (
          validation[0] == null ||
          validation[1] == null ||
          validation[0].is_delete ||
          validation[1].is_delete
        ) {
          return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }

        const good_receipt = new GoodReceiptModel(
          name,
          date,
          req.body.userId,
          supplier_id,
          company_id
        );

        good_receipt
          .create()
          .then((good_receipt_result) => {
            const transactions: any[] = [];
            const transaction = new QueryTransactionHelper();
            transaction.create(transactions).then((result) => {
              const good_receipt_items_input: any[] = [];
              const good_receipt_items_price: any[] = [];

              for (let idx = 0; idx < good_receipt_items.length; idx++) {
                good_receipt_items_input.push({
                  item_id: good_receipt_items[idx].item_id,
                  quantity: good_receipt_items[idx].quantity,
                  good_receipt_code_id: good_receipt_result.id,
                  price: good_receipt_items[idx].price,
                  item_unit_id: good_receipt_items[idx].item_unit_id,
                });

                if (good_receipt_items[idx].save == true) {
                  const purchase_price = new ItemPurchasePriceModel(
                    parseFloat(good_receipt_items[idx].price),
                    good_receipt_items[idx].item_id,
                    req.body.userId
                  );

                  good_receipt_items_price.push(purchase_price);
                }
              }

              const purchase_document = new PurchaseDocumentModel(
                purchase_invoice_name,
                faktur,
                date,
                discount,
                good_receipt_result.id,
                req.body.userId,
                req.body.userId,
              );

              Promise.all([
                GoodReceiptModel.insertItems(good_receipt_items_input),
                ItemPurchasePriceModel.insertItems(good_receipt_items_price),
                purchase_document.create(),
              ])
                .then(() => {
                  const socket = new SocketHelper("createGoodReceipt", {
                    supplier_id: good_receipt_result.supplier_id,
                    company_id: good_receipt_result.company_id,
                  });
                  socket.create();

                  GoodReceiptModel.fetchById(good_receipt_result.id)
                    .then((item) => {
                      return res.status(201).send(item);
                    })
                    .catch((error) => {
                      return res.status(500).send(error);
                    });
                })
                .catch((error) => {
                  LogHelper.log(
                    new Date(),
                    "error",
                    error,
                    "Purchase Document - Create",
                    req.body.userId
                  );
                  return res.status(500).send(error);
                });
            });
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Purchase Document Controller - Create",
              req.body.userId
            );
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchUnconfirmed = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PurchaseDocumentModel.fetchUnconfirmed(offset, limit)
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

  static confirm = (req: Request, res: Response) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt as any[];

    PurchaseDocumentModel.fetchById(id)
      .then((good_receipt_code) => {
        if (
          good_receipt_code == null ||
          good_receipt_code.purchase_invoice == null
        ) {
          return res.status(404).send("Pembelian tidak ditemukan.");
        } else if (
          good_receipt_code.purchase_invoice.is_confirm ||
          good_receipt_code.purchase_invoice.is_delete
        ) {
          return res
            .status(400)
            .send("Pembelian telah dikonfirmasi atau dihapus.");
        } else {
          PurchaseDocumentModel.confirmById(
            id,
            discount,
            good_receipt,
            req.body.userId
          )
            .then((result) => {
              const socket = new SocketHelper(
                "updatePurchaseDocumentStatus",
                result[0]
              );
              socket.create();

              return res.status(200).send(result[0]);
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

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PurchaseDocumentModel.fetchById(id).then((good_receipt_code) => {
      if (
        good_receipt_code == null ||
        good_receipt_code.purchase_invoice == null
      ) {
        return res.status(404).send("Pembelian tidak ditemukan.");
      } else if (
        good_receipt_code.purchase_invoice.is_delete
      ) {
        return res
          .status(400)
          .send("Pembelian telah dikonfirmasi atau dihapus.");
      } else {
        PurchaseDocumentModel.deleteById(id, req.body.userId)
          .then((result) => {
            const socket = new SocketHelper(
              "updatePurchaseDocumentStatus",
              result[0]
            );
            socket.create();

            return res.status(200).send(result[0]);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static confirmUnchanged = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    PurchaseDocumentModel.fetchById(id)
      .then((purchase_document) => {
        if (
          purchase_document == null ||
          purchase_document.purchase_invoice == null ||
          purchase_document.purchase_invoice?.is_delete
        ) {
          return res.status(404).send("Dokumen pembelian tidak ditemukan.");
        } else if (purchase_document.purchase_invoice?.is_confirm) {
          return res.status(404).send("Dokumen sudah dikonfirmasi.");
        } else {
          PurchaseDocumentModel.confirmByIdUnchanged(id, req.body.userId)
            .then((result) => {
              return res.status(200).send(result);
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
}

export default PurchaseDocumentController;
