import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
import { io } from "../app";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import PurchaseDocumentModel from "../model/purchase_document.model";
import SupplierModel from "../model/supplier.model";
import ErrorList from "../assets/error_list";

class GoodReceiptController {
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    console.log(date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;

    Promise.all([
      CompanyModel.fetchById(company_id),
      SupplierModel.fetchById(supplier_id),
    ])
      .then((validation) => {
        if (
          !validation[0] ||
          !validation[1] ||
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
            const item_ids: number[] = [];
            for (let i = 0; i < good_receipt_items.length; i++) {
              item_ids.push(good_receipt_items[i].item_id);
            }

            ItemPurchasePriceModel.fetchByItemIds(item_ids)
              .then((result) => {
                const good_receipt_items_input: any[] = [];
                for (let idx = 0; idx < good_receipt_items.length; idx++) {
                  const price =
                    result.filter(
                      (x) => x.item_id == good_receipt_items[idx].item_id
                    ).length == 0
                      ? 0
                      : result.filter(
                          (x) => x.item_id == good_receipt_items[idx].item_id
                        )[0].price;

                  good_receipt_items_input.push({
                    item_id: good_receipt_items[idx].item_id,
                    item_unit_id: good_receipt_items[idx].item_unit_id,
                    quantity: good_receipt_items[idx].quantity,
                    good_receipt_code_id: good_receipt_result.id,
                    price: price,
                  });
                }

                const insert_item = GoodReceiptModel.insertItems(
                  good_receipt_items_input
                );
                const purchase_document = new PurchaseDocumentModel(
                  purchase_invoice_name,
                  null,
                  date,
                  discount,
                  good_receipt_result.id,
                  req.body.userId
                );
                const insert_purchase_document = purchase_document.create();

                Promise.all([insert_item, insert_purchase_document])
                  .then((insert_transaction) => {
                    LogHelper.log(
                      good_receipt_result.created_at,
                      "info",
                      `${good_receipt_result.user_good_receipt_code_created_byTouser.name} berhasil menambahkan penerimaan barang (ID: ${good_receipt_result.id}) dari ${good_receipt_result.supplier.name} (ID: ${good_receipt_result.id}) untuk perusahaan ${good_receipt_result.company.name} (ID: ${good_receipt_result.company.id})`,
                      "Good Receipt controller - Create",
                      good_receipt_result.created_by
                    );

                    const socket = new SocketHelper("createGoodReceipt", {
                      supplier_id:
                        insert_transaction[1].good_receipt_code.supplier_id,
                      company_id:
                        insert_transaction[1].good_receipt_code.company_id,
                    });
                    socket.create();

                    return res.status(201).send({
                      ...good_receipt_result,
                      good_receipt: insert_transaction[0],
                      purchase_invoice: insert_transaction[1],
                    });
                  })
                  .catch((error) => {
                    LogHelper.log(
                      new Date(),
                      "error",
                      error,
                      "Good Receipt - Create",
                      req.body.userId
                    );

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

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    GoodReceiptModel.fetchById(id)
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
      Promise.all([
        GoodReceiptModel.fetchArchiveYears(),
        GoodReceiptModel.countArchiveByYear(),
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
      GoodReceiptModel.countArchiveByMonth(year)
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
        GoodReceiptModel.fetchArchive(year, month, offset, limit),
        GoodReceiptModel.countArchive(year, month),
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

  static fetchCodeById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id.toString());
      GoodReceiptModel.fetchCodeById(id)
        .then((result) => {
          if (!result) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            return res.status(200).send(result.good_receipt_code);
          }
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
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
      GoodReceiptModel.searchArchives(keyword, start, end, offset),
      GoodReceiptModel.searchCountArchives(keyword, start, end),
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

export default GoodReceiptController;
