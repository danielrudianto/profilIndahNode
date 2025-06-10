import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { meili, prisma } from "../app";
import { mongoProductModel } from "../mongo-model/mongo-product.model";
import { mongoStockCardModel } from "../mongo-model/mongo-stock-card.model";
import DepositModel from "../model/deposit.model";
import { translateKeyword, translatePage } from "../helper/escape.helper";

class ProductStockController {
  /**
   * Fetch product stock
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    const mode = req.query.mode;
    // switch (mode) {
    //   case "sales-alert":
    //     UserModel.fetchByID(req.body.userId).then(async (user) => {
    //       if (user?.role != 6) {
    //         // Fetch all just like plain
    //         const productStock = await mongoProductModel
    //           .find(
    //             {
    //               $and: [
    //                 {
    //                   $expr: {
    //                     $lt: ["$currentStock", "$minimumStock"],
    //                   },
    //                 },
    //                 {
    //                   $expr: {
    //                     $gte: ["$currentStock", 0],
    //                   },
    //                 },
    //                 {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: keyword,
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: keyword,
    //                       },
    //                     },
    //                   ],
    //                 },
    //               ],
    //             },
    //             "itemID reference description unit currentStock minimumStock"
    //           )
    //           .limit(10)
    //           .skip((page - 1) * 10);

    //         return res.status(200).send({
    //           data: productStock.map((x) => {
    //             return {
    //               id: x.itemID,
    //               reference: x.reference,
    //               description: x.description,
    //               stock: x.currentStock,
    //               unit: x.unit,
    //               minimum_stock: x.minimumStock,
    //             };
    //           }),
    //         });
    //       } else {
    //         // Fetch only product that he is able
    //         const types = user.user_sales.map((x) => x.item_type.id);
    //         const productStock = await mongoProductModel
    //           .find(
    //             {
    //               $and: [
    //                 {
    //                   $expr: {
    //                     $lt: ["$currentStock", "$minimumStock"],
    //                   },
    //                 },
    //                 {
    //                   $expr: {
    //                     $gte: ["$currentStock", 0],
    //                   },
    //                 },
    //                 {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: keyword,
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: keyword,
    //                       },
    //                     },
    //                   ],
    //                 },
    //                 {
    //                   itemTypeID: {
    //                     $in: types,
    //                   },
    //                 },
    //               ],
    //             },
    //             "itemID reference description unit currentStock minimumStock"
    //           )
    //           .limit(10)
    //           .skip((page - 1) * 10);

    //         return res.status(200).send({
    //           data: productStock.map((x) => {
    //             return {
    //               id: x.itemID,
    //               reference: x.reference,
    //               description: x.description,
    //               stock: x.currentStock,
    //               unit: x.unit,
    //               minimum_stock: x.minimumStock,
    //             };
    //           }),
    //         });
    //       }
    //     });
    //     break;
    //   case "sales-alert-inventory":
    //     UserModel.fetchByID(req.body.userId).then(async (user) => {
    //       if (user?.role != 6) {
    //         // Fetch all just like plain
    //         const productStock = await mongoProductModel.find(
    //           {
    //             $and: [
    //               {
    //                 $expr: {
    //                   $lt: ["$currentStock", "$minimumStock"],
    //                 },
    //               },
    //               {
    //                 $expr: {
    //                   $gte: ["$currentStock", 0],
    //                 },
    //               },
    //               {
    //                 $or: [
    //                   {
    //                     reference: {
    //                       $regex: keyword,
    //                     },
    //                   },
    //                   {
    //                     description: {
    //                       $regex: keyword,
    //                     },
    //                   },
    //                 ],
    //               },
    //             ],
    //           },
    //           "itemID reference description unit currentStock minimumStock"
    //         );

    //         return res.status(200).send({
    //           data: productStock.map((x) => {
    //             return {
    //               id: x.itemID,
    //               reference: x.reference,
    //               description: x.description,
    //               stock: x.currentStock,
    //               unit: x.unit,
    //               minimum_stock: x.minimumStock,
    //             };
    //           }),
    //         });
    //       } else {
    //         // Fetch only product that he is able
    //         const types = user.user_sales.map((x) => x.item_type.id);
    //         const productStock = await mongoProductModel.find(
    //           {
    //             $and: [
    //               {
    //                 $expr: {
    //                   $lt: ["$currentStock", "$minimumStock"],
    //                 },
    //               },
    //               {
    //                 $expr: {
    //                   $gte: ["$currentStock", 0],
    //                 },
    //               },
    //               {
    //                 $or: [
    //                   {
    //                     reference: {
    //                       $regex: keyword,
    //                     },
    //                   },
    //                   {
    //                     description: {
    //                       $regex: keyword,
    //                     },
    //                   },
    //                 ],
    //               },
    //               {
    //                 itemTypeID: {
    //                   $in: types,
    //                 },
    //               },
    //             ],
    //           },
    //           "itemID reference description unit currentStock minimumStock"
    //         );

    //         return res.status(200).send({
    //           data: productStock.map((x) => {
    //             return {
    //               id: x.itemID,
    //               reference: x.reference,
    //               description: x.description,
    //               stock: x.currentStock,
    //               unit: x.unit,
    //               minimum_stock: x.minimumStock,
    //             };
    //           }),
    //         });
    //       }
    //     });
    //     break;
    //   case "sales":
    //     UserModel.fetchByID(req.body.userId).then((user) => {
    //       if (user?.role != 6) {
    //         // Fetch all just like plain
    //         meili
    //           .index("item")
    //           .search(keyword, {
    //             limit: 10,
    //             offset: (page - 1) * 10,
    //           })
    //           .then(async (result) => {
    //             Promise.all([
    //               DepositModel.fetchByItemIDs(result.hits.map((x) => x.id)),
    //               mongoProductModel.find(
    //                 {
    //                   itemID: {
    //                     $in: result.hits.map((x) => x.id),
    //                   },
    //                 },
    //                 "itemID unit currentStock minimumStock"
    //               ),
    //             ]).then(([depositStock, productStock]) => {
    //               console.log(depositStock);
    //               return res.status(200).send({
    //                 data: result.hits.map((x) => {
    //                   const stockIndex = productStock.findIndex(
    //                     (y) => y.itemID == x.id
    //                   );
    //                   return {
    //                     id: x.id,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock:
    //                       stockIndex == -1
    //                         ? 0
    //                         : productStock[stockIndex].currentStock,
    //                     unit:
    //                       stockIndex == -1 ? "" : productStock[stockIndex].unit,
    //                     item_brand_id: x.itemBrandID,
    //                     item_type_id: x.itemTypeID,
    //                     item_brand_name: x.brand,
    //                     item_type_name: x.type,
    //                     minimum_stock:
    //                       stockIndex == -1
    //                         ? 0
    //                         : productStock[stockIndex].minimumStock,
    //                     deposit: depositStock
    //                       .filter((y) => y.item_id == x.id)
    //                       .reduce((a, b) => a + Number(b.quantity), 0),
    //                   };
    //                 }),
    //               });
    //             });
    //           });
    //       } else {
    //         // Fetch only product that he is able
    //         const types = user.user_sales.map((x) => x.item_type.id);
    //         meili
    //           .index("item")
    //           .search(keyword, {
    //             limit: 10,
    //             offset: (page - 1) * 10,
    //             filter: `itemTypeID = ${types.join(" OR itemTypeID = ")}`,
    //           })
    //           .then(async (result) => {
    //             Promise.all([
    //               DepositModel.fetchByItemIDs(result.hits.map((x) => x.id)),
    //               mongoProductModel.find(
    //                 {
    //                   itemID: {
    //                     $in: result.hits.map((x) => x.id),
    //                   },
    //                 },
    //                 "itemID unit currentStock minimumStock"
    //               ),
    //             ]).then(([depositStock, productStock]) => {
    //               return res.status(200).send({
    //                 data: result.hits.map((x) => {
    //                   const stockIndex = productStock.findIndex(
    //                     (y) => y.itemID == x.id
    //                   );
    //                   return {
    //                     id: x.id,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock:
    //                       stockIndex == -1
    //                         ? 0
    //                         : productStock[stockIndex].currentStock,
    //                     unit:
    //                       stockIndex == -1 ? "" : productStock[stockIndex].unit,
    //                     item_brand_id: x.itemBrandID,
    //                     item_type_id: x.itemTypeID,
    //                     item_brand_name: x.brand,
    //                     item_type_name: x.type,
    //                     minimum_stock:
    //                       stockIndex == -1
    //                         ? 0
    //                         : productStock[stockIndex].minimumStock,
    //                     deposit: depositStock
    //                       .filter((y) => y.item_id == x.id)
    //                       .reduce((a, b) => a + Number(b.quantity), 0),
    //                   };
    //                 }),
    //               });
    //             });
    //           });
    //       }
    //     });
    //     break;
    //   case "problem":
    //     Promise.all([
    //       mongoProductModel
    //         .find({
    //           $or: [
    //             {
    //               reference: {
    //                 $regex: keyword,
    //               },
    //             },
    //             {
    //               description: {
    //                 $regex: keyword,
    //               },
    //             },
    //           ],
    //           currentStock: {
    //             $lt: 0,
    //           },
    //         })
    //         .sort({ reference: 1 })
    //         .limit(10)
    //         .skip((page - 1) * 10),
    //       mongoProductModel.countDocuments({
    //         currentStock: {
    //           $lt: 0,
    //         },
    //       }),
    //     ]).then((result) => {
    //       return res.status(200).send({
    //         data: result[0].map((x) => {
    //           return {
    //             id: x.itemID,
    //             reference: x.reference,
    //             description: x.description,
    //             stock: x.currentStock,
    //             unit: x.unit,
    //             item_brand_id: x.itemBrandID,
    //             item_type_id: x.itemTypeID,
    //           };
    //         }),
    //         count: result[1],
    //       });
    //     });
    //     break;
    //   case "dashboard":
    //     mongoProductModel
    //       .countDocuments({
    //         $expr: {
    //           $lt: ["$currentStock", "$minimumStock"],
    //         },
    //       })
    //       .then((result) => {
    //         return res.status(200).send({
    //           count: result,
    //         });
    //       })
    //       .catch((error) => {
    //         console.error(
    //           `[error]: Error while fetching product stock. ${error}`
    //         );
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //     break;
    //   case "plain":
    //   default:
    //     meili
    //       .index("item")
    //       .search(keyword, {
    //         limit: 10,
    //         offset: (page - 1) * 10,
    //       })
    //       .then(async (result) => {
    //         const productStock = await mongoProductModel.find(
    //           {
    //             itemID: {
    //               $in: result.hits.map((x) => x.id),
    //             },
    //           },
    //           "itemID unit currentStock"
    //         );

    //         return res.status(200).send({
    //           data: result.hits.map((x) => {
    //             const stockIndex = productStock.findIndex(
    //               (y) => y.itemID == x.id
    //             );
    //             return {
    //               id: x.id,
    //               reference: x.reference,
    //               description: x.description,
    //               stock:
    //                 stockIndex == -1
    //                   ? 0
    //                   : productStock[stockIndex].currentStock,
    //               unit: stockIndex == -1 ? "" : productStock[stockIndex].unit,
    //               item_brand_id: x.itemBrandID,
    //               item_type_id: x.itemTypeID,
    //               item_brand_name: x.brand,
    //               item_type_name: x.type,
    //             };
    //           }),
    //           count: result.estimatedTotalHits,
    //         });
    //       });
    //     break;
    // }
  };

  static fetchMetaByID = (req: Request, res: Response) => {
    const itemID = parseInt(req.params.id);
    // ItemModel.fetchMetaByID(itemID)
    //   .then(([item, deposit]) => {
    //     if (!item) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     } else {
    //       return res.status(200).send({
    //         id: item.id,
    //         reference: item.reference,
    //         description: item.description,
    //         brand: item.item_brand.name,
    //         type: item.item_type.name,
    //         unit: item.unit,
    //         deposit: deposit.reduce((a, b) => {
    //           return (
    //             a +
    //             Number(b.quantity) *
    //               (b.item_unit == null ? 1 : Number(b.item_unit!.conversion))
    //           );
    //         }, 0),
    //       });
    //     }
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error while fetching product. ${error}`);
    //     return res.status(500).send(error);
    //   });
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

    const stockCardLength = await mongoStockCardModel.countDocuments({
      itemID: itemID,
    });

    if (!product) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    const stockCards = await mongoStockCardModel
      .find({
        itemID: itemID,
      })
      .sort({
        date: -1,
        _id: -1,
      })
      .limit(10)
      .skip((page - 1) * 10);

    return res.status(200).send({
      data: stockCards.map((x) => {
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
      count: stockCardLength,
    });
  };

  static create = async (req: Request, res: Response) => {
    // const mode = req.body.mode;
    // switch (mode) {
    //   case "inadequate-pagination":
    //     const inadequateBrandID = req.body.brands as number[];
    //     const inadequateTypeID = req.body.types as number[];
    //     const page = req.body.page as number;
    //     const keyword = req.body.keyword.toString();
    //     if (inadequateBrandID.length == 0 && inadequateTypeID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 keyword == ""
    //                   ? {}
    //                   : {
    //                       $or: [
    //                         {
    //                           reference: {
    //                             $regex: keyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                         {
    //                           description: {
    //                             $regex: keyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                       ],
    //                     },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: page * 10,
    //           },
    //           {
    //             $skip: (page - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //             },
    //             { $expr: { $gte: ["$currentStock", 0] } },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else if (inadequateBrandID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 {
    //                   itemTypeID: {
    //                     $in: inadequateTypeID,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: page * 10,
    //           },
    //           {
    //             $skip: (page - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //             },
    //             { $expr: { $gte: ["$currentStock", 0] } },
    //             {
    //               itemTypeID: {
    //                 $in: inadequateTypeID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else if (inadequateTypeID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 {
    //                   itemBrandID: {
    //                     $in: inadequateBrandID,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: page * 10,
    //           },
    //           {
    //             $skip: (page - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //             },
    //             { $expr: { $gte: ["$currentStock", 0] } },
    //             {
    //               itemBrandID: {
    //                 $in: inadequateBrandID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 {
    //                   itemBrandID: {
    //                     $in: inadequateBrandID,
    //                   },
    //                 },
    //                 {
    //                   itemTypeID: {
    //                     $in: inadequateTypeID,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: page * 10,
    //           },
    //           {
    //             $skip: (page - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //             },
    //             { $expr: { $gte: ["$currentStock", 0] } },
    //             {
    //               itemBrandID: {
    //                 $in: inadequateBrandID,
    //               },
    //             },
    //             {
    //               itemTypeID: {
    //                 $in: inadequateTypeID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     }
    //     break;
    //   case "inadequate":
    //     const brand_id = req.body.brand as number[];
    //     const type_id = req.body.type as number[];
    //     if (brand_id.length == 0 && type_id.length == 0) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     } else if (brand_id.length == 0) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 {
    //                   itemTypeID: {
    //                     $in: type_id,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     } else if (type_id.length == 0) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", "$minimumStock"] },
    //                 },
    //                 { $expr: { $gte: ["$currentStock", 0] } },
    //                 {
    //                   itemBrandID: {
    //                     $in: brand_id,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     }
    //     break;
    //   case "mutation":
    //     const mutationItemID = req.body.itemID;
    //     const date = req.body.date;
    //     const offset = req.body.offset;
    //     const startDate = new Date(date);
    //     const startUTCDate = new Date(startDate.getTime() + offset * 60000);
    //     const endDate = new Date(date);
    //     endDate.setDate(endDate.getDate() + 1);
    //     const endUTCDate = new Date(endDate.getTime() + offset * 60000);
    //     const day = new Date(date).getDate();
    //     const month = new Date(date).getMonth();
    //     const year = new Date(date).getFullYear();
    //     const product = await mongoProductModel.findOne({
    //       itemID: mutationItemID,
    //     });
    //     mongoStockCardModel
    //       .find({
    //         itemID: mutationItemID,
    //         $or: [
    //           {
    //             $and: [
    //               {
    //                 date: {
    //                   $gte: new Date(year, month, day),
    //                 },
    //               },
    //               {
    //                 date: {
    //                   $lt: new Date(year, month, day + 1),
    //                 },
    //               },
    //             ],
    //           },
    //           {
    //             createdAt: {
    //               $gte: startUTCDate,
    //               $lt: endUTCDate,
    //             },
    //           },
    //         ],
    //       })
    //       .then((result) => {
    //         if (!result) {
    //           return res.status(404).send(ErrorList["Not found"]);
    //         } else {
    //           const documentBasedMutation = {
    //             initialStock:
    //               result.filter(
    //                 (x) =>
    //                   x.date.getDate() == day &&
    //                   x.date.getMonth() == month &&
    //                   x.date.getFullYear() == year
    //               ).length == 0
    //                 ? 0
    //                 : result
    //                     .filter(
    //                       (x) =>
    //                         x.date.getDate() == day &&
    //                         x.date.getMonth() == month &&
    //                         x.date.getFullYear() == year
    //                     )
    //                     .sort((a, b) => {
    //                       return a.createdAt.getTime() - b.createdAt.getTime();
    //                     })[0].currentStock -
    //                   result
    //                     .filter(
    //                       (x) =>
    //                         x.date.getDate() == day &&
    //                         x.date.getMonth() == month &&
    //                         x.date.getFullYear() == year
    //                     )
    //                     .sort((a, b) => {
    //                       return a.createdAt.getTime() - b.createdAt.getTime();
    //                     })[0].quantity,
    //             totalInput: result
    //               .filter(
    //                 (x) =>
    //                   x.date.getDate() == day &&
    //                   x.date.getMonth() == month &&
    //                   x.date.getFullYear() == year
    //               )
    //               .filter((x) => x.quantity > 0)
    //               .reduce((a, b) => {
    //                 return a + Number(b.quantity);
    //               }, 0),
    //             totalOutput: result
    //               .filter(
    //                 (x) =>
    //                   x.date.getDate() == day &&
    //                   x.date.getMonth() == month &&
    //                   x.date.getFullYear() == year
    //               )
    //               .filter((x) => x.quantity < 0)
    //               .reduce((a, b) => {
    //                 return a + Number(b.quantity);
    //               }, 0),
    //             mutation: result
    //               .filter(
    //                 (x) =>
    //                   x.date.getDate() == day &&
    //                   x.date.getMonth() == month &&
    //                   x.date.getFullYear() == year
    //               )
    //               .sort((a, b) => {
    //                 return a.createdAt.getTime() - b.createdAt.getTime();
    //               })
    //               .map((x) => {
    //                 return {
    //                   date: new Date(x.date),
    //                   defaultUnit: product!.unit,
    //                   createdAt: new Date(x.createdAt),
    //                   name: x.document,
    //                   displayQuantity: x.displayQuantity,
    //                   quantity: x.quantity,
    //                   stock: x.currentStock,
    //                   unit: x.unit,
    //                   opponent: x.opponent,
    //                   document_id:
    //                     x.salesReturnID != null
    //                       ? x.salesReturnCodeID
    //                       : x.billID != null
    //                       ? x.billCodeID
    //                       : x.goodReceiptID != null
    //                       ? x.goodReceiptCodeID
    //                       : x.adjustmentCaseID != null
    //                       ? x.adjustmentCaseCodeID
    //                       : null,
    //                 };
    //               }),
    //           };
    //           const inputBasedMutation = {
    //             initialStock:
    //               result.filter(
    //                 (x) =>
    //                   x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                   x.createdAt.getTime() < endUTCDate.getTime()
    //               ).length == 0
    //                 ? 0
    //                 : result
    //                     .filter(
    //                       (x) =>
    //                         x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                         x.createdAt.getTime() < endUTCDate.getTime()
    //                     )
    //                     .sort((a, b) => {
    //                       return a.createdAt.getTime() - b.createdAt.getTime();
    //                     })[0].currentStock -
    //                   result
    //                     .filter(
    //                       (x) =>
    //                         x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                         x.createdAt.getTime() < endUTCDate.getTime()
    //                     )
    //                     .sort((a, b) => {
    //                       return a.createdAt.getTime() - b.createdAt.getTime();
    //                     })[0].quantity,
    //             totalInput: result
    //               .filter(
    //                 (x) =>
    //                   x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                   x.createdAt.getTime() < endUTCDate.getTime()
    //               )
    //               .filter((x) => x.quantity > 0)
    //               .reduce((a, b) => {
    //                 return a + Number(b.quantity);
    //               }, 0),
    //             totalOutput: result
    //               .filter(
    //                 (x) =>
    //                   x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                   x.createdAt.getTime() < endUTCDate.getTime()
    //               )
    //               .filter((x) => x.quantity < 0)
    //               .reduce((a, b) => {
    //                 return a + Number(b.quantity);
    //               }, 0),
    //             mutation: result
    //               .filter(
    //                 (x) =>
    //                   x.createdAt.getTime() >= startUTCDate.getTime() &&
    //                   x.createdAt.getTime() < endUTCDate.getTime()
    //               )
    //               .sort((a, b) => {
    //                 return a.createdAt.getTime() - b.createdAt.getTime();
    //               })
    //               .map((x) => {
    //                 return {
    //                   date: new Date(x.date),
    //                   defaultUnit: product!.unit,
    //                   createdAt: new Date(x.createdAt),
    //                   name: x.document,
    //                   displayQuantity: x.displayQuantity,
    //                   quantity: x.quantity,
    //                   stock: x.currentStock,
    //                   unit: x.unit,
    //                   opponent: x.opponent,
    //                   document_id:
    //                     x.salesReturnID != null
    //                       ? x.salesReturnCodeID
    //                       : x.billID != null
    //                       ? x.billCodeID
    //                       : x.goodReceiptID != null
    //                       ? x.goodReceiptCodeID
    //                       : x.adjustmentCaseID != null
    //                       ? x.adjustmentCaseCodeID
    //                       : null,
    //                 };
    //               }),
    //           };
    //           return res.status(200).send({
    //             document: documentBasedMutation,
    //             input: inputBasedMutation,
    //           });
    //         }
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on fetching product ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //     break;
    //   case "problematic-pagination":
    //     const problematicBrandID = req.body.brands as number[];
    //     const problematicTypeID = req.body.types as number[];
    //     const problematicPage = req.body.page as number;
    //     const problematicKeyword = req.body.keyword.toString();
    //     if (problematicBrandID.length == 0 && problematicTypeID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 problematicKeyword == ""
    //                   ? {}
    //                   : {
    //                       $or: [
    //                         {
    //                           reference: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                         {
    //                           description: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                       ],
    //                     },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: problematicPage * 10,
    //           },
    //           {
    //             $skip: (problematicPage - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", 0] },
    //             },
    //             problematicKeyword == ""
    //               ? {}
    //               : {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                   ],
    //                 },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else if (problematicBrandID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 {
    //                   itemTypeID: {
    //                     $in: problematicTypeID,
    //                   },
    //                 },
    //                 problematicKeyword == ""
    //                   ? {}
    //                   : {
    //                       $or: [
    //                         {
    //                           reference: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                         {
    //                           description: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                       ],
    //                     },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: problematicPage * 10,
    //           },
    //           {
    //             $skip: (problematicPage - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", 0] },
    //             },
    //             problematicKeyword == ""
    //               ? {}
    //               : {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                   ],
    //                 },
    //             {
    //               itemTypeID: {
    //                 $in: problematicTypeID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else if (problematicTypeID.length == 0) {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 problematicKeyword == ""
    //                   ? {}
    //                   : {
    //                       $or: [
    //                         {
    //                           reference: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                         {
    //                           description: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                       ],
    //                     },
    //                 {
    //                   itemBrandID: {
    //                     $in: problematicBrandID,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: problematicPage * 10,
    //           },
    //           {
    //             $skip: (problematicPage - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", 0] },
    //             },
    //             problematicKeyword == ""
    //               ? {}
    //               : {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                   ],
    //                 },
    //             {
    //               itemBrandID: {
    //                 $in: problematicBrandID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     } else {
    //       Promise.all([
    //         mongoProductModel.aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 problematicKeyword == ""
    //                   ? {}
    //                   : {
    //                       $or: [
    //                         {
    //                           reference: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                         {
    //                           description: {
    //                             $regex: problematicKeyword,
    //                             $options: "i",
    //                           },
    //                         },
    //                       ],
    //                     },
    //                 {
    //                   itemBrandID: {
    //                     $in: problematicBrandID,
    //                   },
    //                 },
    //                 {
    //                   itemTypeID: {
    //                     $in: problematicTypeID,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //           {
    //             $limit: problematicPage * 10,
    //           },
    //           {
    //             $skip: (problematicPage - 1) * 10,
    //           },
    //         ]),
    //         mongoProductModel.countDocuments({
    //           $and: [
    //             {
    //               $expr: { $lt: ["$currentStock", 0] },
    //             },
    //             problematicKeyword == ""
    //               ? {}
    //               : {
    //                   $or: [
    //                     {
    //                       reference: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                     {
    //                       description: {
    //                         $regex: problematicKeyword,
    //                         $options: "i",
    //                       },
    //                     },
    //                   ],
    //                 },
    //             {
    //               itemBrandID: {
    //                 $in: problematicBrandID,
    //               },
    //             },
    //             {
    //               itemTypeID: {
    //                 $in: problematicTypeID,
    //               },
    //             },
    //           ],
    //         }),
    //       ])
    //         .then(([result, count]) => {
    //           ItemModel.fetchByIDs(result.map((x) => x.itemID))
    //             .then((items) => {
    //               return res.status(200).send({
    //                 data: result.map((x, index) => {
    //                   return {
    //                     id: x.itemID,
    //                     reference: x.reference,
    //                     description: x.description,
    //                     stock: x.currentStock,
    //                     minimum_stock: x.minimumStock,
    //                     unit: x.unit,
    //                     item_brand_name: items[index].item_brand_name,
    //                     item_type_name: items[index].item_type_name,
    //                   };
    //                 }),
    //                 count: count,
    //               });
    //             })
    //             .catch((error) => {
    //               console.error(
    //                 `[error]: Error on fetching inadequate product. ${error}`
    //               );
    //               return res
    //                 .status(500)
    //                 .send(ErrorList["Internal server error"]);
    //             });
    //         })
    //         .catch((error) => {
    //           console.error(
    //             `[error]: Error on fetching inadequate product. ${error}`
    //           );
    //           return res.status(500).send(ErrorList["Internal server error"]);
    //         });
    //     }
    //     break;
    //   case "problematic":
    //     const problematic_brand_id = req.body.brand as number[];
    //     const problematic_type_id = req.body.type as number[];
    //     if (
    //       problematic_brand_id.length == 0 &&
    //       problematic_type_id.length == 0
    //     ) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     } else if (problematic_brand_id.length == 0) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 {
    //                   itemTypeID: {
    //                     $in: problematic_type_id,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     } else if (problematic_type_id.length == 0) {
    //       mongoProductModel
    //         .aggregate([
    //           {
    //             $match: {
    //               $and: [
    //                 {
    //                   $expr: { $lt: ["$currentStock", 0] },
    //                 },
    //                 {
    //                   itemBrandID: {
    //                     $in: problematic_brand_id,
    //                   },
    //                 },
    //               ],
    //             },
    //           },
    //           {
    //             $project: {
    //               itemID: 1,
    //               currentStock: 1,
    //               minimumStock: 1,
    //               unit: 1,
    //               reference: 1,
    //               description: 1,
    //             },
    //           },
    //           {
    //             $sort: {
    //               reference: 1,
    //             },
    //           },
    //         ])
    //         .then((result) => {
    //           return res.status(200).send(
    //             result.map((x) => {
    //               return {
    //                 reference: x.reference,
    //                 description: x.description,
    //                 stock: x.currentStock,
    //                 minimum_stock: x.minimumStock,
    //                 unit: x.unit,
    //               };
    //             })
    //           );
    //         });
    //     }
    //     break;
    // }
  };
}

export default ProductStockController;
