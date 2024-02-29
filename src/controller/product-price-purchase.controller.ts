import { Request, Response } from "express";
import { ItemModel } from "../model/item.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";

class ItemPurchasePriceController {
  /**
   * Fetch item purchase price by item ID and item unit ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const itemID = req.body.item_id;
    const itemUnitID = req.body.item_unit_id;
    ItemPurchasePriceModel.fetchByID(itemID, itemUnitID)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result[0]);
      })
      .catch((error) => {
        console.error(
          `[error]: Error while fetching item price by ID: ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch item purchase price by keyword and pagination
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ItemPurchasePriceModel.fetch(keyword, offset, limit)
      .then(([result, count]) => {
        return res.status(200).send({
          data: result.map((x) => {
            return {
              id: x.id,
              reference: x.reference,
              description: x.description,
              count: parseInt(x.count.toString()),
              price: x.price,
              discount: x.discount,
            };
          }),
          count: count,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error while fetching item price: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update item purchase price
   * @param req
   * @param res
   */
  static update = (req: Request, res: Response) => {
    const price = req.body.price;
    const discount = req.body.discount;
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const userID = req.body.userId;
    ItemPurchasePriceModel.fetchByItemID(item_id, item_unit_id)
      .then(async (item) => {
        if (!item) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        const currentPrice = item.price;
        const currentDiscount = item.discount;

        if (currentDiscount == discount && currentPrice == price) {
          return res.status(200).send(item);
        }

        await ItemPurchasePriceModel.delete([
          {
            item_id: item_id,
            item_unit_id: item_unit_id,
            deleted_by: userID,
          },
        ]);

        ItemPurchasePriceModel.create([
          {
            price: price,
            discount: discount,
            item_id: item_id,
            item_unit_id: item_unit_id,
            created_by: userID,
          },
        ])
          .then((result) => {
            const socket = new SocketHelper("updatePurchasePrice", {
              item_id: item_id,
              item_unit_id: item_unit_id,
              price: price,
              discount: discount,
            });
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on updating item price: ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Create item purchase price in bulk
   * @param req
   * @param res
   */
  static createBulk = async (req: Request, res: Response) => {
    const data = req.body.data as any[];
    const userID = req.body.userId;
    try {
      await ItemPurchasePriceModel.delete(
        data.map((x) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            deleted_by: userID,
          };
        })
      );

      const result = await ItemPurchasePriceModel.create(
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

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating item price: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
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

    ItemModel.fetchItemPurchasePriceByBrandType(brand_id, type_id, setting)
      .then((items) => {
        return res.status(200).send(
          items.map((x) => {
            return [
              x.item_id,
              x.item_unit_id == null ? 0 : x.item_unit_id,
              x.item.reference,
              x.item.description,
              x.item.item_brand.name,
              x.item.item_type?.name,
              x.item_unit == null ? x.item.unit : x.item_unit.unit,
              x.item_unit == null
                ? 1
                : x.item_unit.conversion,
              x.item_unit == null ? "" : x.item.unit,
              x.price,
              x.discount,
            ];
          })
        );
      })
      .catch((error) => {
        console.error(`[error]: Error while fetching item price: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default ItemPurchasePriceController;
