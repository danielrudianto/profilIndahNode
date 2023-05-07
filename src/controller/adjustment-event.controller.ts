import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ErrorList from "../assets/error_list";
import GeneralErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import AdjustmentCaseModel from "../model/adjustment_case.model";
import AdjustmentCaseCodeModel from "../model/adjustment_case_code.model";
import ProductStockModel from "../model/product-stock.model";

class AdjustmentCaseController {
  static create = (req: Request, res: Response) => {
    const name = this.generateName(new Date(req.body.date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const adjustment_case = new AdjustmentCaseCodeModel(
      name,
      new Date(req.body.date),
      userID,
      companyID
    );

    adjustment_case
      .create()
      .then((result) => {
        AdjustmentCaseModel.createMany(
          (req.body.adjustment_case as any[]).map((x) => {
            return {
              ...x,
              quantity: req.body.type == 0 ? x.quantity : -1 * x.quantity,
              adjustment_case_code_id: result.id,
            };
          })
        )
          .then(() => {
            AdjustmentCaseCodeModel.fetchById(result.id)
              .then((document) => {
                if (document == null) {
                  return res.status(201).send(result);
                } else {
                  ProductStockModel.updateStock(
                    document.adjustment_case.map((x) => {
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
                  )
                    .then(() => {
                      return res.status(201).send(result);
                    })
                    .catch(() => {
                      return res.status(201).send(result);
                    });
                }
              })
              .catch((error) => {
                return res.status(404).send(ErrorList["Not found"]);
              });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchives = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      AdjustmentCaseCodeModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      AdjustmentCaseCodeModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = x.count;
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month != undefined) {
      const year = parseInt(req.query.year.toString());
      const month = parseInt(req.query.month.toString());
      const page =
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());

      AdjustmentCaseCodeModel.fetchArchive(year, month, page, mode)!
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
                : result[1][0].count,
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    AdjustmentCaseCodeModel.fetchById(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(GeneralErrorList["Not found"]);
        } else {
          return res.status(200).send(result);
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchCodeById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id.toString());
    AdjustmentCaseModel.fetchById(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          return res.status(200).send(result?.adjustment_case_code);
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static deleteById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      AdjustmentCaseCodeModel.fetchById(id).then((adjustment_case) => {
        if (!adjustment_case) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          AdjustmentCaseCodeModel.deleteById(id)
            .then((result) => {
              const socket = new SocketHelper("deleteAdjustmentCase", result);
              socket.create();
              if (!result) {
                return res.status(404).send(ErrorList["Not found"]);
              } else {
                ProductStockModel.updateStock(
                  result.adjustment_case.map((x) => {
                    const quantity =
                      parseFloat(x.quantity.toString()) *
                      -1 *
                      (x.item_unit == null
                        ? 1
                        : parseFloat(x.item_unit.conversion.toString()));
                    return {
                      item_id: x.item.id,
                      quantity: quantity,
                    };
                  })
                )
                  .then(() => {
                    return res.status(200).send(result);
                  })
                  .catch(() => {
                    return res.status(200).send(result);
                  });
              }
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

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
}

export default AdjustmentCaseController;
