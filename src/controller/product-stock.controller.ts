import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import StockCardHelper from "../helper/stock_card.helper";
import { ItemModel } from "../model/item.model";
import ProductStockModel from "../model/product-stock.model";
import { meili, prisma } from "../app";
import { mongoProductModel } from "../mongo-model/mongo-product.model";

class ProductStockController {
  /**
   * Fetch product stock
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page ? 1 : parseInt(req.query.page.toString());
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const mode = req.query.mode;
    switch (mode) {
      case "problem":
        Promise.all([
          mongoProductModel
            .find({
              $or: [
                {
                  reference: {
                    $regex: keyword,
                  },
                },
                {
                  description: {
                    $regex: keyword,
                  },
                },
              ],
              currentStock: {
                $lt: 0,
              },
            })
            .sort({ reference: 1 })
            .limit(10)
            .skip((page - 1) * 10),
          mongoProductModel.countDocuments({
            currentStock: {
              $lt: 0,
            },
          }),
        ]).then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.itemID,
                reference: x.reference,
                description: x.description,
                stock: x.currentStock,
                unit: x.unit,
                item_brand_id: x.itemBrandID,
                item_type_id: x.itemTypeID,
              };
            }),
            count: result[1],
          });
        });
        break;
      case "dashboard":
        mongoProductModel
          .countDocuments({
            $expr: {
              $lt: ["$currentStock", "$minimumStock"],
            },
          })
          .then((result) => {
            return res.status(200).send({
              count: result,
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error while fetching product stock. ${error}`
            );
            return res.status(500).send(ErrorList["Internal server error"]);
          });
        break;
      case "plain":
      default:
        meili
          .index("item")
          .search(keyword, {
            limit: 10,
            offset: (page - 1) * 10,
          })
          .then(async (result) => {
            const productStock = await mongoProductModel.find(
              {
                itemID: {
                  $in: result.hits.map((x) => x.id),
                },
              },
              "itemID unit currentStock"
            );

            return res.status(200).send({
              data: result.hits.map((x) => {
                const stockIndex = productStock.findIndex(
                  (y) => y.itemID == x.id
                );
                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  stock:
                    stockIndex == -1
                      ? 0
                      : productStock[stockIndex].currentStock,
                  unit: stockIndex == -1 ? "" : productStock[stockIndex].unit,
                  item_brand_id: x.itemBrandID,
                  item_type_id: x.itemTypeID,
                  item_brand_name: x.brand,
                  item_type_name: x.type,
                };
              }),
              count: result.estimatedTotalHits,
            });
          });
        break;
    }
  };

  /**
   * Fetch product stock card by ID
   * @param req
   * @param res
   */
  static fetchByID = async (req: Request, res: Response) => {
    const itemID = parseInt(req.params.id);
    const page =
      req.query.page == null ? 1 : parseInt(req.query.page.toString());

    const product = await mongoProductModel.findOne(
      { itemID: itemID },
      {
        stockCard: {
          $slice: [(page - 1) * 10, 10],
        },
      }
    );

    const stockCardLength = await mongoProductModel.aggregate([
      {
        $match: {
          itemID: itemID,
        },
      },
      {
        $project: {
          stockCard: 1,
          _id: 0,
          length: { $size: "$stockCard" },
        },
      },
    ]);

    if (!product) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    return res.status(200).send({
      data: product.stockCard.map((x) => {
        return {
          name: x.document,
          date: x.date,
          bill_id: x.billID,
          adjustment_case_id: x.adjustmentCaseID,
          good_receipt_id: x.goodReceiptID,
          sales_return_id: x.salesReturnID,
          quantity: x.displayQuantity,
          unit: x.unit,
          stock: x.currentStock,
          defaultUnit: product.unit,
          document_id:
            x.salesReturnID != null
              ? x.salesReturnCodeID
              : x.billID != null
              ? x.billCodeID
              : x.goodReceiptID != null
              ? x.goodReceiptCodeID
              : x.adjustmentCaseID != null
              ? x.adjustmentCaseCodeID
              : null,
        };
      }),
      count: stockCardLength[0].length,
    });
  };

