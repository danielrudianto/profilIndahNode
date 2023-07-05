import { Request, Response } from "express";
import { ItemModel } from "../model/item.model";

import SocketHelper from "../helper/socket.helper";
import ItemPriceModel from "../model/item_price.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import ItemUnitModel from "../model/product-unit.model";
import ErrorList from "../assets/error_list";

import { meili } from "../app";
import { mysql_real_escape_string } from "../helper/escape.helper";
import ProductStockModel from "../model/product-stock.model";

class ProductController {
  static create = (req: Request, res: Response) => {
    try {
      const reference = req.body.reference;
      const description = req.body.description;
      const brand_id = req.body.brand;
      const type_id = req.body.type;
      const minimum_stock = req.body.minimum_stock;
      const userID = req.body.userId;
      const unit = req.body.unit;

      const units = req.body.units as any[];

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
            brand_id,
            type_id,
            userID,
            unit
          );

          item
            .create()
            .then(async (result) => {
              if (units.length == 0) {
                const item_price = new ItemPriceModel(
                  req.body.price,
                  req.body.discount,
                  result.id,
                  null,
                  userID
                );

                const item_purchase_price = new ItemPurchasePriceModel(
                  req.body.purchase_price,
                  result.id,
                  userID,
                  null
                );

                Promise.all([
                  item_price.create(),
                  item_purchase_price.create(),
                  ItemModel.count(),
                  meili.index("item").addDocuments(
                    [
                      {
                        id: result.id,
                        reference: result.reference,
                        description: result.description,
                      },
                    ],
                    {
                      primaryKey: "id",
                    }
                  ),
                  ProductStockModel.createStockData(result.id),
                ])
                  .then((item_price) => {
                    const item_object = {
                      ...result,
                      item_price: item_price[0],
                      item_price_purchase: item_price[1],
                      item_units: [],
                    };

                    const itemSocket = new SocketHelper(
                      "createItem",
                      item_object
                    );
                    itemSocket.create();

                    return res.status(201).send(result);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                const item_units = ItemUnitModel.createMany(
                  units,
                  result.id,
                  userID
                );

                const item_price = new ItemPriceModel(
                  req.body.price,
                  req.body.discount,
                  result.id,
                  null,
                  userID
                );

                const item_purchase_price = new ItemPurchasePriceModel(
                  req.body.purchase_price,
                  result.id,
                  userID,
                  null
                );

                Promise.all([
                  item_price.create(),
                  item_purchase_price.create(),
                  ItemModel.count(),
                  item_units,
                  meili.index("item").addDocuments(
                    [
                      {
                        id: result.id,
                        reference: result.reference,
                        description: result.description,
                      },
                    ],
                    {
                      primaryKey: "id",
                    }
                  ),
                  ProductStockModel.createStockData(result.id),
                ])
                  .then((item_price) => {
                    const item_object = {
                      ...result,
                      item_price: item_price[0],
                      item_price_purchase: item_price[1],
                      item_units: item_price[2],
                    };

                    const itemSocket = new SocketHelper(
                      "createItem",
                      item_object
                    );
                    itemSocket.create();

                    return res.status(201).send(result);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              }
            })
            .catch((error) => {
              console.log(error);
              return res.status(500).send(error);
            });
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

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    ItemModel.fetchById(id)
      .then((item) => {
        if (item == null || item.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else if (item[0].can_delete == 0) {
          return res.status(404).send(ErrorList["Delete error"]);
        } else {
          Promise.all([
            ItemModel.delete(id, userID),
            meili.index("item").deleteDocument(id),
          ])
            .then((result) => {
              const socket = new SocketHelper("deleteItem", result[0]);
              socket.create();
              return res.status(201).send(result[0]);
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

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;
    const userID = req.body.userId;

    ItemModel.fetchById(id).then((result) => {
      if (!result || (result as any[]).length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      } else if ((result as any[])[0].is_delete == 1) {
        return res.status(404).send(ErrorList["Not found"]);
      } else {
        Promise.all([
          ItemModel.update(
            id,
            reference,
            description,
            brand,
            type,
            userID,
            minimum_stock,
            unit
          ),
          meili.index("item").updateDocuments([
            {
              id: id,
              reference: reference,
              description: description,
            },
          ]),
        ]).then((item) => {
          const socket = new SocketHelper("updateItem", item[0]);
          socket.create();
          return res.status(201).send(item);
        });
      }
    });
  };

  static fetch = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(
          mysql_real_escape_string(req.query.keyword.toString())
        );
    const mode = req.query.mode;

    switch (mode) {
      case "purchase":
        ItemModel.fetch(keyword, offset, limit, true, false)
          .then((result) => {
            return res.status(200).send({
              data: (result[1] as any[]).map((x) => {
                const priceIndex = (result[0] as any[]).findIndex(
                  (item) => item.item_id == x.id && item.item_unit_id == null
                );

                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  unit: x.unit,
                  price:
                    priceIndex == -1
                      ? 0
                      : (result[0] as any[])[priceIndex].price,
                  unit_price: (result[0] as any[])
                    .filter(
                      (item) =>
                        item.item_id == x.id && item.item_unit_id != null
                    )
                    .map((unit) => {
                      return {
                        id: unit.id,
                        unit: unit.unit,
                        conversion: unit.conversion,
                        price: unit.price,
                        item_unit_id: unit.item_unit_id,
                      };
                    }),
                };
              }),
              count: result[2],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
      case "sales":
        ItemModel.fetch(keyword, offset, limit, false, true)
          .then((result) => {
            console.log(result);
            return res.status(200).send({
              data: (result[1] as any[]).map((x) => {
                const priceIndex = (result[0] as any[]).findIndex(
                  (item) => item.item_id == x.id && item.item_unit_id == null
                );

                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  unit: x.unit,
                  stock: x.stock,
                  price:
                    priceIndex == -1
                      ? 0
                      : (result[0] as any[])[priceIndex].price,
                  discount:
                    priceIndex == -1
                      ? 0
                      : (result[0] as any[])[priceIndex].discount,
                  unit_price: (result[0] as any[])
                    .filter(
                      (item) =>
                        item.item_id == x.id && item.item_unit_id != null
                    )
                    .map((unit) => {
                      return {
                        id: unit.id,
                        unit: unit.unit,
                        conversion: unit.conversion,
                        price: unit.price,
                        discount: unit.discount,
                        item_unit_id: unit.item_unit_id,
                      };
                    }),
                };
              }),
              count: result[2],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
      case "plain":
        ItemModel.fetch(keyword, offset, limit, false, false)
          .then((result) => {
            return res.status(200).send({
              data: (result[1] as any[]).map((x) => {
                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  minimum_stock: x.minimum_stock,
                  unit: x.unit,
                  item_type_id: x.item_type_id,
                  item_brand_id: x.item_brand_id,
                  item_type: {
                    name: x.item_type_name,
                  },
                  item_brand: {
                    name: x.item_brand_name,
                  },
                  is_active: x.is_active == 1 ? true : false,
                  unit_price: (result[0] as any[])
                    .filter((item) => item.item_id == x.id)
                    .map((unit) => {
                      return {
                        id: unit.id,
                        unit: unit.unit,
                        conversion: unit.conversion,
                        item_unit_id: unit.id,
                      };
                    }),
                };
              }),
              count: result[2],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
      default:
        ItemModel.fetch(keyword, offset, limit, false, false)
          .then((result) => {
            ItemModel.countRelations(
              (result[1] as any[]).map((x) => {
                return x.id;
              })
            )
              .then((count) => {
                return res.status(200).send({
                  data: (result[1] as any[]).map((x) => {
                    const relations =
                      count[0] == 0 && count[1] == 0 && count[2] == 0;
                    return {
                      id: x.id,
                      reference: x.reference,
                      description: x.description,
                      minimum_stock: x.minimum_stock,
                      unit: x.unit,
                      item_type_id: x.item_type_id,
                      item_brand_id: x.item_brand_id,
                      item_type: {
                        name: x.item_type_name,
                      },
                      item_brand: {
                        name: x.item_brand_name,
                      },
                      is_active: x.is_active == 1 ? true : false,
                      can_delete: relations,
                    };
                  }),
                  count: result[2],
                });
              })
              .catch((_) => {
                return res.status(200).send({
                  data: (result[0] as any[]).map((x) => {
                    return {
                      id: x.id,
                      reference: x.reference,
                      description: x.description,
                      minimum_stock: x.minimum_stock,
                      unit: x.unit,
                      item_type_id: x.item_type_id,
                      item_brand_id: x.item_brand_id,
                      item_type: {
                        name: x.item_type_name,
                      },
                      item_brand: {
                        name: x.item_brand_name,
                      },
                      is_active: x.is_active == 1 ? true : false,
                      can_delete: false,
                    };
                  }),
                  count: result[1],
                });
              });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
    }
  };

  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword =
      req.query.keyword == null
        ? ""
        : mysql_real_escape_string(req.query.keyword.toString());
    ItemModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemModel.fetchById(id)
      .then((result) => {
        if (!result || (result as any[]).length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else if ((result as any[])[0].is_delete == 1) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          var item = (result as any[])[0];
          return res.status(200).send({
            id: item.id,
            reference: item.reference,
            description: item.description,
            unit: item.unit,
            minimum_stock: item.minimum_stock,
            item_brand_id: item.item_brand_id,
            item_type_id: item.item_type_id,
            item_type: {
              name: item.item_type_name,
            },
            item_brand: {
              name: item.item_brand_name,
            },
            can_delete: item.can_delete == 1,
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchCompleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    ItemModel.fetchById(id).then((item) => {
      if (item == null || item.length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      } else {
        Promise.all([
          ItemPriceModel.fetchByItemID(id),
          ItemPurchasePriceModel.fetchByItemID(id),
        ]).then((result) => {
          return res.status(200).send({
            id: item[0].id,
            reference: item[0].reference,
            description: item[0].description,
            unit: item[0].unit,
            minimum_stock: item[0].minimum_stock,
            item_brand: item[0].item_brand_name,
            item_type: item[0].item_type_name,
            stock: item[0].stock,
            item_prices: result[0],
            item_purchase_prices: result[1],
          });
        });
      }
    });
  };

  static active = (req: Request, res: Response) => {
    const id = req.body.id;
    ItemModel.fetchById(id).then((item) => {
      if (item == null || item.length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      } else if (item[0].is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      } else {
        const currentStatus = item[0].is_active == 1;
        ItemModel.active(id, !currentStatus)
          .then((result) => {
            const socket = new SocketHelper("updateItemActive", result);
            socket.create();
            return res.status(200).send(result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static search = (req: Request, res: Response) => {
    const keyword = req.body.keyword;
    const page = req.body.page;
    const offset = (page - 1) * 20;
    meili
      .index("item")
      .search(keyword, {
        limit: 20,
        offset: offset,
      })
      .then((result) => {
        if (result.hits.length == 0) {
          return res.status(200).send({
            data: [],
            count: 0,
          });
        } else {
          ItemModel.fetchCompleteByIDs(
            result.hits.map((x) => {
              return x.id;
            })
          ).then((items) => {
            return res.status(200).send({
              data: result.hits.map((x) => {
                const item = items[0];
                const itemIndex = item.findIndex((y) => y.id == x.id);
                if (itemIndex != -1) {
                  const priceIndex = item[itemIndex].item_price.findIndex(
                    (z) => z.item_unit == null
                  );

                  const draftSumIndex = items[1].findIndex(
                    (z) => z.item_id == x.id
                  );

                  return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    item_type: {
                      name: item[itemIndex].item_type?.name,
                    },
                    item_brand: {
                      name: item[itemIndex].item_brand.name,
                    },
                    stock:
                      item[itemIndex].stock == null ? 0 : item[itemIndex].stock,
                    price:
                      priceIndex == -1
                        ? 0
                        : item[itemIndex].item_price[priceIndex].price,
                    discount: 0,
                    unit: item[itemIndex].unit,
                    unit_price: item[itemIndex].item_price
                      .filter((a) => a.item_unit != null)
                      .map((b) => {
                        return {
                          id: b.item_unit?.id,
                          unit: b.item_unit?.unit,
                          price: b.price,
                          discount: 0,
                        };
                      }),
                    draft:
                      draftSumIndex == -1
                        ? 0
                        : items[1][draftSumIndex].quantity,
                  };
                }
              }),
              count: result.estimatedTotalHits,
            });
          });
        }
      })
      .catch((error) => {
        console.log(error);
      });
  };
}

export default ProductController;
