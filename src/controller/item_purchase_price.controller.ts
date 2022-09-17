import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../app";
import { ItemModel } from "../model/item.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import LogHelper from "../helper/log.helper";

class ItemPurchasePriceController {
  static fetchAll = (req: Request, res: Response) => {
    ItemPurchasePriceModel.fetchAll()
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchByReference = (req: Request, res: Response) => {
    const reference = req.params.reference.toString();
    ItemPurchasePriceModel.fetchByReference(reference)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    ItemPurchasePriceModel.fetchById(id).then(result => {
      return res.status(200).send(result);
    }).catch(error => {
      return res.status(500).send(error);
    })
  }

  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemPurchasePriceModel.fetch(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              ...x,
              price:
                x.item_price_purchase.filter((y) => y.item_unit == null)
                  .length == 0
                  ? 0
                  : x.item_price_purchase.filter((x) => x.item_unit == null)[0]
                      .price,
              item_price_purchase: x.item_price_purchase.filter(
                (x) => x.item_unit != null
              ),
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Item purchase price controller - Fetch",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const created_by = req.body.userId;

    const item_purchase_price = new ItemPurchasePriceModel(
      price,
      item_id,
      created_by,
      item_unit_id
    );

    item_purchase_price.update()
      .then(() => {
        ItemPurchasePriceModel.fetchByItemId(item_id)
          .then((item_purchase) => {
            io.emit("updatePurchasingPrice", item_purchase);
            return res.status(201).send(item_purchase);
          })
          .catch((error) => {
            LogHelper.log(new Date(), "error", error, "Item purchase price controller - update", req.body.userId);
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item purchase price controller - update", req.body.userId);
        return res.status(500).send(error);
      });
  };

  static createBulk = (req: Request, res: Response) => {
    const items = req.body.items as any[];
    const references: string[] = [];
    let count: number = 0;
    const price_object: any[] = [];

    items.forEach((x) => {
      const reference = x.reference;
      const price = x.price;

      references.push(reference);
      price_object[count] = {
        price: parseFloat(price),
      };
      count++;
    });

    ItemModel.fetchByReferences(references)
      .then((items) => {
        if (items.length != count) {
          res
            .status(500)
            .send(
              `${
                items.length - count
              } barang tidak terdefinisi. Mohon cek kembali input anda`
            );
        } else {
          const transactions: any[] = [];
          const item_ids: number[] = [];

          references.forEach((reference, index) => {
            item_ids.push(items.filter((x) => x.reference == reference)[0].id);
            const create_item_purchase_price = new ItemPurchasePriceModel(
              price_object[index].price,
              items.filter((x) => x.reference == reference)[0].id,
              req.body.userId
            );
            transactions.push(create_item_purchase_price.create());
          });

          ItemPurchasePriceModel.deleteItems(item_ids, req.body.userId)
            .then(() => {
              const transaction = new QueryTransactionHelper();
              transaction
                .create(transactions)
                .then((result) => {
                  return res.status(201).send(result);
                })
                .catch((error) => {
                  return res.status(500).send(error);
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
}

export default ItemPurchasePriceController;
