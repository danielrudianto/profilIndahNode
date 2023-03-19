import { Request, Response } from "express";
import { ItemModel } from "../model/item.model";

import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import ItemPriceModel from "../model/item_price.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import { validationResult } from "express-validator";
import StockCardHelper from "../helper/stock_card.helper";
import ItemUnitModel from "../model/item_unit.model";
import UserModel from "../model/user.model";
import ErrorList from "../assets/error_list";

import pdfPrinter from "pdfmake";
import path from "path";
import { meili } from "../app";

class ItemController {
  static create = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }

    try {
      const reference = req.body.reference;
      const description = req.body.description;
      const brand_id = req.body.brand;
      const type_id = req.body.type;
      const minimum_stock = req.body.minimum_stock;
      const user_id = req.body.userId;
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
            user_id,
            unit
          );

          item
            .create()
            .then(async (result) => {
              LogHelper.log(
                new Date(),
                "info",
                `${result.user.name} created new item with reference ${result.reference} (ID: ${result.id})`,
                `Item - Create`,
                req.body.userId
              );

              const item_units = ItemUnitModel.createMany(
                units,
                result.id,
                req.body.userId
              );

              const item_price = new ItemPriceModel(
                req.body.price,
                req.body.discount,
                result.id,
                null,
                req.body.userId
              );

              const item_purchase_price = new ItemPurchasePriceModel(
                req.body.purchase_price,
                result.id,
                req.body.userId,
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
              ])
                .then((item_price) => {
                  const item_object = {
                    ...result,
                    item_price: item_price[0],
                    item_price_purchase: item_price[1],
                    item_units: item_price[2],
                  };

                  LogHelper.log(
                    new Date(),
                    "info",
                    `${result.user.name} created item unit for item with reference ${result.reference} (ID: ${result.id})`,
                    `Item - Create`,
                    req.body.userId
                  );

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

                  ItemModel.countByBrandId(brand_id)
                    .then((count_brand) => {
                      const itemSocket = new SocketHelper("createItemBrand", {
                        brand_id: brand_id,
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
                })
                .catch((error) => {
                  console.error(error);
                  LogHelper.log(
                    new Date(),
                    "error",
                    error,
                    "Item Controller - Create",
                    req.body.userId
                  );

                  return res.status(500).send(error);
                });
            })
            .catch((error) => {
              console.error(error);
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

  static delete = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }
    try {
      const reference = decodeURIComponent(req.params.itemReference);

      ItemModel.fetchByReference(reference).then((item) => {
        if (item == null || item.is_delete) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          ItemModel.checkDeleteByReference(reference)
            .then((count) => {
              if (count[0] == 0 && count[1] == 0) {
                Promise.all([
                  ItemModel.delete(item!.id, req.body.userId),
                  meili.index("item").deleteDocument(item!.id),
                ]).then((delete_result) => {
                  const socket = new SocketHelper("deleteItem", delete_result);
                  socket.create();

                  LogHelper.log(
                    new Date(),
                    "info",
                    `${delete_result[0].user.name} deleted item with reference ${delete_result[0].reference} (ID: ${delete_result[0].id})`,
                    "Item controller - Delete",
                    req.body.userId
                  );

                  ItemModel.countByBrandId(delete_result[0].item_brand_id)
                    .then((count_brand) => {
                      const itemSocket = new SocketHelper("deleteItemBrand", {
                        brand_id: delete_result[0].item_brand_id,
                        can_delete: count_brand == 0 ? true : false,
                      });
                      itemSocket.create();

                      return res.status(201).send(delete_result[0]);
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;

    ItemModel.fetchById(id, new Date())
      .then((item) => {
        if (item == null || item.is_delete) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          Promise.all([
            ItemModel.update(
              id,
              reference,
              description,
              brand,
              type,
              req.body.userId,
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
          ])
            .then((result) => {
              LogHelper.log(
                new Date(),
                "info",
                `${result[0].user_item_updated_byTouser?.name} updated item with reference ${result[0].reference} (ID: ${result[0].id})`,
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
  };

  static fetchSearchResult = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());

    ItemModel.fetchSearch(keyword, offset, limit)
      .then((result) => {
        const ids = (result[0] as any[]).map((x) => {
          return x.id;
        });

        ItemModel.fetchSearchByIds(ids)
          .then((items) => {
            return res.status(200).send({
              data: items.map((x) => {
                return {
                  ...x,
                  price: x.item_price.filter((y) => y.item_unit == null)[0]
                    .price,
                  discount: x.item_price.filter((y) => y.item_unit == null)[0]
                    .discount,
                };
              }),
              count: result[1],
            });
          })
          .catch((error) => {
            console.error(error);
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
      });
  };

  static fetchPurchaseSearchResult = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());

    ItemModel.fetchSearch(keyword, offset, limit)
      .then((result) => {
        const ids = (result[0] as any[]).map((x) => {
          return x.id;
        });

        ItemModel.fetchPurchaseSearchByIds(ids)
          .then((items) => {
            return res.status(200).send({
              data: items.map((x) => {
                return {
                  ...x,
                  price: x.item_price_purchase.filter(
                    (y) => y.item_unit == null
                  )[0].price,
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

  static fetchSearchStock = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());
    ItemModel.fetchSearch(keyword, offset, limit)
      .then((result) => {
        const ids = (result[0] as any[]).map((x) => {
          return x.id;
        });
        ItemModel.fetchStockByItemIds(ids)
          .then((stock) => {
            return res.status(200).send({
              data: stock[0].map((x) => {
                return {
                  ...x,
                  price: x.item_price.find((x) => x.item_unit == null)?.price,
                  discount: x.item_price.find((x) => x.item_unit == null)
                    ?.discount,
                  unit: x.unit,
                  item_price: x.item_price.filter((x) => x.item_unit != null),
                  purchase_price: x.item_price_purchase.find(
                    (x) => x.item_unit == null
                  )?.price,
                  item_price_purchase: x.item_price_purchase.filter(
                    (x) => x.item_unit != null
                  ),
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

  static fetch = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());

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
                  can_delete:
                    count[0] + count[1] + count[2] == 0 ? true : false,
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
              "Item controller - count",
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
          "Item controller - fetch",
          req.body.userId
        );
        console.error(error);
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
              (item?._count.good_receipt || 0) > 0 ||
              (item?._count.adjustment_case || 0) > 0
                ? false
                : true,
          });
        }
      })
      .catch((error) => {
        res.status(500).send(error);
      });
  };

  static fetchStock = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }

    const reference = decodeURIComponent(req.query.reference?.toString()!);
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ItemModel.fetchByReference(reference).then((item) => {
      if (item == null) {
        return res.status(404).send("Referensi tidak ditemukan.");
      } else {
        ItemModel.fetchStockById(item.id, offset)
          .then((result) => {
            return res.status(200).send({
              data: (result[0] as any[]).map((x) => {
                return {
                  name: x.f0,
                  date: x.f1,
                  bill_id: x.f4,
                  adjustment_case_id: x.f5,
                  good_receipt_id: x.f6,
                  sales_return_id: x.f7,
                  quantity: x.f8,
                  stock: x.f9,
                  unit: x.f10,
                  conversion: x.f11,
                };
              }),
              count: (result[1] as any[])[0].f0,
            });
          })
          .catch((error) => {
            console.log(error);
            return res.status(500).send(error);
          });
      }
    });
  };

  static downloadStock = (req: Request, res: Response) => {
    const start = req.body.start;
    const end = req.body.end;
    const format = req.body.format;
    const reference = req.body.reference;

    ItemModel.fetchByReference(reference)
      .then((item) => {
        if (item == null) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          ItemModel.fetchStockData(item.id, start, end).then((result) => {
            switch (format) {
              case "pdf":
                StockCardHelper.createPdf(
                  (result as any[]).map((x) => {
                    return {
                      name: x.f0,
                      date: new Date(x.f1),
                      created_at: new Date(x.f2),
                      item_id: x.f3,
                      item_unit_id: x.f4,
                      bill_id: x.f5,
                      adjustment_case_id: x.f6,
                      good_receipt_id: x.f7,
                      sales_return_id: x.f8,
                      quantity: x.f9,
                      stock: x.f10,
                      unit: x.f11,
                      conversion: x.f12,
                      opponent: x.f13,
                    };
                  }),
                  function (binary: string) {
                    return res.status(200).send({
                      data: binary,
                    });
                  },
                  function (error: any) {
                    return res.status(500).send(error);
                  }
                );

                break;
              case "csv":
                StockCardHelper.createCsv(
                  (result as any[]).map((x) => {
                    return {
                      name: x.f0,
                      date: new Date(x.f1),
                      created_at: new Date(x.f2),
                      item_id: x.f3,
                      item_unit_id: x.f4,
                      bill_id: x.f5,
                      adjustment_case_id: x.f6,
                      good_receipt_id: x.f7,
                      sales_return_id: x.f8,
                      quantity: x.f9,
                      stock: x.f10,
                      unit: x.f11,
                      conversion: x.f12,
                      opponent: x.f13,
                    };
                  }),
                  function (array: any[]) {
                    return res.status(200).send({
                      data: array,
                    });
                  },
                  function (error: any) {
                    return res.status(500).send(error);
                  }
                );

                break;
              default:
                return res.status(405).send("Format tidak ditemukan.");
            }
          });
        }
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Item Controller - Download stock",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static fetchUnits = (req: Request, res: Response) => {
    const reference = decodeURIComponent(req.params.reference);
    ItemUnitModel.fetchByItemReference(reference)
      .then((result) => {
        if (result == null || result.is_delete) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          return res.status(200).send(result);
        }
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Item Controller - fetch Units",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static updateUnit = (req: Request, res: Response) => {
    const units = req.body.units as any[];
    const item_id = req.body.item_id;
    const new_units = units.filter((x) => x.id == "");
    const update_units = units.filter((x) => x.id != "");

    Promise.all([
      ItemUnitModel.createMany(new_units, item_id, req.body.userId),
      ItemUnitModel.updateMany(update_units, req.body.userId),
    ])
      .then(() => {
        ItemModel.fetchById(item_id, new Date())
          .then((item) => {
            return res.status(200).send(item);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Item Controller - Update units",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchDailyStock = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }

    const reference = decodeURIComponent(req.params.reference);
    const start = req.query.start?.toString();

    ItemModel.fetchByReference(reference)
      .then((item) => {
        if (!item) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          ItemModel.fetchStockData(item.id, start, start)
            .then((result) => {
              return res.status(200).send(
                (result as any[]).map((x) => {
                  return {
                    name: x.f0,
                    date: new Date(x.f1),
                    created_at: new Date(x.f2),
                    item_id: x.f3,
                    item_unit_id: x.f4,
                    bill_id: x.f5,
                    adjustment_case_id: x.f6,
                    good_receipt_id: x.f7,
                    sales_return_id: x.f8,
                    quantity: x.f9,
                    stock: x.f10,
                    unit: x.f11,
                    conversion: x.f12,
                  };
                })
              );
            })
            .catch((error) => {
              console.log(error);
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchDailyInputStock = (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (errors.array().length > 0) {
      return res.status(400).send("Mohon isikan dengan format yang sesuai.");
    }

    const reference = decodeURIComponent(req.params.reference);
    const start = parseInt(req.query.start!.toString());
    const start_date = new Date(start);
    const end_date = new Date(start);

    end_date.setDate(end_date.getDate() + 1);

    ItemModel.fetchByReference(reference)
      .then((item) => {
        if (!item) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          ItemModel.fetchInputStockData(item.id, start_date, end_date)
            .then((result) => {
              return res.status(200).send(
                (result as any[]).map((x) => {
                  return {
                    name: x.f0,
                    date: new Date(x.f1),
                    created_at: new Date(x.f2),
                    item_id: x.f3,
                    item_unit_id: x.f4,
                    bill_id: x.f5,
                    adjustment_case_id: x.f6,
                    good_receipt_id: x.f7,
                    sales_return_id: x.f8,
                    quantity: x.f9,
                    stock: x.f10,
                    unit: x.f11,
                    conversion: x.f12,
                  };
                })
              );
            })
            .catch((error) => {
              console.log(error);
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static toggleActive = (req: Request, res: Response) => {
    const reference = decodeURIComponent(req.params.reference);
    ItemModel.fetchByReference(reference).then((item) => {
      if (item == null || item.is_delete) {
        return res.status(404).send("Barang tidak ditemukan.");
      } else {
        ItemModel.toggleActive(item.id, !item.is_active)
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

  static fetchStockReportPdf = (req: Request, res: Response) => {
    if (typeof req.body.brand_id === "string") {
      const brand_ids = JSON.parse(
        (req.body.brand_id as string).replace("'", "").replace('"', "")
      ) as number[];
      const type_ids = JSON.parse(
        (req.body.type_id as string).replace("'", "").replace('"', "")
      ) as number[];

      Promise.all([
        UserModel.fetchById(req.body.userId),
        ItemModel.fetchInsufficient(brand_ids, type_ids),
      ]).then((result) => {
        if (result[0] == null) {
          return res.status(400).send("Pengguna tidak ditemukan.");
        } else {
          const items = result[1].filter(
            (x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock
          );

          StockCardHelper.createInsufficientPdf(
            items,
            function (binary: string) {
              return res.status(200).send({
                data: binary,
              });
            },
            function (error: any) {
              return res.status(500).send(error);
            }
          );
        }
      });
    } else {
      const brand_ids = req.body.brand_id;
      const type_ids = req.body.type_id;

      Promise.all([
        UserModel.fetchById(req.body.userId),
        ItemModel.fetchInsufficient(brand_ids, type_ids),
      ]).then((result) => {
        if (result[0] == null) {
          return res.status(400).send("Pengguna tidak ditemukan.");
        } else {
          const items = result[1].filter(
            (x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock
          );

          StockCardHelper.createInsufficientPdf(
            items,
            function (binary: string) {
              return res.status(200).send({
                data: binary,
              });
            },
            function (error: any) {
              return res.status(500).send(error);
            }
          );
        }
      });
    }
  };

  static fetchStockReport = (req: Request, res: Response) => {
    if (typeof req.body.brand_id === "string") {
      const brand_ids = JSON.parse(
        (req.body.brand_id as string).replace("'", "").replace('"', "")
      ) as number[];
      const type_ids = JSON.parse(
        (req.body.type_id as string).replace("'", "").replace('"', "")
      ) as number[];

      ItemModel.fetchInsufficient(brand_ids, type_ids)
        .then((result) => {
          return res.status(200).send({
            data: result
              .filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock)
              .map((y) => {
                return {
                  ...y,
                  stock: y.stock == null ? 0 : y.stock.stock,
                };
              }),
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      const brand_ids = req.body.brand_id;
      const type_ids = req.body.type_id;

      ItemModel.fetchInsufficient(brand_ids, type_ids)
        .then((result) => {
          return res.status(200).send({
            data: result
              .filter((x) => (!x.stock ? 0 : x.stock.stock) < x.minimum_stock)
              .map((y) => {
                return {
                  ...y,
                  stock: y.stock == null ? 0 : y.stock.stock,
                };
              }),
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemModel.fetchById(id, new Date())
      .then((result) => {
        return res.status(200).send({
          ...result,
          item_price_id: result?.item_price.filter(
            (x) => x.item_unit == null
          )[0].id,
          item_price_purchase_id: result?.item_price_purchase.filter(
            (x) => x.item_unit == null
          )[0].id,
          price: result?.item_price.filter((x) => x.item_unit == null)[0].price,
          discount: result?.item_price.filter((x) => x.item_unit == null)[0]
            .discount,
          purchase_price: result?.item_price_purchase.filter(
            (x) => x.item_unit == null
          )[0].price,
          item_price: result?.item_price.filter((x) => x.item_unit != null),
          item_price_purchase: result?.item_price_purchase.filter(
            (x) => x.item_unit != null
          ),
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchMinusStock = (req: Request, res: Response) => {
    const keyword =
      req.query.keyword == null
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page =
      req.query.page == null ? 1 : parseInt(req.query.page.toString());
    const offset = (page - 1) * 10;

    ItemModel.fetchMinusStock(keyword, offset, 10)
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

  static downloadMinusStock = (req: Request, res: Response) => {
    ItemModel.downloadMinusStock()
      .then((items) => {
        try {
          const fontDescriptors = {
            Roboto: {
              normal: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Regular.ttf"
              ),
              bold: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Medium.ttf"
              ),
              italics: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-Italic.ttf"
              ),
              bolditalics: path.join(
                __dirname,
                "..",
                "assets",
                "/fonts/Roboto-MediumItalic.ttf"
              ),
            },
          };
          const printer = new pdfPrinter(fontDescriptors);
          const stockBody: any[] = [];

          stockBody.push([
            "Referensi",
            "Deskripsi",
            "Tipe barang",
            "Merek barang",
            "Stock",
          ]);

          items.forEach((x) => {
            stockBody.push([
              x.reference,
              x.description,
              x.item_type?.name,
              x.item_brand.name,
              Intl.NumberFormat().format(
                x.stock == null ? 0 : parseFloat(x.stock?.stock.toString())
              ),
            ]);
          });
          const docDefinition = {
            content: [
              {
                layout: "lightHorizontalLines", // optional
                table: {
                  headerRows: 1,
                  widths: ["auto", "*", "*", "auto", "auto"],
                  body: stockBody,
                },
              },
            ],
          };

          const pdfDocument = printer.createPdfKitDocument(docDefinition);

          let chunks: any[] = [];
          var pdfResult;

          pdfDocument.on("data", function (chunk) {
            chunks.push(chunk);
          });

          pdfDocument.on("end", function () {
            pdfResult = Buffer.concat(chunks);
            return res.status(200).send({
              data: `data:application/pdf;base64,${pdfResult.toString(
                "base64"
              )}`,
            });
          });

          pdfDocument.end();
        } catch (error) {
          return res.status(500).send(error);
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchSmartSearchStock = (req: Request, res: Response) => {
    const keyword =
      req.query.keyword == null
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page =
      req.query.page == null ? 1 : parseInt(req.query.page.toString());
    const offset = (page - 1) * parseInt(process.env.LIMIT!);

    meili
      .index("item")
      .search(keyword, {
        limit: parseInt(process.env.LIMIT!),
        offset: offset,
      })
      .then((result) => {
        ItemModel.fetchStockByItemIds(
          result.hits.map((x) => {
            return x.id;
          })
        ).then((items) => {
          return res.status(200).send({
            data: items[0].map((y) => {
              return {
                ...y,
                price: y.item_price.find((x) => x.item_unit == null)?.price,
                discount: y.item_price.find((x) => x.item_unit == null)
                  ?.discount,
                unit: y.unit,
                item_price: y.item_price.filter((x) => x.item_unit != null),
                purchase_price: y.item_price_purchase.find(
                  (x) => x.item_unit == null
                )?.price,
                item_price_purchase: y.item_price_purchase.filter(
                  (x) => x.item_unit != null
                ),
              };
            }),
            count: result.estimatedTotalHits,
          });
        });
      });
  };
}

export default ItemController;
