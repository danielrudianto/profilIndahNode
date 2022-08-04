import { Request, Response } from "express";
import { BrandModel } from "../model/brand.model";
import { ItemModel } from "../model/item.model";

import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import ItemPriceModel from "../model/item_price.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import { validationResult } from "express-validator";
import StockCardHelper from "../helper/stock_card.helper";

class ItemController {
  static create = (req: Request, res: Response) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;
    const user_id = req.body.userId;

    BrandModel.fetchByName(brand_name)
      .then((brand) => {
        if (brand == null || brand.is_delete) {
          return res.status(404).send("Merek tidak ditemukan.");
        }

        ItemModel.fetchByReference(reference)
          .then((itemCheck) => {
            // There is an item exist with the same reference
            if (itemCheck != null) {
              return res.status(400).send("Referensi tidak unik.");
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
                LogHelper.log(
                  new Date(),
                  "info",
                  `${result.user.name} created new item with reference ${result.reference} (ID: ${result.id})`,
                  `Item - Create`,
                  req.body.userId
                );

                const item_price = new ItemPriceModel(
                  req.body.price,
                  req.body.discount,
                  req.body.discount_project,
                  result.id,
                  req.body.userId
                );
                const item_purchase_price = new ItemPurchasePriceModel(
                  req.body.purchase_price,
                  result.id,
                  req.body.userId
                );
                const transaction = new QueryTransactionHelper();
                transaction
                  .create([
                    item_price.create(),
                    item_purchase_price.create(),
                    ItemModel.count(),
                  ])
                  .then((item_price) => {
                    const item_object = {
                      ...result,
                      item_price: [item_price[0]],
                      item_price_purchase: [item_price[1]],
                    };

                    LogHelper.log(
                      new Date(),
                      "info",
                      `${result.user.name} created item sales price for item with reference ${result.reference} (ID: ${result.id})`,
                      `Item - Create`,
                      req.body.userId
                    );

                    LogHelper.log(
                      new Date(),
                      "info",
                      `${result.user.name} created item purchase price for item with reference ${result.reference} (ID: ${result.id})`,
                      `Item - Create`,
                      req.body.userId
                    );

                    const itemSocket = new SocketHelper(
                      "createItem",
                      item_object
                    );
                    itemSocket.create();

                    ItemModel.countByBrandId(brand.id)
                      .then((count_brand) => {
                        const itemSocket = new SocketHelper("createItemBrand", {
                          brand_id: brand.id,
                          can_delete: count_brand == 0 ? true : false,
                        });
                        itemSocket.create();

                        return res.status(201).send(result);
                      })
                      .catch((error) => {
                        LogHelper.log(
                          new Date(),
                          "error",
                          error,
                          `Item - Create`,
                          req.body.userId
                        );
                      });
                  });
              })
              .catch((error) => {
                LogHelper.log(
                  new Date(),
                  "error",
                  `${error}`,
                  `Item - Create`,
                  req.body.userId
                );

                return res.status(500).send(error);
              });
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              `${error}`,
              `Item - Create`,
              req.body.userId
            );

            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          `${error}`,
          `Item - Create`,
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const reference = req.params.itemReference;

    ItemModel.fetchByReference(reference).then((item) => {
      if (item == null || item.is_delete) {
        return res.status(404).send("Barang tidak ditemukan.");
      } else {
        ItemModel.checkDeleteByReference(reference)
          .then((count) => {
            if (count[0] == 0 && count[1] == 0) {
              ItemModel.delete(item!.id, req.body.userId).then(
                (delete_result) => {
                  const socket = new SocketHelper("deleteItem", delete_result);
                  socket.create();

                  LogHelper.log(
                    new Date(),
                    "info",
                    `${delete_result.user.name} deleted item with reference ${delete_result.reference} (ID: ${delete_result.id})`,
                    "Item controller - Delete",
                    req.body.userId
                  );

                  ItemModel.countByBrandId(delete_result.item_brand_id)
                    .then((count_brand) => {
                      const itemSocket = new SocketHelper("deleteItemBrand", {
                        brand_id: delete_result.item_brand_id,
                        can_delete: count_brand == 0 ? true : false,
                      });
                      itemSocket.create();

                      return res.status(201).send(delete_result);
                    })
                    .catch((error) => {
                      LogHelper.log(
                        new Date(),
                        "error",
                        error,
                        `Item - Create`,
                        req.body.userId
                      );
                    });
                }
              );
            } else {
              return res
                .status(400)
                .send("Penghapusan data barang tidak diijinkan.");
            }
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              `Error`,
              `${error}`,
              `Item controller - Delete`,
              req.body.userId
            );
          });
      }
    });
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_name = req.body.brand;
    const minimum_stock = req.body.minimum_stock;

    BrandModel.fetchByName(brand_name)
      .then((brand) => {
        if (brand == null || brand.is_delete) {
          return res.status(400).send("Merek tidak ditemukan.");
        } else {
          ItemModel.fetchById(id, new Date())
            .then((item) => {
              if (item == null || item.is_delete) {
                return res.status(404).send("Barang tidak ditemukan.");
              } else {
                const item_model = new ItemModel(
                  reference,
                  description,
                  minimum_stock,
                  brand!.id,
                  req.body.userId,
                  id
                );
                item_model
                  .update()
                  .then((result) => {
                    LogHelper.log(
                      new Date(),
                      "info",
                      `${result.user_item_updated_byTouser?.name} updated item with reference ${result.reference} (ID: ${result.id})`,
                      `Item - Update`,
                      req.body.userId
                    );

                    const socket = new SocketHelper("updateItem", result);
                    socket.create();

                    return res.status(200).send(result);
                  })
                  .catch((error) => {
                    LogHelper.log(
                      new Date(),
                      "error",
                      `${error}`,
                      `Item - Update`,
                      req.body.userId
                    );

                    return res.status(500).send(error);
                  });
              }
            })
            .catch((error) => {
              LogHelper.log(
                new Date(),
                "error",
                `${error}`,
                `Item - Update`,
                req.body.userId
              );
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();

    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemModel.fetch(keyword, date, offset, limit)
      .then((result) => {
        ItemModel.checkCountByIds(result[0].map((x) => x.id))
          .then((count) => {
            return res.status(200).send({
              data: result[0].map((item) => {
                return {
                  ...item,
                  _count: undefined,
                  can_delete: count[0] + count[1] ? false : true,
                };
              }),
              count: result[1],
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

  static fetchByReference = (req: Request, res: Response) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    ItemModel.fetchByReference(reference)
      .then((item) => {
        if (item == null) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          res.status(200).send({
            ...item,
            _count: undefined,
            can_delete:
              (item?._count.bill || 0) > 0 ||
              (item?._count.good_receipt || 0) > 0
                ? false
                : true,
          });
        }
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  };

  static fetchInsufficient = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const blocked_brand = (req.query.blocked_brands == null || req.query.blocked_brands == "" || req.query.blocked_brands == undefined) ? [] : req.query.blocked_brands.toString().split(",");

    ItemModel.fetchInsufficient(keyword, blocked_brand, offset, limit).then(result => {
      ItemModel.fetchByIds((result[0] as any[]).map(x =>{ return x.id})).then(items => {
        return res.status(200).send({
          data: items,
          count: (result[1] as any[])[0].count
        });
      }).catch(error => {
        LogHelper.log(new Date(), "error", error, "Item Controller - Fetch Insufficient", req.body.userId);
        return res.status(500).send(error);
      })
    }).catch(error => {
      LogHelper.log(new Date(), "error", error, "Item Controller - Fetch Insufficient", req.body.userId);
      return res.status(500).send(error);
    })
  }

  static fetchStock = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }

    const reference = req.query.reference?.toString()!;
    const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ItemModel.fetchByReference(reference).then(item => {
      if(item == null){
        return res.status(404).send("Referensi tidak ditemukan.");
      } else {
        ItemModel.fetchStockById(item.id, offset, limit).then(result => {
          return res.status(200).send({
            data: {
              item: item,
              card: result[0].map((x: any) => {
                return {
                  ...x,
                  quantity: parseFloat(x.quantity.toString()),
                  lead_quantity: parseFloat(x.lead_quantity.toString())
                }
              })
            },
            count: result[1]
          })
        }).catch(error => {
          return res.status(500).send(error);
        })
      }
    })
  }

  static downloadStock = (req: Request, res: Response) => {
    const start = req.body.start;
    const end = req.body.end;
    const format = req.body.format;
    const reference = req.body.reference;

    ItemModel.fetchByReference(reference).then(item => {
      if(item == null){
        return res.status(404).send("Barang tidak ditemukan.");
      } else {
        ItemModel.fetchStockData(item.id, start, end).then(result => {
          switch (format) {
            case "pdf":
              StockCardHelper.createPdf(result as any[])
              break;
            case "csv":
              StockCardHelper.createCsv(result as any[]);
              break;
            default:
              return res.status(405).send("Format tidak ditemukan.");
          }
          return res.status(200).send(result);
        })
      }
    }).catch(error => {
      LogHelper.log(new Date(), "error", error, "Item Controller - Download stock", req.body.userId);
      return res.status(500).send(error);
    })
  }
}

export default ItemController;
