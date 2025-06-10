import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { translateKeyword, translatePage } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { ProductPurchasePriceRepository } from "../repositories/product-purchase-price.repository";
import { ProductRepository } from "../repositories/product.repository";

class ItemPurchasePriceController {
  private productRepository: ProductRepository;
  private productPurchasePriceRepository: ProductPurchasePriceRepository;

  constructor(
    productPurchasePriceRepository: ProductPurchasePriceRepository,
    productRepository: ProductRepository
  ) {
    this.productPurchasePriceRepository = productPurchasePriceRepository;
    this.productRepository = productRepository;
  }

  createMany = async (req: Request, res: Response) => {
    const data = req.body.data as any[];
    const userID = req.body.userId;

    try {
      const result = await this.productPurchasePriceRepository.createMany(
        data.map((x) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            price: x.price,
            discount: x.discount,
            created_by: userID,
          };
        })
      );

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating item purchase price: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const price = req.body.price;
    const discount = req.body.discount;
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const userID = req.body.userId;

    const result = await this.productPurchasePriceRepository.update({
      item_id: item_id,
      item_unit_id: item_unit_id,
      created_at: new Date(),
      created_by: userID,
      price: price,
      discount: discount,
    });

    return res.status(201).send(result);
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT!);

    const result = await this.productPurchasePriceRepository.fetch({
      page: page,
      pageSize: pageSize,
      keyword: keyword,
    });
  };

  fetchByID = async (req: Request, res: Response) => {
    const itemID = req.body.item_id;
    const itemUnitID = req.body.item_unit_id;
    try {
      const result = await this.productPurchasePriceRepository.fetchByID(
        itemID,
        itemUnitID
      );

      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error while fetching item purchase price by ID: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByItemID = async (req: Request, res: Response) => {
    const itemID = Number(req.params.id);
    try {
      const product = await this.productRepository.fetchByID(itemID);
      if (!product) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.productPurchasePriceRepository.fetchByItemID(
        itemID
      );

      return res.status(200).send({
        ...product,
        item_price: result,
      });
    } catch (error) {
      console.error(
        `[error]: Error while fetching item purchase price: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Fetch item purchase price by keyword and pagination
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    // const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    // const page = !req.query.page
    //   ? 1
    //   : Math.max(1, parseInt(req.query.page.toString()));
    // const limit = parseInt(process.env.LIMIT!);
    // const offset = (page - 1) * limit;
    // ItemPurchasePriceModel.fetch(keyword, offset, limit)
    //   .then(([result, count]) => {
    //     return res.status(200).send({
    //       data: result.map((x) => {
    //         return {
    //           id: x.id,
    //           reference: x.reference,
    //           description: x.description,
    //           count: parseInt(x.count.toString()),
    //           price: x.price,
    //           discount: x.discount,
    //         };
    //       }),
    //       count: count,
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error while fetching item price: ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  static updateV2 = (req: Request, res: Response) => {
    const data = req.body.data;
    const userID = req.body.userId;
    // Validation 1.
    // Check if there is any set that has discount > price
    // if (data.filter((x: any) => x.discount > x.price).length > 0) {
    //   return res.status(400).send(ErrorList["Discount > price"]);
    // } else {
    //   ItemPurchasePriceModel.updateMany(data, userID)
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
   * Create item purchase price in bulk
   * @param req
   * @param res
   */
  static createBulk = async (req: Request, res: Response) => {
    // const data = req.body.data as any[];
    // const userID = req.body.userId;
    // try {
    //   await ItemPurchasePriceModel.delete(
    //     data.map((x) => {
    //       return {
    //         item_id: x.item_id,
    //         item_unit_id: x.item_unit_id,
    //         deleted_by: userID,
    //       };
    //     })
    //   );
    //   const result = await ItemPurchasePriceModel.create(
    //     data.map((x) => {
    //       return {
    //         item_id: x.item_id,
    //         item_unit_id: x.item_unit_id,
    //         price: x.price,
    //         discount: x.discount,
    //         created_by: userID,
    //       };
    //     })
    //   );
    //   return res.status(200).send(result);
    // } catch (error) {
    //   console.error(`[error]: Error on creating item price: ${error}`);
    //   return res.status(500).send(ErrorList["Internal server error"]);
    // }
  };

  /**
   * Fetch item purchase price Excel format
   * @param req
   * @param res
   *
   * @remaks Used to update item purchase price in bulk,
   * sending back an Excel file in base64 format with the current price
   *
   */
  static fetchFormat = (req: Request, res: Response) => {
    const brand_id = req.body.brand as number[];
    const type_id = req.body.type as number[];
    const setting = req.body.setting;

    // ItemModel.fetchItemPurchasePriceByBrandType(brand_id, type_id, setting)
    //   .then((items) => {
    //     return res.status(200).send(
    //       items.map((x) => {
    //         return [
    //           x.item_id,
    //           x.item_unit_id == null ? 0 : x.item_unit_id,
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
    //     console.error(`[error]: Error while fetching item price: ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };
}

export default ItemPurchasePriceController;
