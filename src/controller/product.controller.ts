import { Request, Response } from "express";
import {
  ICreateProductUnit,
  IFetchProduct,
  IFetchProductSimple,
  ItemModel,
} from "../model/item.model";

import SocketHelper from "../helper/socket.helper";
import ErrorList from "../assets/error_list";

import { meili } from "../app";
import { mysql_real_escape_string } from "../helper/escape.helper";
import ProductStockModel from "../model/product-stock.model";
import { queue } from "../helper/queue.helper";
import { mongoProductModel } from "../mongo-model/mongo-product.model";

class ProductController {
  /**
   * Create new item
   * @param req
   * @param res
   * @returns {Promise<Response<any, Record<string, any>, number>>}
   */
  static create = async (req: Request, res: Response) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brand_id = req.body.brand;
    const type_id = req.body.type;
    const minimum_stock = req.body.minimum_stock;
    const userID = req.body.userId;
    const unit = req.body.unit;
    const price = req.body.price;
    const discount = req.body.discount;
    const purchase_price = req.body.purchase_price;
    const purchase_discount = req.body.purchase_discount;

    const units = req.body.units as ICreateProductUnit[];

    const existingItem = await ItemModel.fetchByReference(reference);
    if (existingItem) {
      return res.status(400).send(ErrorList["Reference unique constraint"]);
    }