  static create = (req: Request, res: Response) => {
    const mode = req.body.mode;
    switch (mode) {
      case "inadequate-pagination":
        const inadequateBrandID = req.body.brands as number[];
        const inadequateTypeID = req.body.types as number[];
        const page = req.body.page as number;

        if (inadequateBrandID.length == 0) {
          Promise.all([
            mongoProductModel
              .aggregate([
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                      },
                      { $expr: { $gte: ["$currentStock", 0] } },
                      {
                        itemTypeID: {
                          $in: inadequateTypeID,
                        },
                      },
                    ],
                  },
                },
                {
                  $project: {
                    itemID: 1,
                    currentStock: 1,
                    minimum_stock: 1,
                    unit: 1,
                  },
                },
              ])
              .sort({
                reference: 1,
              })
              .limit(10)
              .skip((page - 1) * 10),
            mongoProductModel.countDocuments({
              $and: [
                {
                  $expr: { $lt: ["$currentStock", "$minimumStock"] },
                },
                { $expr: { $gte: ["$currentStock", 0] } },
                {
                  itemTypeID: {
                    $in: inadequateTypeID,
                  },
                },
              ],
            }),
          ])
            .then(([result, count]) => {
              ItemModel.fetchByIDs(result.map((x) => x.itemID))
                .then((items) => {
                  return res.status(200).send({
                    data: result.map((x, index) => {
                      return {
                        id: x.itemID,
                        stock: x.currentStock,
                        minimum_stock: x.minimum_stock,
                        unit: x.unit,
                        item_brand_name: items[index].item_brand_name,
                        item_type_name: items[index].item_type_name,
                      };
                    }),
                    count: count,
                  });
                })
                .catch((error) => {
                  console.error(
                    `[error]: Error on fetching inadequate product. ${error}`
                  );
                  return res
                    .status(500)
                    .send(ErrorList["Internal server error"]);
                });
            })
            .catch((error) => {
              console.error(
                `[error]: Error on fetching inadequate product. ${error}`
              );
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        } else if (inadequateTypeID.length == 0) {
          Promise.all([
            mongoProductModel
              .aggregate([
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                      },
                      { $expr: { $gte: ["$currentStock", 0] } },
                      {
                        itemBrandID: {
                          $in: inadequateBrandID,
                        },
                      },
                    ],
                  },
                },
                {
                  $project: {
                    itemID: 1,
                    currentStock: 1,
                    minimum_stock: 1,
                    unit: 1,
                  },
                },
              ])
              .sort({
                reference: 1,
              })
              .limit(10)
              .skip((page - 1) * 10),
            ,
            mongoProductModel.countDocuments({
              $and: [
                {
                  $expr: { $lt: ["$currentStock", "$minimumStock"] },
                },
                { $expr: { $gte: ["$currentStock", 0] } },
                {
                  itemBrandID: {
                    $in: inadequateBrandID,
                  },
                },
              ],
            }),
          ])
            .then(([result, count]) => {
              ItemModel.fetchByIDs(result.map((x) => x.itemID))
                .then((items) => {
                  return res.status(200).send({
                    data: result.map((x, index) => {
                      return {
                        id: x.itemID,
                        stock: x.currentStock,
                        minimum_stock: x.minimum_stock,
                        unit: x.unit,
                        item_brand_name: items[index].item_brand_name,
                        item_type_name: items[index].item_type_name,
                      };
                    }),
                    count: count,
                  });
                })
                .catch((error) => {
                  console.error(
                    `[error]: Error on fetching inadequate product. ${error}`
                  );
                  return res
                    .status(500)
                    .send(ErrorList["Internal server error"]);
                });
            })
            .catch((error) => {
              console.error(
                `[error]: Error on fetching inadequate product. ${error}`
              );
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        } else {
          Promise.all([
            mongoProductModel
              .aggregate([
                {
                  $match: {
                    $and: [
                      {
                        $expr: { $lt: ["$currentStock", "$minimumStock"] },
                      },
                      { $expr: { $gte: ["$currentStock", 0] } },
                      {
                        itemBrandID: {
                          $in: inadequateBrandID,
                        },
                      },
                      {
                        itemTypeID: {
                          $in: inadequateTypeID,
                        },
                      },
                    ],
                  },
                },
                {
                  $project: {
                    itemID: 1,
                    currentStock: 1,
                    minimum_stock: 1,
                    unit: 1,
                  },
                },
              ])
              .sort({
                reference: 1,
              })
              .limit(10)
              .skip((page - 1) * 10),
            mongoProductModel.countDocuments({
              $and: [
                {
                  $expr: { $lt: ["$currentStock", "$minimumStock"] },
                },
                { $expr: { $gte: ["$currentStock", 0] } },
                {
                  itemBrandID: {
                    $in: inadequateBrandID,
                  },
                },
                {
                  itemTypeID: {
                    $in: inadequateTypeID,
                  },
                },
              ],
            }),
          ])
            .then(([result, count]) => {
              ItemModel.fetchByIDs(result.map((x) => x.itemID))
                .then((items) => {
                  return res.status(200).send({
                    data: result.map((x, index) => {
                      return {
                        id: x.itemID,
                        reference: x.reference,
                        description: x.description,
                        stock: x.currentStock,
                        minimum_stock: x.minimum_stock,
                        unit: x.unit,
                        item_brand_name: items[index].item_brand_name,
                        item_type_name: items[index].item_type_name,
                      };
                    }),
                    count: count,
                  });
                })
                .catch((error) => {
                  console.error(
                    `[error]: Error on fetching inadequate product. ${error}`
                  );
                  return res
                    .status(500)
                    .send(ErrorList["Internal server error"]);
                });
            })
            .catch((error) => {
              console.error(
                `[error]: Error on fetching inadequate product. ${error}`
              );
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        }
        break;
      case "inadequate":
        const brand_id = req.body.brand as number[];
        const type_id = req.body.type as number[];
        ProductStockModel.fetchInadequate(brand_id, type_id)
          .then(async (result) => {
            const products = await mongoProductModel
              .find({
                itemID: {
                  $in: result.map((x) => x.id),
                },
              })
              .select("itemID currentStock");

            return res.status(200).send({
              data: result
                .filter((x) => {
                  const productIndex = products.findIndex(
                    (y) => y.itemID == x.id
                  );
                  return (
                    productIndex != -1 &&
                    products[productIndex].currentStock < x.minimum_stock &&
                    products[productIndex].currentStock > 0
                  );
                })
                .map((x) => {
                  const productIndex = products.findIndex(
                    (y) => y.itemID == x.id
                  );

                  return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    stock: products[productIndex].currentStock,
                    unit: x.unit,
                    minimum_stock: x.minimum_stock,
                  };
                }),
            });
          })
          .catch((error) => {
            console.error(`[error]: Error on fetching products ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });

        break;
      case "mutation":
        const mutationItemID = req.body.itemID;
        const date = req.body.date;
        const offset = req.body.offset;

        mongoProductModel
          .findOne({
            itemID: mutationItemID,
          })
          .then((result) => {
            if (!result) {
              return res.status(404).send(ErrorList["Not found"]);
            }

            const startDate = new Date(date);
            const startUTCDate = new Date(startDate.getTime() + offset * 60000);

            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            const endUTCDate = new Date(endDate.getTime() + offset * 60000);

            const day = new Date(date).getDate();
            const month = new Date(date).getMonth() + 1;
            const year = new Date(date).getFullYear();

            const documentStockCard = result.stockCard
              .filter((x: any) => {
                const date = new Date(x.date);
                return (
                  date.getDate() == day &&
                  date.getMonth() + 1 == month &&
                  date.getFullYear() == year
                );
              })
              .sort((a, b) => {
                return (
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
                );
              });

            const inputStockCard = result.stockCard
              .filter((x: any) => {
                return (
                  new Date(x.createdAt).getTime() >= startUTCDate.getTime() &&
                  new Date(x.createdAt).getTime() <= endUTCDate.getTime()
                );
              })
              .sort((a, b) => {
                return (
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
                );
              });

            let documentStockCardStartStock =
              documentStockCard.length == 0
                ? 0
                : documentStockCard[0].currentStock;
            let inputStockCardStartStock =
              inputStockCard.length == 0 ? 0 : inputStockCard[0].currentStock;

            for (let i = 0; i < documentStockCard.length; i++) {
              documentStockCard[i].currentStock = documentStockCardStartStock;
              documentStockCardStartStock += documentStockCard[i].quantity;
            }

            for (let i = 0; i < inputStockCard.length; i++) {
              inputStockCard[i].currentStock = inputStockCardStartStock;
              inputStockCardStartStock += inputStockCard[i].quantity;
            }

            return res.status(200).send({
              document: {
                mutation: documentStockCard
                  .map((x) => {
                    return {
                      name: x.document,
                      date: x.date,
                      createdAt: x.createdAt,
                      opponent: x.opponent,
                      displayQuantity: x.displayQuantity,
                      quantity: x.quantity,
                      unit: x.unit,
                      stock: x.currentStock,
                      defaultUnit: result.unit,
                    };
                  })
                  .reverse(),
                totalInput: documentStockCard.reduce((a, b) => {
                  return a + (b.quantity > 0 ? b.quantity : 0);
                }, 0),
                totalOutput:
                  documentStockCard.reduce((a, b) => {
                    return a + (b.quantity < 0 ? b.quantity : 0);
                  }, 0) * -1,
                initialStock:
                  documentStockCard.length == 0
                    ? 0
                    : documentStockCard[0].currentStock,
              },
              input: {
                mutation: inputStockCard
                  .map((x) => {
                    return {
                      name: x.document,
                      date: x.date,
                      createdAt: x.createdAt,
                      opponent: x.opponent,
                      displayQuantity: x.displayQuantity,
                      quantity: x.quantity,
                      unit: x.unit,
                      stock: x.currentStock,
                      defaultUnit: result.unit,
                    };
                  })
                  .reverse(),
                totalInput: inputStockCard.reduce((a, b) => {
                  return a + (b.quantity > 0 ? b.quantity : 0);
                }, 0),
                totalOutput:
                  inputStockCard.reduce((a, b) => {
                    return a + (b.quantity < 0 ? b.quantity : 0);
                  }, 0) * -1,
                initialStock:
                  inputStockCard.length == 0
                    ? 0
                    : inputStockCard[0].currentStock,
              },
            });
          })
          .catch((error) => {
            console.error(`[error]: Error on fetching product ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
        break;
      case "download":
        const itemID = req.body.itemID;
        const cardFormat = req.body.format;
        const dateStart = req.body.dateStart;
        const dateEnd = req.body.dateEnd;
        ItemModel.fetchByID(itemID)
          .then((item) => {
            if (!item) {
              return res.status(404).send(ErrorList["Not found"]);
            } else {
              ProductStockModel.fetchStockData(
                itemID,
                "card",
                dateStart,
                dateEnd
              )!
                .then((result) => {
                  if (cardFormat == "CSV") {
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
                  } else {
                    StockCardHelper.createPdf(
                      item[0],
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
                  }
                })
                .catch((error) => {
                  return res.status(500).send(error);
                });
            }
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
    }
  };
}

export default ProductStockController;
