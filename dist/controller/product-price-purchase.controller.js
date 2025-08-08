"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPurchasePriceController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
class ProductPurchasePriceController {
    constructor(productRepository) {
        this.fetch = async (req, res) => {
            try {
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                const pageSize = Number(process.env.LIMIT);
                const result = await this.productRepository.fetchSales({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                return res.status(500).send(error);
            }
        };
        this.fetchByID = async (req, res) => {
            try {
                const id = Number(req.params.id);
                const product = await this.productRepository.fetchSalesPriceByID(id);
                return res.status(200).send(product);
            }
            catch (error) {
                console.error(`[error]: Error on fetching sales price by ID ${error}`);
                return res.status(500).send(error);
            }
        };
        this.update = async (req, res) => {
            const product_id = req.body.product_id;
            const sales_price = req.body.sales_price;
            const sales_discount = req.body.sales_discount;
            const product_unit = req.body.product_unit;
            try {
                const product = await this.productRepository.fetchByID(product_id);
                if (!product || product.is_delete) {
                    return res.status(404).send(error_list_1.default["Product not found"]);
                }
                await this.productRepository.updateSalesPrice([
                    {
                        product_id: product_id,
                        product_unit_id: null,
                        price: sales_price,
                        discount: sales_discount,
                    },
                    ...product_unit.map((x) => {
                        return {
                            product_id: x.product_id,
                            product_unit_id: x.product_unit_id,
                            price: x.sales_price,
                            discount: x.sales_discount,
                        };
                    }),
                ]);
                await queue_helper_1.queue.add("product-updated", {
                    id: product_id,
                });
                return res.status(200).send(product);
            }
            catch (error) {
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.productRepository = productRepository;
    }
}
exports.ProductPurchasePriceController = ProductPurchasePriceController;
_a = ProductPurchasePriceController;
/**
 * Fetch all item price
 * @param req
 * @param res
 * @remarks Development purpose only
 */
ProductPurchasePriceController.fetchAll = (req, res) => {
    // const date = new Date();
    // date.setDate(date.getDate() + 1);
    // date.setHours(0, 0, 0);
    // const result: any[] = [];
    // ItemModel.fetchAll(date)
    //   .then((items) => {
    //     items.forEach((item) => {
    //       result.push({
    //         reference: item.reference,
    //         description: item.description,
    //         item_brand: item.item_brand,
    //         item_price: item.item_price,
    //       });
    //     });
    //     return res.status(200).send(
    //       items.map((x) => {
    //         return {
    //           reference: x.reference,
    //           description: x.description,
    //           item_brand: x.item_brand,
    //           price: x.item_price.filter((x) => x.item_unit == null)[0].price,
    //           discount: x.item_price.filter((x) => x.item_unit == null)[0]
    //             .discount,
    //           item_price: x.item_price.filter((x) => x.item_unit != null),
    //         };
    //       })
    //     );
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
};
ProductPurchasePriceController.fetchByID = (req, res) => {
    // const id = Number(req.params.id);
    // ItemPriceModel.fetchByItemID(id)
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item price: ${error}`);
    //     return res.status(500).send(error);
    //   });
};
ProductPurchasePriceController.fetchByIDV2 = (req, res) => {
    // const id = Number(req.params.id);
    // ItemPriceModel.fetchByItemIDV2(id)
    //   .then(([item, prices]) => {
    //     return res.status(200).send({
    //       ...item,
    //       item_price: prices,
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item price: ${error}`);
    //     return res.status(500).send(error);
    //   });
};
ProductPurchasePriceController.updateV2 = (req, res) => {
    // const data = req.body;
    // const userID = req.body.userId;
    // if (data.filter((x: any) => x.discount > x.price).length > 0) {
    //   return res.status(400).send(ErrorList["Discount > price"]);
    // } else {
    //   ItemPriceModel.updateMany(data, userID)
    //     .then((result) => {
    //       return res.status(200).send(result);
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on updating item price: ${error}`);
    //       return res.status(500).send(error);
    //     });
    // }
};
/**
 * Fetch item prices
 * @param req
 * @param res
 */
ProductPurchasePriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = Number(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    // ItemPriceModel.fetch(keyword, date, offset, limit)
    //   .then((result) => {
    //     return res.status(200).send({
    //       data: result[0].map((x) => {
    //         return {
    //           id: x.id,
    //           reference: x.reference,
    //           description: x.description,
    //           count: parseInt(x.count.toString()),
    //           price: x.price,
    //           discount: x.discount,
    //           effective_date: new Date(x.effective_date),
    //         };
    //       }),
    //       count: result[1],
    //     });
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
};
/**
 * Update item price by ID
 * @param req
 * @param res
 */
ProductPurchasePriceController.updateByID = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const discount = req.body.discount;
    const userID = req.body.userId;
    // ItemPriceModel.fetchByItemID(item_id, item_unit_id)
    //   .then((itemPrice) => {
    //     if (!itemPrice) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     if (itemPrice.length == 0) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     const latest_price = itemPrice[0].price;
    //     const latest_discount = itemPrice[0].discount;
    //     if (latest_price == price && latest_discount == discount) {
    //       return res.status(400).send(ErrorList["No changes"]);
    //     }
    //     ItemPriceModel.update({
    //       item_id: item_id,
    //       item_unit_id: item_unit_id,
    //       price: price,
    //       discount: discount,
    //       created_by: userID,
    //       created_at: new Date(),
    //     })
    //       .then(([_, result]) => {
    //         const socket = new SocketHelper("updateItemPrice", result);
    //         socket.create();
    //         return res.status(201).send(result);
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on updating item price. ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item price. ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
ProductPurchasePriceController.updateByIDV2 = (req, res) => {
    // const data = req.body.data as any[];
    // const userID = req.body.userId;
    // ItemPriceModel.updateV2(data, userID)
    //   .then((result) => {
    //     return res.status(201).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on updating item price. ${error}`);
    //     return res.status(500).send(error);
    //   });
};
/**
 * Upload data in bulk
 * Handle bulk upload of item prices
 * @param req
 * @param res
 */
ProductPurchasePriceController.createBulk = (req, res) => {
    // const items = req.body as any[];
    // const userID = req.body.userId;
    // const transactions: any[] = items.map((x) => {
    //   return ItemPriceModel.delete({
    //     item_id: x.id,
    //     deleted_by: userID,
    //     item_unit_id: x.item_unit_id,
    //   });
    // });
    // transactions.push(
    //   ItemPriceModel.createMany(
    //     items.map((x) => {
    //       return {
    //         item_id: x.id,
    //         item_unit_id: x.item_unit_id,
    //         price: x.price,
    //         discount: x.discount,
    //         created_by: userID,
    //         created_at: new Date(),
    //       };
    //     })
    //   )
    // );
    // Promise.all(transactions)
    //   .then((result) => {
    //     return res.status(201).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on creating item price. ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
/**
 * Fetch item price by item ID
 * @param req
 * @param res
 */
ProductPurchasePriceController.fetchByItemID = (req, res) => {
    // const item_id = req.body.item_id;
    // const item_unit_id = req.body.item_unit_id;
    // ItemPriceModel.fetchByItemID(item_id, item_unit_id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     if (result.length == 0) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     return res.status(200).send(result[0]);
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
};
/**
 * Download format
 * @param req
 * @param res
 */
ProductPurchasePriceController.fetchFormat = async (req, res) => {
    // const brand_id = req.body.brand as number[];
    // const type_id = req.body.type as number[];
    // const setting = 0;
    // ItemModel.fetchItemPriceByBrandType(brand_id, type_id, setting)
    //   .then((items) => {
    //     return res.status(200).send(
    //       items.map((x) => {
    //         return [
    //           x.item_id,
    //           x.item_unit == null ? 0 : x.item_unit.id,
    //           x.item.reference,
    //           x.item.description,
    //           x.item.item_brand.name,
    //           x.item.item_type?.name,
    //           x.item_unit == null ? x.item.unit : x.item_unit.unit,
    //           x.item_unit == null ? 1 : x.item_unit.conversion,
    //           x.item_unit == null ? "" : x.item.unit,
    //           x.price,
    //           x.discount,
    //         ];
    //       })
    //     );
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item price. ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
//# sourceMappingURL=product-price-purchase.controller.js.map