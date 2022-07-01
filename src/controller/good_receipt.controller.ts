import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../app";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import PurchaseDocumentModel from "../model/purchase_document.model";
import SupplierModel from "../model/supplier.model";

class GoodReceiptController {
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = (req.body.purchase_invoice as any[])[0];
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;

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
            const prices: number[] = [];
            const transactions: any[] = [];
            for (let i = 0; i < good_receipt_items.length; i++) {
              transactions.push(
                ItemPurchasePriceModel.getByItemId(
                  good_receipt_items[i].item_id
                )
              );
            }

            const transaction = new QueryTransactionHelper();
            transaction.create(transactions).then((result) => {
              result.forEach((item, index) => {
                const price = item == null ? 0 : item.price;
                prices[index] = price;
              });

              const good_receipt_items_input: any[] = [];
              for (let idx = 0; idx < good_receipt_items.length; idx++) {
                good_receipt_items_input.push({
                  item_id: good_receipt_items[idx].item_id,
                  quantity: good_receipt_items[idx].quantity,
                  good_receipt_code_id: good_receipt_result.id,
                  price: prices[idx],
                });
              }

              const insert_item = GoodReceiptModel.insertItems(
                good_receipt_items_input
              );
              const purchase_document = new PurchaseDocumentModel(
                purchase_invoice_name,
                date,
                discount,
                good_receipt_result.id,
                req.body.userId
              );
              const insert_purchase_document = purchase_document.create();

              transaction
                .create([insert_item, insert_purchase_document])
                .then((insert_transaction) => {
                  const socket = new SocketHelper("createGoodReceipt", {
                    supplier_id: insert_transaction[0].supplier_id,
                    company_id: insert_transaction[0].company_id,
                  });
                  socket.create();

                  return res.status(201).send({
                    ...good_receipt_result,
                    good_receipt: insert_transaction[0],
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
      const archive_years = GoodReceiptModel.fetchArchiveYears();
      const count_archive_years = GoodReceiptModel.countArchiveByYear();

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

      const transaction = new QueryTransactionHelper();
      transaction
        .create([
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
}

export default GoodReceiptController;
