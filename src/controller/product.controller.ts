import { Request, Response } from "express";
import { ICreateProductUnit, ProductModel } from "../model/product.model";

import ErrorList from "../assets/error_list";
import { ProductRepository } from "../repositories/product.repository";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductSalesPriceRepository } from "../repositories/product-sales-price.repository";
import { ProductPurchasePriceRepository } from "../repositories/product-purchase-price.repository";

import { meili } from "../helper/meili.helper";
import {
  translatePage,
  translateKeyword,
  translatePageSize,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";

class ProductController {
  private productRepository: ProductRepository;
  private productUnitRepository: ProductUnitRepository;
  private productSalesPriceRepository: ProductSalesPriceRepository;
  private productPurchasePriceRepository: ProductPurchasePriceRepository;

  constructor(
    productRepository: ProductRepository,
    productUnitRepository: ProductUnitRepository,
    productSalesPriceRepository: ProductSalesPriceRepository,
    productPurchasePriceRepository: ProductPurchasePriceRepository
  ) {
    this.productRepository = productRepository;
    this.productUnitRepository = productUnitRepository;
    this.productSalesPriceRepository = productSalesPriceRepository;
    this.productPurchasePriceRepository = productPurchasePriceRepository;
  }

  create = async (req: Request, res: Response) => {
    const reference = req.body.reference;
    const description = req.body.description;
    const brandID = req.body.brand;
    const typeID = req.body.type;
    const minimum_stock = req.body.minimum_stock;
    const userID = req.body.userId;
    const unit = req.body.unit;
    const price = req.body.price;
    const discount = req.body.discount;
    const purchase_price = req.body.purchase_price;
    const purchase_discount = req.body.purchase_discount;
    const created_at = new Date();

    const units = req.body.units as ICreateProductUnit[];

    try {
      const existingItem = await this.productRepository.fetchByReference(
        reference
      );

      if (existingItem != null) {
        return res.status(400).send(ErrorList["Reference unique constraint"]);
      }

      const product = await this.productRepository.create({
        reference: reference,
        description: description,
        brand_id: brandID,
        type_id: typeID,
        created_by: userID,
        created_at: created_at,
        minimum_stock: minimum_stock,
        unit: unit,
      });

      await this.productSalesPriceRepository.create({
        item_id: product.id!,
        item_unit_id: null,
        price: price,
        discount: discount,
        created_at: created_at,
        created_by: userID,
        effective_date: created_at,
      });

      await this.productPurchasePriceRepository.create({
        item_id: product.id!,
        item_unit_id: null,
        price: purchase_price,
        discount: purchase_discount,
        created_at: created_at,
        created_by: userID,
      });

      if (units.length > 0) {
        await this.productUnitRepository.create(
          units.map((x) => {
            return {
              item_id: product.id!,
              unit: x.unit,
              conversion: x.conversion,
              created_by: userID,
              created_at: created_at,
              item_price: {
                price: x.price,
                discount: x.discount,
              },
              item_price_purchase: {
                price: x.price_purchase,
                discount: x.discount_purchase,
              },
            };
          })
        );
      }

      // Add to Meilisearch index
      await queue.add("product-created", {
        id: product.id,
      });
      return res.status(201).send(product);
    } catch (error) {
      console.error(`[error]: Error on creating item ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    // const pageSize = Number(process.env.LIMIT!);
    const pageSize = translatePageSize(req.query.pageSize);
    const mode = req.query.mode;

    try {
      const result = await meili.index("item").search(keyword, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      return res.status(200).send({
        data: result.hits.map((x: any) => {
          return ProductModel.fromMeilisearch(x);
        }),
        count: result.estimatedTotalHits,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching items ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result = await this.productRepository.fetchAutocomplete(keyword);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetch autocomplete item ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching item by id ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  // fetch the complete data by ID
  // fetchCompleteById = async (req: Request, res: Response) => {
  //   const id = Number(req.params.id);
  //   try {
  //     const [product, units, item_purchase_price, item_sales_price] =
  //       await Promise.all([
  //         this.productRepository.fetchByID(id),
  //         this.productUnitRepository.fetchByItemID(id),
  //         this.productPurchasePriceRepository.fetchByItemID(id),
  //         this.productSalesPriceRepository.fetchByItemID(id),
  //       ]);

  //     if (!product) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     product.item_unit = units;
  //     product.item_price_purchase = item_purchase_price;
  //     product.item_price = item_sales_price;

  //     // return res.status(200).send(result);
  //   } catch (error) {
  //     console.error(`[error]: Error on fetching complete item by id ${error}`);
  //     return res.status(500).send(ErrorList["Internal server error"]);
  //   }
  // };

  // static fetch = async (req: Request, res: Response) => {
  //   const page: number = !req.query.page
  //     ? 1
  //     : Math.max(parseInt(req.query.page.toString()), 1);
  //   const limit = 10;
  //   const offset = (page - 1) * limit;
  //   const keyword = !req.query.keyword
  //     ? ""
  //     : mysql_real_escape_string(
  //         decodeURIComponent(req.query.keyword.toString())
  //       );
  //   const mode = req.query.mode;

  //   switch (mode) {
  //     case "purchase":
  //       ItemModel.fetch(keyword, offset, limit, 1)
  //         .then(async ([result, count]) => {
  //           const productStock = await mongoProductModel.aggregate([
  //             {
  //               $match: {
  //                 itemID: {
  //                   $in: (result as any[]).map((x) => x.id),
  //                 },
  //               },
  //             },
  //             {
  //               $project: {
  //                 itemID: "$itemID",
  //                 currentStock: "$currentStock",
  //               },
  //             },
  //           ]);

  //           return res.status(200).send({
  //             data: (result as any[]).map((x) => {
  //               const stockIndex = productStock.findIndex(
  //                 (item) => item.itemID == x.id
  //               );

  //               return {
  //                 id: x.id,
  //                 reference: x.reference,
  //                 description: x.description,
  //                 brand: x.item_brand.name,
  //                 unit: x.unit,
  //                 price:
  //                   x.item_price_purchase == null ||
  //                   x.item_price_purchase.length == 0
  //                     ? 0
  //                     : x.item_price_purchase[0].price,
  //                 discount:
  //                   x.item_price_purchase == null ||
  //                   x.item_price_purchase.length == 0
  //                     ? 0
  //                     : x.item_price_purchase[0].discount,
  //                 stock:
  //                   stockIndex == -1
  //                     ? 0
  //                     : productStock[stockIndex].currentStock,
  //                 unit_price: x.item_unit.map((y: any) => {
  //                   return {
  //                     id: y.id,
  //                     unit: y.unit,
  //                     conversion: y.conversion,
  //                     price:
  //                       y.item_price_purchase == null ||
  //                       y.item_price_purchase.length == 0
  //                         ? 0
  //                         : y.item_price_purchase[0].price,
  //                     discount:
  //                       y.item_price_purchase == null ||
  //                       y.item_price_purchase.length == 0
  //                         ? 0
  //                         : y.item_price_purchase[0].discount,
  //                     item_unit_id: y.id,
  //                   };
  //                 }),
  //               };
  //             }),
  //             count: count,
  //           });
  //         })
  //         .catch((error) => {
  //           console.error(`[error]: Error on fetching item ${error}`);
  //           return res.status(500).send(error);
  //         });
  //       break;
  //     case "sales":
  //       const [prices, products, count] = await ItemModel.fetch(
  //         keyword,
  //         offset,
  //         limit,
  //         2
  //       );

  //       const productStock = await mongoProductModel.aggregate([
  //         {
  //           $match: {
  //             itemID: {
  //               $in: (products as any[]).map((x) => x.id),
  //             },
  //           },
  //         },
  //         {
  //           $project: {
  //             itemID: "$itemID",
  //             currentStock: "$currentStock",
  //           },
  //         },
  //       ]);

  //       return res.status(200).send({
  //         data: (products as any[]).map((x) => {
  //           const priceIndex = (prices as any[]).findIndex(
  //             (item) => item.item_id == x.id && item.item_unit_id == null
  //           );

  //           const stockIndex = productStock.findIndex(
  //             (item) => item.itemID == x.id
  //           );

  //           return {
  //             id: x.id,
  //             reference: x.reference,
  //             description: x.description,
  //             brand: x.brand,
  //             unit: x.unit,
  //             stock:
  //               stockIndex == -1 ? 0 : productStock[stockIndex].currentStock,
  //             price: priceIndex == -1 ? 0 : (prices as any[])[priceIndex].price,
  //             discount:
  //               priceIndex == -1 ? 0 : (prices as any[])[priceIndex].discount,
  //             unit_price: (prices as any[])
  //               .filter(
  //                 (item) => item.item_id == x.id && item.item_unit_id != null
  //               )
  //               .map((unit) => {
  //                 return {
  //                   id: unit.id,
  //                   unit: unit.unit,
  //                   conversion: unit.conversion,
  //                   price: unit.price,
  //                   discount: unit.discount,
  //                   item_unit_id: unit.item_unit_id,
  //                 };
  //               }),
  //           };
  //         }),
  //         count: count,
  //       });
  //     case "plain":
  //       ItemModel.fetch(keyword, offset, limit, 3)
  //         .then((result) => {
  //           return res.status(200).send({
  //             data: (result[1] as any[]).map((x) => {
  //               return {
  //                 id: x.id,
  //                 reference: x.reference,
  //                 description: x.description,
  //                 brand: x.item_brand_name,
  //                 minimum_stock: x.minimum_stock,
  //                 unit: x.unit,
  //                 item_type_id: x.item_type_id,
  //                 item_brand_id: x.item_brand_id,
  //                 item_type: {
  //                   name: x.item_type_name,
  //                 },
  //                 item_brand: {
  //                   name: x.item_brand_name,
  //                 },
  //                 is_active: x.is_active == 1 ? true : false,
  //                 unit_price: (result[0] as any[])
  //                   .filter((item) => item.item_id == x.id)
  //                   .map((unit) => {
  //                     return {
  //                       id: unit.id,
  //                       unit: unit.unit,
  //                       conversion: unit.conversion,
  //                       item_unit_id: unit.id,
  //                     };
  //                   }),
  //               };
  //             }),
  //             count: result[2],
  //           });
  //         })
  //         .catch((error) => {
  //           return res.status(500).send(error);
  //         });
  //       break;
  //     case "return":
  //       ItemModel.fetch(keyword, offset, limit, 4)
  //         .then((result) => {
  //           return res.status(200).send({
  //             data: (result[1] as any[]).map((x) => {
  //               return {
  //                 id: x.id,
  //                 reference: x.reference,
  //                 description: x.description,
  //                 brand: x.item_brand_name,
  //                 minimum_stock: x.minimum_stock,
  //                 unit: x.unit,
  //                 item_type_id: x.item_type_id,
  //                 item_brand_id: x.item_brand_id,
  //                 item_type: {
  //                   name: x.item_type_name,
  //                 },
  //                 item_brand: {
  //                   name: x.item_brand_name,
  //                 },
  //                 is_active: x.is_active == 1 ? true : false,
  //                 unit_price: (result[0] as any[])
  //                   .filter((item) => item.item_id == x.id)
  //                   .map((unit) => {
  //                     return {
  //                       id: unit.id,
  //                       unit: unit.unit,
  //                       conversion: unit.conversion,
  //                       item_unit_id: unit.id,
  //                     };
  //                   }),
  //               };
  //             }),
  //             count: result[2],
  //           });
  //         })
  //         .catch((error) => {
  //           return res.status(500).send(error);
  //         });
  //       break;
  //     default:
  //       const [defaultResult, defaultCount] = await Promise.all([
  //         mongoProductModel
  //           .find({
  //             $or: [
  //               {
  //                 reference: {
  //                   $regex: RegExp(
  //                     keyword
  //                       .replace(/\\/g, "\\\\")
  //                       .replace(/\^/g, "\\^")
  //                       .replace(/\$/g, "\\$")
  //                       .replace(/\*/g, "\\*")
  //                       .replace(/\+/g, "\\+")
  //                       .replace(/\?/g, "\\?")
  //                       .replace(/\./g, "\\.")
  //                       .replace(/\(/g, "\\(")
  //                       .replace(/\)/g, "\\)")
  //                       .replace(/\[/g, "\\[")
  //                       .replace(/\]/g, "\\]")
  //                       .replace(/\{/g, "\\{")
  //                       .replace(/\}/g, "\\}")
  //                       .replace(/\,/g, "\\,")
  //                       .replace(/\=/g, "\\=")
  //                       .replace(/\!/g, "\\!")
  //                       .replace(/\:/g, "\\:")
  //                       .replace(/\//g, "\\/")
  //                       .replace(/\'/g, "\\'")
  //                       .replace(/\"/g, '\\"')
  //                       .replace(/\-/g, "\\-")
  //                       .replace(/\_/g, "\\_")
  //                       .replace(/\#/g, "\\#")
  //                       .replace(/\@/g, "\\@")
  //                       .replace(/\%/g, "\\%")
  //                       .replace(/\&/g, "\\&")
  //                       .replace(/\|/g, "\\|")
  //                       .replace(/\~/g, "\\~")
  //                       .replace(/\`/g, "\\`")
  //                       .replace(/\s{2,}/g, " "),
  //                     "i"
  //                   ),
  //                 },
  //               },
  //               {
  //                 description: {
  //                   $regex: RegExp(
  //                     keyword
  //                       .replace(/\\/g, "\\\\")
  //                       .replace(/\^/g, "\\^")
  //                       .replace(/\$/g, "\\$")
  //                       .replace(/\*/g, "\\*")
  //                       .replace(/\+/g, "\\+")
  //                       .replace(/\?/g, "\\?")
  //                       .replace(/\./g, "\\.")
  //                       .replace(/\(/g, "\\(")
  //                       .replace(/\)/g, "\\)")
  //                       .replace(/\[/g, "\\[")
  //                       .replace(/\]/g, "\\]")
  //                       .replace(/\{/g, "\\{")
  //                       .replace(/\}/g, "\\}")
  //                       .replace(/\,/g, "\\,")
  //                       .replace(/\=/g, "\\=")
  //                       .replace(/\!/g, "\\!")
  //                       .replace(/\:/g, "\\:")
  //                       .replace(/\//g, "\\/")
  //                       .replace(/\'/g, "\\'")
  //                       .replace(/\"/g, '\\"')
  //                       .replace(/\-/g, "\\-")
  //                       .replace(/\_/g, "\\_")
  //                       .replace(/\#/g, "\\#")
  //                       .replace(/\@/g, "\\@")
  //                       .replace(/\%/g, "\\%")
  //                       .replace(/\&/g, "\\&")
  //                       .replace(/\|/g, "\\|")
  //                       .replace(/\~/g, "\\~")
  //                       .replace(/\`/g, "\\`")
  //                       .replace(/\s{2,}/g, " "),
  //                     "i"
  //                   ),
  //                 },
  //               },
  //             ],
  //           })
  //           .sort({
  //             reference: 1,
  //           })
  //           .select("itemID")
  //           .limit(limit)
  //           .skip(offset),
  //         mongoProductModel.countDocuments({
  //           $or: [
  //             {
  //               reference: {
  //                 $regex: RegExp(
  //                   keyword
  //                     .replace(/\\/g, "\\\\")
  //                     .replace(/\^/g, "\\^")
  //                     .replace(/\$/g, "\\$")
  //                     .replace(/\*/g, "\\*")
  //                     .replace(/\+/g, "\\+")
  //                     .replace(/\?/g, "\\?")
  //                     .replace(/\./g, "\\.")
  //                     .replace(/\(/g, "\\(")
  //                     .replace(/\)/g, "\\)")
  //                     .replace(/\[/g, "\\[")
  //                     .replace(/\]/g, "\\]")
  //                     .replace(/\{/g, "\\{")
  //                     .replace(/\}/g, "\\}")
  //                     .replace(/\,/g, "\\,")
  //                     .replace(/\=/g, "\\=")
  //                     .replace(/\!/g, "\\!")
  //                     .replace(/\:/g, "\\:")
  //                     .replace(/\//g, "\\/")
  //                     .replace(/\'/g, "\\'")
  //                     .replace(/\"/g, '\\"')
  //                     .replace(/\-/g, "\\-")
  //                     .replace(/\_/g, "\\_")
  //                     .replace(/\#/g, "\\#")
  //                     .replace(/\@/g, "\\@")
  //                     .replace(/\%/g, "\\%")
  //                     .replace(/\&/g, "\\&")
  //                     .replace(/\|/g, "\\|")
  //                     .replace(/\~/g, "\\~")
  //                     .replace(/\`/g, "\\`")
  //                     .replace(/\s{2,}/g, " "),
  //                   "i"
  //                 ),
  //               },
  //             },
  //             {
  //               description: {
  //                 $regex: RegExp(
  //                   keyword
  //                     .replace(/\\/g, "\\\\")
  //                     .replace(/\^/g, "\\^")
  //                     .replace(/\$/g, "\\$")
  //                     .replace(/\*/g, "\\*")
  //                     .replace(/\+/g, "\\+")
  //                     .replace(/\?/g, "\\?")
  //                     .replace(/\./g, "\\.")
  //                     .replace(/\(/g, "\\(")
  //                     .replace(/\)/g, "\\)")
  //                     .replace(/\[/g, "\\[")
  //                     .replace(/\]/g, "\\]")
  //                     .replace(/\{/g, "\\{")
  //                     .replace(/\}/g, "\\}")
  //                     .replace(/\,/g, "\\,")
  //                     .replace(/\=/g, "\\=")
  //                     .replace(/\!/g, "\\!")
  //                     .replace(/\:/g, "\\:")
  //                     .replace(/\//g, "\\/")
  //                     .replace(/\'/g, "\\'")
  //                     .replace(/\"/g, '\\"')
  //                     .replace(/\-/g, "\\-")
  //                     .replace(/\_/g, "\\_")
  //                     .replace(/\#/g, "\\#")
  //                     .replace(/\@/g, "\\@")
  //                     .replace(/\%/g, "\\%")
  //                     .replace(/\&/g, "\\&")
  //                     .replace(/\|/g, "\\|")
  //                     .replace(/\~/g, "\\~")
  //                     .replace(/\`/g, "\\`")
  //                     .replace(/\s{2,}/g, " "),
  //                   "i"
  //                 ),
  //               },
  //             },
  //           ],
  //         }),
  //       ]);

  //       ItemModel.fetchByIDs(defaultResult.map((x: any) => x.itemID)).then(
  //         (items) => {
  //           return res.status(200).send({
  //             data: defaultResult
  //               .filter((x) => {
  //                 // Check if exist in items
  //                 const itemIndex = items.findIndex(
  //                   (item) => item.id == x.itemID
  //                 );

  //                 return itemIndex != -1;
  //               })
  //               .map((x) => {
  //                 const itemIndex = items.findIndex(
  //                   (item) => item.id == x.itemID
  //                 );

  //                 return {
  //                   ...items[itemIndex],
  //                   can_delete:
  //                     items[itemIndex].can_delete == "1" ? true : false,
  //                 };
  //               }),
  //             count: defaultCount,
  //           });
  //         }
  //       );
  //       break;
  //   }
  // };

  // /**
  //  * Fetch item by ID with price
  //  * @param req
  //  * @param res
  //  */
  // static fetchCompleteById = (req: Request, res: Response) => {
  //   const id = parseInt(req.params.id.toString());
  //   ItemModel.fetchByIDWithPrice(id)
  //     .then(([item, item_unit, item_price, item_price_purchase]) => {
  //       if (!item) {
  //         return res.status(404).send(ErrorList["Not found"]);
  //       }

  //       const price =
  //         item_price.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(item_price.filter((x) => x.item_unit_id == null)[0].price);

  //       const discount =
  //         item_price.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(
  //               item_price.filter((x) => x.item_unit_id == null)[0].discount
  //             );

  //       const purchase_price =
  //         item_price_purchase.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(
  //               item_price_purchase.filter((x) => x.item_unit_id == null)[0]
  //                 .price
  //             );

  //       const purchase_discount =
  //         item_price_purchase.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(
  //               item_price_purchase.filter((x) => x.item_unit_id == null)[0]
  //                 .discount
  //             );

  //       DepositModel.fetchByItemID(id)
  //         .then((deposit) => {
  //           const total_deposit = deposit.reduce(
  //             (a, b) => a + Number(b.quantity),
  //             0
  //           );
  //           return res.status(200).send({
  //             reference: item.reference,
  //             description: item.description,
  //             unit: item.unit,
  //             item_brand: item.item_brand.name,
  //             item_type: item.item_type.name,
  //             price: price,
  //             discount: discount,
  //             purchase_price: purchase_price,
  //             purchase_discount: purchase_discount,
  //             deposit: total_deposit,
  //             units: item_unit.map((x) => {
  //               const unitID = x.id;
  //               const unitPrice = item_price.filter(
  //                 (y) => y.item_unit_id == unitID
  //               );
  //               const unitPricePurchase = item_price_purchase.filter(
  //                 (y) => y.item_unit_id == unitID
  //               );

  //               const unitPrice_price =
  //                 unitPrice.length == 0 ? 0 : unitPrice[0].price;
  //               const unitPrice_discount =
  //                 unitPrice.length == 0 ? 0 : unitPrice[0].discount;

  //               const unitPricePurchase_price =
  //                 unitPricePurchase.length == 0
  //                   ? 0
  //                   : unitPricePurchase[0].price;
  //               const unitPricePurchase_discount =
  //                 unitPricePurchase.length == 0
  //                   ? 0
  //                   : unitPricePurchase[0].discount;

  //               return {
  //                 id: x.id,
  //                 unit: x.unit,
  //                 conversion: x.conversion,
  //                 price: unitPrice_price,
  //                 discount: unitPrice_discount,
  //                 price_purchase: unitPricePurchase_price,
  //                 discount_purchase: unitPricePurchase_discount,
  //               };
  //             }),
  //           });
  //         })
  //         .catch((error) => {
  //           console.error(
  //             `[error]: Error on fetching deposit by item id ${error}`
  //           );
  //           return res.status(500).send(ErrorList["Internal server error"]);
  //         });
  //     })
  //     .catch((error) => {
  //       console.error(
  //         `[error]: Error on fetching item By ID with price ${error}`
  //       );
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };

  // static fetchCompleteSalesById = (req: Request, res: Response) => {
  //   const id = parseInt(req.params.id.toString());
  //   ItemModel.fetchByIDWithPrice(id)
  //     .then(([item, item_unit, item_price, item_price_purchase]) => {
  //       if (!item) {
  //         return res.status(404).send(ErrorList["Not found"]);
  //       }

  //       const price =
  //         item_price.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(item_price.filter((x) => x.item_unit_id == null)[0].price);

  //       const discount =
  //         item_price.filter((x) => x.item_unit_id == null).length == 0
  //           ? 0
  //           : Number(
  //               item_price.filter((x) => x.item_unit_id == null)[0].discount
  //             );

  //       return res.status(200).send({
  //         reference: item.reference,
  //         description: item.description,
  //         unit: item.unit,
  //         item_brand: item.item_brand.name,
  //         item_type: item.item_type.name,
  //         price: price,
  //         discount: discount,
  //         minimum_stock: Number(item.minimum_stock),
  //         units: item_unit.map((x) => {
  //           const unitID = x.id;
  //           const unitPrice = item_price.filter(
  //             (y) => y.item_unit_id == unitID
  //           );

  //           const unitPrice_price =
  //             unitPrice.length == 0 ? 0 : unitPrice[0].price;
  //           const unitPrice_discount =
  //             unitPrice.length == 0 ? 0 : unitPrice[0].discount;

  //           return {
  //             id: x.id,
  //             unit: x.unit,
  //             conversion: x.conversion,
  //             price: unitPrice_price,
  //             discount: unitPrice_discount,
  //           };
  //         }),
  //       });
  //     })
  //     .catch((error) => {
  //       console.error(
  //         `[error]: Error on fetching item By ID with price ${error}`
  //       );
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };

  // /**
  //  * Update product data by ID
  //  * @param req
  //  * @param res
  //  */
  // static updateByID = (req: Request, res: Response) => {
  //   const id = req.body.id;
  //   const reference = req.body.reference;
  //   const description = req.body.description;
  //   const brand = parseInt(req.body.brand.toString());
  //   const type = parseInt(req.body.type.toString());
  //   const minimum_stock = req.body.minimum_stock;
  //   const unit = req.body.unit;
  //   const userID = req.body.userId;

  //   ItemModel.fetchByID(id).then((result) => {
  //     if (result.length == 0) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     if (result[0].is_delete == 1) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     Promise.all([
  //       ItemModel.update({
  //         id: id,
  //         reference: reference,
  //         description: description,
  //         brand_id: brand,
  //         type_id: type,
  //         updated_by: userID,
  //         minimum_stock: minimum_stock,
  //         unit: unit,
  //       }),
  //       meili.index("item").updateDocuments([
  //         {
  //           id: id,
  //           reference: reference,
  //           description: description,
  //         },
  //       ]),
  //       queue.add("updateItem", {
  //         id: id,
  //         reference: reference,
  //         description: description,
  //         unit: unit,
  //         item_type_id: type,
  //         item_brand_id: brand,
  //         minimumStock: minimum_stock,
  //       }),
  //     ])
  //       .then(([updateItemResult, _, __]) => {
  //         const socket = new SocketHelper("updateItem", updateItemResult);
  //         socket.create();

  //         return res.status(201).send(updateItemResult);
  //       })
  //       .catch((error) => {
  //         console.error(`[error]: Error on updating item ${error}`);
  //         return res.status(500).send(ErrorList["Internal server error"]);
  //       });
  //   });
  // };

  // /**
  //  * Delete item by ID
  //  * @param req
  //  * @param res
  //  */
  // static deleteByID = (req: Request, res: Response) => {
  //   const id = parseInt(req.params.id);
  //   const userID = req.body.userId;
  //   ItemModel.fetchByID(id)
  //     .then((item) => {
  //       if (item.length == 0) {
  //         return res.status(404).send(ErrorList["Not found"]);
  //       }

  //       if (item[0].can_delete == "0") {
  //         return res.status(404).send(ErrorList["Delete error"]);
  //       }

  //       Promise.all([
  //         ItemModel.delete(id, userID),
  //         meili.index("item").deleteDocument(id),
  //       ])
  //         .then(([deleteItemResult, _]) => {
  //           const socket = new SocketHelper("deleteItem", deleteItemResult);
  //           socket.create();
  //           return res.status(201).send(deleteItemResult);
  //         })
  //         .catch((error) => {
  //           console.error(`[error]: Error on deleting item ${error}`);
  //           return res.status(500).send(ErrorList["Internal server error"]);
  //         });
  //     })
  //     .catch((error) => {
  //       console.error(`[error]: Error on fething item by id [${id}] ${error}`);
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };

  // /**
  //  * Activate or deactivate item
  //  * @param req
  //  * @param res
  //  */
  // static activateByID = (req: Request, res: Response) => {
  //   const id = req.body.id;
  //   ItemModel.fetchByID(id).then((item) => {
  //     if (!item) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     if (item.length == 0) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     if (item[0].is_delete) {
  //       return res.status(404).send(ErrorList["Not found"]);
  //     }

  //     const currentStatus = item[0].is_active == 1;

  //     ItemModel.activateByID(id, !currentStatus)
  //       .then(async (result) => {
  //         await meili.index("item").updateDocuments([
  //           {
  //             id: id,
  //             is_active: currentStatus ? 0 : 1,
  //           },
  //         ]);

  //         const socket = new SocketHelper("updateItemActive", result);
  //         socket.create();

  //         return res.status(200).send(result);
  //       })
  //       .catch((error) => {
  //         console.error(`[error]: Error on activating item ${error}`);
  //         return res.status(500).send(ErrorList["Internal server error"]);
  //       });
  //   });
  // };
}

export default ProductController;
