import { Request, Response } from "express";
import { validationResult } from "express-validator";
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
    const faktur =
      !purchase_invoice.faktur || purchase_invoice.faktur.length < 16
        ? null
        : purchase_invoice.faktur;

    Promise.all([
      CompanyModel.fetchById(company_id),
      SupplierModel.fetchById(supplier_id),
    ])
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
    const faktur =
      !purchase_invoice.faktur || purchase_invoice.faktur?.length < 16
        ? null
        : purchase_invoice.faktur;

    Promise.all([
      CompanyModel.fetchById(company_id),
      SupplierModel.fetchById(supplier_id),
    ])
      .then((validation) => {
        if (
          validation[0] == null ||
          validation[1] == null ||
          validation[0].is_delete ||
          validation[1].is_delete
        ) {
          return res.status(500).send("Perusahaan / supplier tidak ditemukan.");
        }

        const good_receipt_code = new GoodReceiptModel(
          name,
          date,
          req.body.userId,
          supplier_id,
          company_id
        );

        good_receipt_code.create().then((good_receipt_result) => {
          const good_receipt = [];
          const good_receipt_price = [];
          for (let idx = 0; idx < good_receipt_items.length; idx++) {
            good_receipt.push({
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
                req.body.userId,
                good_receipt_items[idx].item_unit_id
              );

              good_receipt_price.push(purchase_price);
            }
          }

          const purchase_document = new PurchaseDocumentModel(
            purchase_invoice_name,
            faktur,
            date,
            discount,
            good_receipt_result.id,
            req.body.userId,
            req.body.userId
          );

          Promise.all([
            GoodReceiptModel.insertItems(good_receipt),
            ItemPurchasePriceModel.insertItems(good_receipt_price),
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
              return res.status(500).send(error);
            });
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
    const good_receipt_name = req.body.good_receipt_name;
    const purchase_invoice_name = req.body.name;
    const date = new Date(req.body.date);

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
            purchase_invoice_name,
            good_receipt_name,
            date,
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

              if (good_receipt.filter((x) => x.save).length > 0) {
                const filtered_good_receipt = good_receipt.filter(
                  (x) => x.save
                );

                GoodReceiptModel.fetchByIds(
                  filtered_good_receipt.map((y) => {
                    return y.id;
                  })
                )
                  .then((good_receipts) => {
                    const transactions = [];
                    const good_receipt_input: any[] = [];

                    for (let good_receipt_item of good_receipts) {
                      const priceIndex = filtered_good_receipt.findIndex(
                        (idx) => idx.id == good_receipt_item.id
                      );
                      if (priceIndex != -1) {
                        const price = filtered_good_receipt[priceIndex].price;
                        const itemPurchasePrice = new ItemPurchasePriceModel(
                          price,
                          good_receipt_item.item_id,
                          req.body.userId,
                          good_receipt_item.item_unit_id
                        );
                        good_receipt_input.push(itemPurchasePrice);
                      }
                    }

                    ItemPurchasePriceModel.insertItems(good_receipt_input)
                      .then(() => {
                        return res.status(200).send(result[0]);
                      })
                      .catch((error) => {
                        return res.status(500).send(error);
                      });
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res.status(200).send(result[0]);
              }
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
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id);
    PurchaseDocumentModel.fetchById(id).then((good_receipt_code) => {
      if (
        good_receipt_code == null ||
        good_receipt_code.purchase_invoice == null
      ) {
        return res.status(404).send("Pembelian tidak ditemukan.");
      } else if (good_receipt_code.purchase_invoice.is_delete) {
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

  static fetchArchive = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!req.params.year && !req.params.month) {
      Promise.all([
        PurchaseDocumentModel.fetchArchiveYears(),
        PurchaseDocumentModel.countArchiveByYear(),
      ])
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
      PurchaseDocumentModel.countArchiveByMonth(year)
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

      Promise.all([
        PurchaseDocumentModel.fetchArchive(year, month, offset, limit),
        PurchaseDocumentModel.countArchive(year, month),
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

  static searchArchive = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());

    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const offset = (page - 1) * 10;
    const start = !req.query.start ? null : req.query.start.toString();
    const end = !req.query.end ? null : req.query.end.toString();

    Promise.all([
      PurchaseDocumentModel.searchArchives(keyword, start, end, offset),
      PurchaseDocumentModel.searchCountArchives(keyword, start, end),
    ])
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
      });
  };
}

export default PurchaseDocumentController;
