import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { ItemModel } from "../model/item.model";
import ItemUnitModel from "../model/product-unit.model";

class ItemUnitController {
  static fetch = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemUnitModel.fetchByItemID(id, "plain")!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const item_unit = req.body.item_unit as string;
    const item_units = req.body.item_units as any[];
    const userID = req.body.userId;

    ItemModel.fetchById(item_id)
      .then((itemArray) => {
        if (itemArray == null || itemArray.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          const item = itemArray[0];
          if (item.is_delete) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            ItemUnitModel.update(item_id, item_unit, item_units, userID)
              .then((result) => {
                return res.status(200).send(result);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          }
        }
      })
      .catch((error) => {});

    console.log(item_id);
    console.log(item_unit);
    console.log(item_units);
  };

  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemUnitModel.fetchByItemID(id, "sales")!
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          const index = ((result as any).item_price as any[]).findIndex(
            (x) => x.item_unit_id == null
          );
          return res.status(200).send({
            id: result?.id,
            reference: result?.reference,
            description: result?.description,
            unit: result?.unit,
            price:
              index > -1
                ? ((result as any).item_price as any[])[index].price
                : 0,
            item_unit: result.item_unit.map((x) => {
              const idx = ((result as any).item_price as any[]).findIndex(
                (y) => y.item_unit_id == x.id
              );
              return {
                id: x.id,
                unit: x.unit,
                conversion: x.conversion,
                price:
                  idx > -1
                    ? ((result as any).item_price as any[])[idx].price
                    : 0,
              };
            }),
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ItemUnitController;
