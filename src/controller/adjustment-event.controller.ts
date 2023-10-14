import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import AdjustmentCaseModel, {
  IAdjustmentCaseCode,
} from "../model/adjustment-case.model";
import ProductStockModel from "../model/product-stock.model";

class AdjustmentCaseController {
  /**
   * Create new adjustment case
   * Adjustment case is a list of item that will be added or removed from stock
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = this.generateName(new Date(req.body.date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const type = req.body.type;

    const adjustmentCase: IAdjustmentCaseCode = {
      name: name,
      date: new Date(req.body.date),
      created_by: userID,
      company_id: companyID,
      adjustment_case: req.body.adjustment_case.map((x: any) => {
        return {
          item_id: x.item_id,
          item_unit_id: x.item_unit_id,
          quantity: (type == 0 ? 1 : -1) * x.quantity,
        };
      }),
    };

    // Insert adjustment case code
    AdjustmentCaseModel.create(adjustmentCase)
      .then(async (result) => {
        if (!result) {
          return res.status(500).send(ErrorList["Internal server error"]);
        }

        try {
          await ProductStockModel.updateStock(
            result.adjustment_case.map((x) => {
              const quantity =
                parseFloat(x.quantity.toString()) *
                (x.item_unit == null
                  ? 1
                  : parseFloat(x.item_unit.conversion.toString()));
              return {
                item_id: x.item.id,
                quantity: quantity,
              };
            })
          );

          await queue.add("create-adjustment-case", result);

          return res.status(201).send(result);
        } catch (error) {
          console.error(`[error]: Error on create adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on create adjustment case: ${error}`);
        return res.status(500).send(error);
      });
  };

  /**
   * Generate adjustment case name
   * Generating name of adjustment case code based on date
   * @param date
   * @returns string
   */
  static generateName = (date: Date) => {
    return `ADJ-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  };

  /**
   * Fetch all adjustment case
   * Fetch all adjustment case code
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    AdjustmentCaseModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching adjustment case: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch archive adjustment case
   * Fetch all adjustment case code that has been archived
   * @param req
   * @param res
   */

  static fetchArchives = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      AdjustmentCaseModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                count: parseInt(x.count.toString()),
              };
            })
          );
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      AdjustmentCaseModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (req.query.year != undefined && req.query.month != undefined) {
      const year = parseInt(req.query.year.toString());
      const month = parseInt(req.query.month.toString());
      const page =
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());

      AdjustmentCaseModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                company:
                  (x.company_id == null) == null
                    ? null
                    : {
                        id: x.company_id,
                        name: x.company_name,
                      },
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString()),
          });
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      return res.status(400).send(ErrorList["Parameter error"]);
    }
  };

  /**
   * Fetch adjustment case by id
   * Fetch adjustment case code by id
   * @param req
   * @param res
   */
  static fetchCodeByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    AdjustmentCaseModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching adjustment case: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete adjustment case
   * Delete adjustment case code by id
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    AdjustmentCaseModel.fetchByID(id).then((adjustmentCase) => {
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      AdjustmentCaseModel.deleteByID(id)
        .then(async (result) => {
          if (!result) {
            return res.status(404).send(ErrorList["Not found"]);
          }

          const socket = new SocketHelper("deleteAdjustmentCase", result);
          socket.create();

          try {
            await ProductStockModel.updateStock(
              result.adjustment_case.map((x) => {
                return {
                  item_id: x.item.id,
                  quantity:
                    parseFloat(x.quantity.toString()) *
                    -1 *
                    (x.item_unit == null
                      ? 1
                      : parseFloat(x.item_unit.conversion.toString())),
                };
              })
            );

            return res.status(200).send(result);
          } catch (error) {
            console.error(
              `[error]: Error on deleting adjustment case: ${error}`
            );
            return res.status(500).send(ErrorList["Internal server error"]);
          }
        })
        .catch((error) => {
          console.error(`[error]: Error on deleting adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };
}

export default AdjustmentCaseController;
