import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import { BrandModel } from "../model/brand.model";
import GoodReceiptModel from "../model/good_receipt.model";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";

class ItemController {
  static create = (req: Request, res: Response) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;
    const user_id = req.body.userId;

    BrandModel.getByName(brand_name)
      .then((brand) => {
        if (brand == null || brand.is_delete) {
          return res.status(404).send("Merek tidak ditemukan.");
        }

        ItemModel.fetchByReference(reference)
          .then((itemCheck) => {
            // There is an item exist with the same reference
            if (itemCheck != null) {
              return res.status(500).send("Referensi tidak unik.");
            }

            const item: ItemModel = new ItemModel(
              reference,
              description,
              minimum_stock,
              brand.id,
              user_id
            );

            item
              .create()
              .then((result) => {
                const item_price = new ItemPriceModel(req.body.price, req.body.discount, req.body.discount_project, result.id, req.body.userId);
                const item_purchase_price = new ItemPurchasePriceModel(req.body.purchase_price, result.id, req.body.userId);
                const transaction = new QueryTransactionHelper();
                transaction.create([item_price.create(), item_purchase_price.create(), ItemModel.count()]).then(result => {
                  const item_object = {
                    ...result,
                    item_price: [result[0]],
                    item_price_purchase: [result[1]]
                  }

                  const socket = new SocketHelper("createItem", {
                    data: item_object,
                    count: result[2]
                  });
                  socket.create();
                  return res.status(201).send(result);
                })
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

  static delete = (req: Request, res: Response) => {
    const reference = req.params.itemReference;
    const validation = ItemModel.checkDeleteByReference(reference);

    ItemModel.fetchByReference(reference).then(item => {
      if (item == null || item.is_delete) {
        return res.status(404).send("Barang tidak ditemukan.");
      }

      if (validation) {
        const count = ItemModel.delete(item!.id, req.body.userId);
        const socket = new SocketHelper("deleteItem", {
          id: item.id,
          reference: item.reference,
          count: count
        });
        socket.create();

        return res.status(201).send("Hapus barang berhasil.");
      } else {
        return res.status(500).send("Penghapusan data barang tidak diijinkan.");
      }
    })
  }

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;

    BrandModel.getByName(brand_name).then(brand => {
      if(brand == null || brand.is_delete){
        return res.status(404).send("Merek tidak ditemukan.");
      } else {
        ItemModel.fetchById(id, new Date()).then(item => {
          if(item == null || item.is_delete){
            return res.status(404).send("Barang tidak ditemukan.");
          } else {
            const item_model = new ItemModel(reference, description, minimum_stock, brand!.id, req.body.userId, id);
            item_model.update().then(result => {
              return res.status(200).send(result)
            }).catch(error => {
              return res.status(500).send(error);
            })
          }
        })
      }
    }).catch(error => {
      return res.status(500).send(error);
    });
  }

  static fetch = (req: Request, res: Response) => {
    const page: number = (!req.query.page) ? 1 : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();

    const date = new Date();
    date.setDate((new Date()).getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemModel.fetch(keyword, date, offset, limit).then(result => {
      return res.status(200).send({
        data: result[0],
        count: result[1]
      })
    }).catch(error => {
      return res.status(500).send(error);
    })
  }
  
  static fetchByReference = (req: Request, res: Response) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    const item = ItemModel.fetchByReference(reference);
    const good_receipt_count = GoodReceiptModel.countItemByReference(reference);
    const bill_code = BillModel.countItemByReference(reference);

    const transaction = new QueryTransactionHelper();
    transaction.create([
      item,
      good_receipt_count,
      bill_code
    ]).then(result => {
      res.status(200).send({
        ...result[0],
        can_delete: (result[1] + result[2] == 0) ? true : false
      });
    }).catch(error => {
      res.status(500).send(error);
    })
  }
}

export default ItemController;
