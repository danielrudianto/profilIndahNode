import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../app";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";

class ItemPriceController {
  static create = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const discount = req.body.discount;
    const discount_project = req.body.discount_project;
    const price = req.body.price;

    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);

    const item_price = new ItemPriceModel(
      price,
      discount,
      discount_project,
      item_id,
      req.body.userId
    );
    const item_price_create = item_price.create();
    const item_price_delete = ItemPriceModel.deleteById(
      item_id,
      req.body.userId
    );

    const transaction = new QueryTransactionHelper();
    transaction
      .create([item_price_create, item_price_delete])
      .then((result) => {
        ItemModel.fetchById(result[1].item_id, date)
          .then((item) => {
            LogHelper.log(
              new Date(),
              "info",
              `${result[0].user.name} added sales item price for item ${result[0].item.reference} (ID: ${result[0].item.id}) with the price ${result[0].price} and discount (${result[0].discount} / ${result[0].discount_project}`,
              "Item Price - Create",
              req.body.userId
            );

            io.emit("updatePrice", item);
            return res.status(200).send(result[1]);
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Item Price - Create",
              req.body.userId
            );

            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Item Price - Create",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static createBulk = (req: Request, res: Response) => {
    const effective_date = new Date(req.body.effective_date);
    const items = req.body.items as any[];
    const references: string[] = [];
    let count: number = 0;
    const price_object: any[] = [];

    items.forEach((x) => {
      const reference = x.reference;
      const price = x.price;
      const discount = x.discount;
      const discount_project = x.discount_project;

      references.push(reference);
      price_object[count] = {
        price: parseFloat(price),
        discount: parseFloat(discount),
        discount_project: parseFloat(discount_project),
      };
      count++;
    });

    ItemModel.fetchByReferences(references).then((items) => {
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
          const item_price = new ItemPriceModel(
            price_object[index].price,
            price_object[index].discount,
            price_object[index].discount_project,
            items.filter((x) => x.reference == reference)[0].id,
            req.body.userId,
            effective_date
          );
          transactions.push(item_price.create());
        });

        const transaction = new QueryTransactionHelper();
        ItemPriceModel.deleteByIds(item_ids, req.body.userId)
          .then(() => {
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
    });
  };

  static fetchAll = (req: Request, res: Response) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    const result: any[] = [];

    ItemModel.fetchAll(date)
      .then((items) => {
        items.forEach((item) => {
          result.push({
            reference: item.reference,
            description: item.description,
            item_brand: item.item_brand,
            item_price: item.item_price,
          });
        });

        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

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

    ItemPriceModel.fetch(keyword, date, offset, limit)
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

  static fetchByReference = (req: Request, res: Response) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemPriceModel.fetchByReference(reference, date)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ItemPriceController;