    ItemModel.create({
      reference: reference,
      description: description,
      minimum_stock: minimum_stock,
      brand_id: brand_id,
      type_id: type_id,
      created_by: userID,
      price: price,
      discount: discount,
      purchase_price: purchase_price,
      purchase_discount: purchase_discount,
      unit: unit,
    })
      .then(async (item) => {
        const itemID = item.id;
        const unitResult = await ItemModel.createUnits(itemID, userID, units);

        await queue.add("insert-product", {
          reference: item.reference,
          description: item.description,
          id: item.id,
          itemTypeID: item.item_type_id,
          itemBrandID: item.item_brand_id,
          unit: item.unit,
          itemBrand: item.item_brand.name,
          itemType: item.item_type.name,
        });

        await ProductStockModel.createStockData(item.id);

        const response = {
          ...item,
          item_price: item.item_price[0],
          item_price_purchase: item.item_price_purchase[0],
          units: unitResult,
        };

        const itemSocket = new SocketHelper("createItem", response);
        itemSocket.create();

        return res.status(201).send(response);
      })
      .catch((error) => {
        console.error(`[error]: Error on creating item ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch items with pagination
   * @param req
   * @param res
   * @returns {Promise<Response<any, Record<string, any>, number>>}
   */
  static fetch = async (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : mysql_real_escape_string(
          decodeURIComponent(req.query.keyword.toString())
        );
    const mode = req.query.mode;

    switch (mode) {
      case "purchase":
        ItemModel.fetch(keyword, offset, limit, 1)
          .then((result) => {
            return res.status(200).send({
              data: (result[0] as any[]).map((x) => {
                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  unit: x.unit,
                  price:
                    x.item_price_purchase == null ||
                    x.item_price_purchase.length == 0
                      ? 0
                      : x.item_price_purchase[0].price,
                  discount:
                    x.item_price_purchase == null ||
                    x.item_price_purchase.length == 0
                      ? 0
                      : x.item_price_purchase[0].discount,
                  unit_price: x.item_unit.map((y: any) => {
                    return {
                      id: y.id,
                      unit: y.unit,
                      conversion: y.conversion,
                      price:
                        y.item_price_purchase == null ||
                        y.item_price_purchase.length == 0
                          ? 0
                          : y.item_price_purchase[0].price,
                      discount:
                        y.item_price_purchase == null ||
                        y.item_price_purchase.length == 0
                          ? 0
                          : y.item_price_purchase[0].discount,
                      item_unit_id: y.id,
                    };
                  }),
                };
              }),
              count: result[1],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
      case "sales":
        const [prices, products, count] = await ItemModel.fetch(
          keyword,
          offset,
          limit,
          2
        );

        const productStock = await mongoProductModel.aggregate([
          {
            $match: {
              itemID: {
                $in: (products as any[]).map((x) => x.id),
              },
            },
          },
          {
            $project: {
              itemID: "$itemID",
              currentStock: "$currentStock",
            },
          },
        ]);

        return res.status(200).send({
          data: (products as any[]).map((x) => {
            const priceIndex = (prices as any[]).findIndex(
              (item) => item.item_id == x.id && item.item_unit_id == null
            );

            const stockIndex = productStock.findIndex(
              (item) => item.itemID == x.id
            );

            return {
              id: x.id,
              reference: x.reference,
              description: x.description,
              unit: x.unit,
              stock:
                stockIndex == -1 ? 0 : productStock[stockIndex].currentStock,
              price: priceIndex == -1 ? 0 : (prices as any[])[priceIndex].price,
              discount:
                priceIndex == -1 ? 0 : (prices as any[])[priceIndex].discount,
              unit_price: (prices as any[])
                .filter(
                  (item) => item.item_id == x.id && item.item_unit_id != null
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
          count: count,
        });
      case "plain":
        ItemModel.fetch(keyword, offset, limit, 3)
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
      case "return":
        ItemModel.fetch(keyword, offset, limit, 4)
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
        // First we need to sanitize the input before entering RegExp
        // Such as changing " to \" and etc

        const [defaultResult, defaultCount] = await Promise.all([
          mongoProductModel
            .find({
              $or: [
                {
                  reference: {
                    $regex: RegExp(
                      keyword
                        .replace(/\\/g, "\\\\")
                        .replace(/\^/g, "\\^")
                        .replace(/\$/g, "\\$")
                        .replace(/\*/g, "\\*")
                        .replace(/\+/g, "\\+")
                        .replace(/\?/g, "\\?")
                        .replace(/\./g, "\\.")
                        .replace(/\(/g, "\\(")
                        .replace(/\)/g, "\\)")
                        .replace(/\[/g, "\\[")
                        .replace(/\]/g, "\\]")
                        .replace(/\{/g, "\\{")
                        .replace(/\}/g, "\\}")
                        .replace(/\,/g, "\\,")
                        .replace(/\=/g, "\\=")
                        .replace(/\!/g, "\\!")
                        .replace(/\:/g, "\\:")
                        .replace(/\//g, "\\/")
                        .replace(/\'/g, "\\'")
                        .replace(/\"/g, '\\"')
                        .replace(/\-/g, "\\-")
                        .replace(/\_/g, "\\_")
                        .replace(/\#/g, "\\#")
                        .replace(/\@/g, "\\@")
                        .replace(/\%/g, "\\%")
                        .replace(/\&/g, "\\&")
                        .replace(/\|/g, "\\|")
                        .replace(/\~/g, "\\~")
                        .replace(/\`/g, "\\`")
                        .replace(/\s{2,}/g, " "),
                      "i"
                    ),
                  },
                },
                {
                  description: {
                    $regex: RegExp(
                      keyword
                        .replace(/\\/g, "\\\\")
                        .replace(/\^/g, "\\^")
                        .replace(/\$/g, "\\$")
                        .replace(/\*/g, "\\*")
                        .replace(/\+/g, "\\+")
                        .replace(/\?/g, "\\?")
                        .replace(/\./g, "\\.")
                        .replace(/\(/g, "\\(")
                        .replace(/\)/g, "\\)")
                        .replace(/\[/g, "\\[")
                        .replace(/\]/g, "\\]")
                        .replace(/\{/g, "\\{")
                        .replace(/\}/g, "\\}")
                        .replace(/\,/g, "\\,")
                        .replace(/\=/g, "\\=")
                        .replace(/\!/g, "\\!")
                        .replace(/\:/g, "\\:")
                        .replace(/\//g, "\\/")
                        .replace(/\'/g, "\\'")
                        .replace(/\"/g, '\\"')
                        .replace(/\-/g, "\\-")
                        .replace(/\_/g, "\\_")
                        .replace(/\#/g, "\\#")
                        .replace(/\@/g, "\\@")
                        .replace(/\%/g, "\\%")
                        .replace(/\&/g, "\\&")
                        .replace(/\|/g, "\\|")
                        .replace(/\~/g, "\\~")
                        .replace(/\`/g, "\\`")
                        .replace(/\s{2,}/g, " "),
                      "i"
                    ),
                  },
                },
              ],
            })
            .sort({
              reference: 1,
            })
            .select("itemID")
            .limit(limit)
            .skip(offset),
          mongoProductModel.countDocuments({
            $or: [
              {
                reference: {
                  $regex: RegExp(
                    keyword
                      .replace(/\\/g, "\\\\")
                      .replace(/\^/g, "\\^")
                      .replace(/\$/g, "\\$")
                      .replace(/\*/g, "\\*")
                      .replace(/\+/g, "\\+")
                      .replace(/\?/g, "\\?")
                      .replace(/\./g, "\\.")
                      .replace(/\(/g, "\\(")
                      .replace(/\)/g, "\\)")
                      .replace(/\[/g, "\\[")
                      .replace(/\]/g, "\\]")
                      .replace(/\{/g, "\\{")
                      .replace(/\}/g, "\\}")
                      .replace(/\,/g, "\\,")
                      .replace(/\=/g, "\\=")
                      .replace(/\!/g, "\\!")
                      .replace(/\:/g, "\\:")
                      .replace(/\//g, "\\/")
                      .replace(/\'/g, "\\'")
                      .replace(/\"/g, '\\"')
                      .replace(/\-/g, "\\-")
                      .replace(/\_/g, "\\_")
                      .replace(/\#/g, "\\#")
                      .replace(/\@/g, "\\@")
                      .replace(/\%/g, "\\%")
                      .replace(/\&/g, "\\&")
                      .replace(/\|/g, "\\|")
                      .replace(/\~/g, "\\~")
                      .replace(/\`/g, "\\`")
                      .replace(/\s{2,}/g, " "),
                    "i"
                  ),
                },
              },
              {
                description: {
                  $regex: RegExp(
                    keyword
                      .replace(/\\/g, "\\\\")
                      .replace(/\^/g, "\\^")
                      .replace(/\$/g, "\\$")
                      .replace(/\*/g, "\\*")
                      .replace(/\+/g, "\\+")
                      .replace(/\?/g, "\\?")
                      .replace(/\./g, "\\.")
                      .replace(/\(/g, "\\(")
                      .replace(/\)/g, "\\)")
                      .replace(/\[/g, "\\[")
                      .replace(/\]/g, "\\]")
                      .replace(/\{/g, "\\{")
                      .replace(/\}/g, "\\}")
                      .replace(/\,/g, "\\,")
                      .replace(/\=/g, "\\=")
                      .replace(/\!/g, "\\!")
                      .replace(/\:/g, "\\:")
                      .replace(/\//g, "\\/")
                      .replace(/\'/g, "\\'")
                      .replace(/\"/g, '\\"')
                      .replace(/\-/g, "\\-")
                      .replace(/\_/g, "\\_")
                      .replace(/\#/g, "\\#")
                      .replace(/\@/g, "\\@")
                      .replace(/\%/g, "\\%")
                      .replace(/\&/g, "\\&")
                      .replace(/\|/g, "\\|")
                      .replace(/\~/g, "\\~")
                      .replace(/\`/g, "\\`")
                      .replace(/\s{2,}/g, " "),
                    "i"
                  ),
                },
              },
            ],
          }),
        ]);

        ItemModel.fetchByIDs(defaultResult.map((x: any) => x.itemID)).then(
          (items) => {
            return res.status(200).send({
              data: defaultResult
                .filter((x) => {
                  // Check if exist in items
                  const itemIndex = items.findIndex(
                    (item) => item.id == x.itemID
                  );

                  return itemIndex != -1;
                })
                .map((x) => {
                  const itemIndex = items.findIndex(
                    (item) => item.id == x.itemID
                  );

                  return {
                    ...items[itemIndex],
                    can_delete:
                      items[itemIndex].can_delete == "1" ? true : false,
                  };
                }),
              count: defaultCount,
            });
          }
        );
        break;
    }
  };

  /**
   * Fetch autocomplete items
   * @param req
   * @param res
   * @returns {Promise<Response>}
   */
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
        console.error(`[error]: Error on fetch autocomplete item ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch item by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemModel.fetchByID(id)!
      .then((result) => {
        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        const item = result[0];
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
          can_delete: item.can_delete == "1",
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching item by id ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch item by ID with price
   * @param req
   * @param res
   */
  static fetchCompleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    ItemModel.fetchByIDWithPrice(id)
      .then((item) => {
        if (!item) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        const priceIdx = item.item_price.findIndex((x) => {
          x.item_unit == null;
        });

        const purchasePriceIdx = item.item_price_purchase.findIndex((x) => {
          x.item_unit == null;
        });

        const price =
          priceIdx == -1
            ? 0
            : parseFloat(item.item_price[priceIdx].price.toString());
        const discount =
          priceIdx == -1
            ? 0
            : parseFloat(item.item_price[priceIdx].discount.toString());
        const purchasePrice =
          purchasePriceIdx == -1
            ? 0
            : parseFloat(
                item.item_price_purchase[purchasePriceIdx].price.toString()
              );
        return res.status(200).send({
          reference: item.reference,
          description: item.description,
          unit: item.unit,
          item_brand: item.item_brand.name,
          item_type: item.item_type!.name,
          price: price,
          discount: discount,
          purchase_price: purchasePrice,
          units: item.item_unit.map((x) => {
            const priceIndex = item.item_price.findIndex(
              (y) => y.item_unit != null && y.item_unit.id == x.id
            );

            const purchasePriceIndex = item.item_price_purchase.findIndex(
              (y) => y.item_unit != null && y.item_unit.id == x.id
            );

            return {
              id: x.id,
              unit: x.unit,
              conversion: parseFloat(x.conversion.toString()),
              price:
                priceIndex == -1
                  ? 0
                  : parseFloat(item.item_price[priceIndex].price.toString()),
              discount:
                priceIndex == -1
                  ? 0
                  : parseFloat(item.item_price[priceIndex].discount.toString()),
              price_purchase:
                purchasePriceIndex == -1
                  ? 0
                  : parseFloat(
                      item.item_price_purchase[
                        purchasePriceIndex
                      ].price.toString()
                    ),
            };
          }),
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching item By ID with price ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update product data by ID
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const reference = req.body.reference;
    const description = req.body.description;
    const brand = parseInt(req.body.brand.toString());
    const type = parseInt(req.body.type.toString());
    const minimum_stock = req.body.minimum_stock;
    const unit = req.body.unit;
    const userID = req.body.userId;

    ItemModel.fetchByID(id).then((result) => {
      if (result.length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (result[0].is_delete == 1) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      Promise.all([
        ItemModel.update({
          id: id,
          reference: reference,
          description: description,
          brand_id: brand,
          type_id: type,
          updated_by: userID,
          minimum_stock: minimum_stock,
          unit: unit,
        }),
        meili.index("item").updateDocuments([
          {
            id: id,
            reference: reference,
            description: description,
          },
        ]),
        queue.add("updateItem", {
          id: id,
          reference: reference,
          description: description,
          unit: unit,
          item_type_id: type,
          item_brand_id: brand,
        }),
      ])
        .then(([updateItemResult, _, __]) => {
          const socket = new SocketHelper("updateItem", updateItemResult);
          socket.create();

          return res.status(201).send(updateItemResult);
        })
        .catch((error) => {
          console.error(`[error]: Error on updating item ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };

  /**
   * Delete item by ID
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    ItemModel.fetchByID(id)
      .then((item) => {
        if (item.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (item[0].can_delete == "0") {
          return res.status(404).send(ErrorList["Delete error"]);
        }

        Promise.all([
          ItemModel.delete(id, userID),
          meili.index("item").deleteDocument(id),
        ])
          .then(([deleteItemResult, _]) => {
            const socket = new SocketHelper("deleteItem", deleteItemResult);
            socket.create();
            return res.status(201).send(deleteItemResult);
          })
          .catch((error) => {
            console.error(`[error]: Error on deleting item ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on fething item by id [${id}] ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Activate or deactivate item
   * @param req
   * @param res
   */
  static activateByID = (req: Request, res: Response) => {
    const id = req.body.id;
    ItemModel.fetchByID(id).then((item) => {
      if (!item) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (item.length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (item[0].is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const currentStatus = item[0].is_active == 1;

      ItemModel.activateByID(id, !currentStatus)
        .then(async (result) => {
          await meili.index("item").updateDocuments([
            {
              id: id,
              is_active: currentStatus ? 0 : 1,
            },
          ]);

          const socket = new SocketHelper("updateItemActive", result);
          socket.create();

          return res.status(200).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on activating item ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };
}

export default ProductController;
