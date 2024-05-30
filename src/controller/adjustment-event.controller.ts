import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import AdjustmentCaseModel, {
  IAdjustmentCaseCode,
} from "../model/adjustment-case.model";
import { StockInInterface } from "../interface/stock-in.interface";

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

    if (type == 0 && companyID == null) {
      return res.status(400).send(ErrorList["Parameter error"]);
    }

    // Insert adjustment case code
    AdjustmentCaseModel.create({
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
    })
      .then(async (result) => {
        if (!result) {
          return res.status(500).send(ErrorList["Internal server error"]);
        }

        const queueBody: StockInInterface[] = [];

        // Start inserting using queue
        for (let i = 0; i < result.adjustment_case.length; i++) {
          if (Number(result.adjustment_case[i].quantity) > 0) {
            // Added item
            const stockIn: StockInInterface = {
              itemID: result.adjustment_case[i].item.id,
              createdAt: result.created_at,
              date: result.date,
              document: result.name,
              opponent: "Internal",
              displayQuantity: Number(
                result.adjustment_case[i].quantity.toString()
              ),
              unit:
                result.adjustment_case[i].item_unit == null
                  ? result.adjustment_case[i].item.unit
                  : result.adjustment_case[i].item_unit!.unit,
              quantity:
                Number(result.adjustment_case[i].quantity) *
                (result.adjustment_case[i].item_unit == null
                  ? 1
                  : Number(result.adjustment_case[i].item_unit?.conversion)),
              billID: null,
              billCodeID: null,
              adjustmentCaseID: result.adjustment_case[i].id,
              adjustmentCaseCodeID: result.id,
              goodReceiptID: null,
              goodReceiptCodeID: null,
              salesReturnID: null,
              salesReturnCodeID: null,
              customerID: null,
              supplierID: null,
              companyID: result.company_id,
              price: 0,
            };

            queueBody.push(stockIn);

            await queue.add("insert-stock-in", stockIn);
          } else {
            // Removed item
            const stockIn: StockInInterface = {
              itemID: result.adjustment_case[i].item.id,
              createdAt: result.created_at,
              date: result.date,
              document: result.name,
              opponent: "Internal",
              displayQuantity: Number(result.adjustment_case[i].quantity),
              unit:
                result.adjustment_case[i].item_unit == null
                  ? result.adjustment_case[i].item.unit
                  : result.adjustment_case[i].item_unit!.unit,
              quantity:
                Number(result.adjustment_case[i].quantity) *
                (result.adjustment_case[i].item_unit == null
                  ? 1
                  : Number(result.adjustment_case[i].item_unit!.conversion)),
              billID: null,
              billCodeID: null,
              adjustmentCaseID: result.adjustment_case[i].id,
              adjustmentCaseCodeID: result.id,
              goodReceiptID: null,
              goodReceiptCodeID: null,
              salesReturnID: null,
              salesReturnCodeID: null,
              customerID: null,
              supplierID: null,
              companyID: result.company_id,
              price: 0,
            };

            await queue.add("insert-stock-out", stockIn);
          }
        }

        return res.status(201).send(result);
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

        return res.status(200).send({
          ...result,
          type: Number(result.adjustment_case[0].quantity) > 0 ? 0 : 1,
        });
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
    const year = req.body.year;
    const month = req.body.month;

    if (year == null) {
      AdjustmentCaseModel.fetchArchiveYears()
        .then((result) => {
          return res.status(200).send(
            result
              .map((x) => {
                return {
                  year: x.year,
                  count: parseInt(x.count.toString()),
                };
              })
              .sort((a, b) => {
                return a.year - b.year;
              })
          );
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      AdjustmentCaseModel.fetchArchiveMonths(year)!
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
    } else {
      const page = req.body.limit.page;
      req.query.page == undefined ? 1 : parseInt(req.query.page.toString());
      const keyword = req.body.search.keyword;
      const mode = req.body.mode;

      AdjustmentCaseModel.fetchArchive({
        year: year,
        month: month,
        keyword: mysql_real_escape_string(keyword),
        limit: 10,
        offset: (page - 1) * 10,
        mode: mode,
      })!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                company_name: x.company_name,
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
    }
  };

  /**
   * Fetch archive adjustment case
   * Fetch all adjustment case code that has been archived
   * @param req
   * @param res
   */

  static fetchArchivesV2 = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;

    if (year == null && month == null) {
      AdjustmentCaseModel.fetchArchiveYearsV2()!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                month: x.month,
                count: Number(x.count.toString().replace("n", "")),
              };
            })
          );
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const keyword = req.body.keyword;
      const page = req.body.page ?? 1;
      const status = req.body.status;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const type = req.body.type;
      AdjustmentCaseModel.fetchArchiveV2({
        year: Number(year),
        month: Number(month),
        mode: status,
        status: status,
        limit: 20,
        offset: (page - 1) * 20,
        keyword: mysql_real_escape_string(keyword ?? ""),
        startDate: startDate,
        endDate: endDate,
        type: type,
      })!
        .then(([result, count]) => {
          return res.status(200).send({
            data: result.map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                company_name: x.company_name,
                type: x.type.toString().replace("n", ""),
              };
            }),
            count:
              count == null || count.length == 0
                ? 0
                : parseInt(count[0].count.toString().replace("n", "")),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching adjustment archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
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

          for (let i = 0; i < adjustmentCase.adjustment_case.length; i++) {
            const quantity = Number(adjustmentCase.adjustment_case[i].quantity);
            if (quantity > 0) {
              await queue.add("delete-stock-in", {
                itemID: adjustmentCase.adjustment_case[i]?.item?.id,
                goodReceiptID: null,
                adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
                quantity:
                  Number(adjustmentCase.adjustment_case[i].quantity) *
                  (adjustmentCase.adjustment_case[i].item_unit == null
                    ? 1
                    : Number(
                        adjustmentCase.adjustment_case[i].item_unit!.conversion
                      )),
              });
            } else if (quantity < 0) {
              await queue.add("delete-stock-out", {
                itemID: adjustmentCase.adjustment_case[i]?.item?.id,
                billID: null,
                adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
                quantity:
                  Number(adjustmentCase.adjustment_case[i].quantity) *
                  (adjustmentCase.adjustment_case[i].item_unit == null
                    ? 1
                    : Number(
                        adjustmentCase.adjustment_case[i].item_unit!.conversion
                      )),
              });
            }
          }
          return res.status(200).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on deleting adjustment case: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };
}

export default AdjustmentCaseController;
