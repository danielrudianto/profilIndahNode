import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
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
                  return res.status(201).send({
                    ...good_receipt_result,
                    good_receipt: insert_transaction[0],
                  });
                })
                .catch((error) => {
                  console.log(error);
                  return res.status(500).send(error);
                });
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
    GoodReceiptModel.getById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const year = req.params.year;
    const month = req.params.month;

    if (year == null && month == null) {
      const archive_years = GoodReceiptModel.getArchiveYears();
      const count_archive_years = GoodReceiptModel.getArchiveCountByYear();

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
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }

    if(year != null && month == null){

    }

    if(year != null && month != null){
      
    }
  };
}

export default GoodReceiptController;
