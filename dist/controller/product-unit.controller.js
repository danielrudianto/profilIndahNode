"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductUnitController = void 0;
class ProductUnitController {
    constructor(productUnitRepository) {
        this.fetch = async (req, res) => { };
        this.create = async (req, res) => { };
        this.productUnitRepository = productUnitRepository;
    }
}
exports.ProductUnitController = ProductUnitController;
/**
 * Update item unit
 * @param req
 * @param res
 */
ProductUnitController.create = (req, res) => {
    // const itemID = req.body.item_id;
    // const itemUnit = req.body.item_unit as string;
    // const itemUnits = req.body.item_units as any[];
    // const userID = req.body.userId;
    // ItemModel.fetchByID(itemID)
    //   .then((item) => {
    //     if (!item) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     if (item.length == 0) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     if (item[0].is_delete) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     ItemUnitModel.update({
    //       item_id: itemID,
    //       unit: itemUnit,
    //       units: itemUnits,
    //       created_by: userID,
    //     })
    //       .then((result) => {
    //         return res.status(201).send(result);
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on creating item unit ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item by ID ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
/**
 * Fetch item unit by item ID
 * @param req
 * @param res
 */
ProductUnitController.fetch = (req, res) => {
    // const id = parseInt(req.params.id);
    // ItemUnitModel.fetchByItemID(id, ItemUnitMode.Plain)!
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item by ID ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
/**
 * Fetch sales price based on itemID
 * @param req
 * @param res
 */
ProductUnitController.fetchByID = (req, res) => {
    // const id = parseInt(req.params.id);
    // ItemUnitModel.fetchByItemID(id, ItemUnitMode.Sales)!
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     const anyResult = result as any;
    //     const index = (anyResult.item_price as any[]).findIndex(
    //       (x) => x.item_unit_id == null
    //     );
    //     return res.status(200).send({
    //       id: result.id,
    //       reference: result.reference,
    //       description: result.description,
    //       unit: result.unit,
    //       price: index > -1 ? (anyResult.item_price as any[])[index].price : 0,
    //       item_unit: result.item_unit.map((x) => {
    //         const idx = (anyResult.item_price as any[]).findIndex(
    //           (y) => y.item_unit_id == x.id
    //         );
    //         return {
    //           id: x.id,
    //           unit: x.unit,
    //           conversion: x.conversion,
    //           price: idx > -1 ? (anyResult.item_price as any[])[idx].price : 0,
    //         };
    //       }),
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching item by ID ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
//# sourceMappingURL=product-unit.controller.js.map