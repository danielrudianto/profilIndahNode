import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
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
        return res.status(200).send(result);
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
              });
            }

            const insert_item = GoodReceiptModel.insertItems(
              good_receipt_items_input
            );

            const delete_item = GoodReceiptModel.deleteItemsByGoodReceiptCodeId(
              good_receipt_result.id
            );

            const purchase_document = new PurchaseDocumentModel(
              purchase_invoice_name,
              date,
              discount,
              good_receipt_result.id,
              req.body.userId,
              good_receipt_result.purchase_invoice[0].id
            );

            const update_purchase_document = purchase_document.update();

            const transaction = new QueryTransactionHelper();
            transaction
              .create([update_purchase_document, delete_item])
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
  };

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

              const insert_item = GoodReceiptModel.insertItems(
                good_receipt_items_input
              );

              const save_price = ItemPurchasePriceModel.insertItems(
                good_receipt_items_price
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
                .create([...save_price, insert_item, insert_purchase_document])
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
            console.log(error);
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default PurchaseDocumentController;
