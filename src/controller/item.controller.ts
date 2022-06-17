import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import { BrandModel } from "../model/brand.model";
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

        ItemModel.getByReference(reference)
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

    ItemModel.getByReference(reference).then(item => {
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

  }
}

export default ItemController;
