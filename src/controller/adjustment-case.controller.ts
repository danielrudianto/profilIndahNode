import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import AdjustmentCaseModel, {
  IAdjustmentCaseApprovalStatus,
} from "../model/adjustment-case.model";
import { IStockInFetchMethod, StockInModel } from "../model/stock-in.model";
import {
  IStockOutDelete,
  IStockOutFetch,
  StockOutModel,
} from "../model/stock-out.model";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";

class AdjustmentCaseController {
  private adjustmentCaseRepository: AdjustmentCaseRepository;
  constructor(adjustmentCaseRepository: AdjustmentCaseRepository) {
    this.adjustmentCaseRepository = adjustmentCaseRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = this.generateName(new Date(date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const type = req.body.type;

    if (type == 0 && companyID == null) {
      // If the type is found but the company is somewhat not selected
      // Return an error
      return res.status(400).send(ErrorList["Parameter error"]);
    }

    try {
      // Insert adjustment case code
      const result = await this.adjustmentCaseRepository.create({
        name: name,
        date: date,
        created_by: userID,
        created_at: new Date(),
        company_id: companyID,
        adjustment_case: req.body.adjustment_case.map((x: any) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: (type == 0 ? 1 : -1) * x.quantity,
          };
        }),
      });

      return res.status(201).send(result);
    } catch (error) {}
  };

  private generateName = (date: Date) => {
    /**
     * Generate adjustment case name
     * Generating name of adjustment case code based on date
     * @param date
     * @returns string
     */
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

  approve = async (req: Request, res: Response) => {
    const userID = req.body.userId;
    const id = Number(req.params.id);

    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (adjustmentCase.is_confirm || adjustmentCase.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.adjustmentCaseRepository.approve(id, userID);

      await queue.add("adjustment-case-approved", {
        id: result.id,
      });

      return res.status(201).send(adjustmentCase);
    } catch (error) {
      console.error(`[error]: Error on fetch adjustment case: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  reject = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const result = await this.adjustmentCaseRepository.reject(id, userID);
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on disapprove adjustment case: ${error}`);
      return res.status(500).send(error);
    }
  };

  static approve = async (req: Request, res: Response) => {
    // try {
    //   const userID = req.body.userId;
    //   const id = Number(req.params.id);
    //   const adjustmentCase = await AdjustmentCaseModel.fetchByID(id);
    //   if (!adjustmentCase) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   if (adjustmentCase.is_confirm || adjustmentCase.is_delete) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   const result = await AdjustmentCaseModel.confirm(
    //     id,
    //     userID,
    //     IAdjustmentCaseApprovalStatus.APPROVED
    //   );
    //   Promise.all([
    //     this.stockInRepository.createMany(),
    //     StockInModel.createMany(
    //       result.adjustment_case
    //         .filter((x) => Number(x.quantity) > 0)
    //         .map((x) => {
    //           return {
    //             item_id: x.item.id,
    //             date: result.date,
    //             company_id: result.company_id!,
    //             quantity:
    //               Number(x.quantity) *
    //               (x.item_unit == null ? 1 : Number(x.item_unit.conversion)),
    //             price: 0,
    //             good_receipt_code_id: null,
    //             good_receipt_id: null,
    //             adjustment_case_code_id: result.id,
    //             adjustment_case_id: x.id,
    //           };
    //         })
    //     ),
    //     StockOutModel.createMany(
    //       result.adjustment_case
    //         .filter((x) => Number(x.quantity) < 0)
    //         .map((x) => {
    //           return {
    //             date: result.date,
    //             item_id: x.item.id,
    //             quantity:
    //               Number(x.quantity) *
    //               -1 *
    //               Number(x.item_unit == null ? 1 : x.item_unit.conversion),
    //             bill_id: null,
    //             bill_code_id: null,
    //             adjustment_case_id: x.id,
    //             adjustment_case_code_id: result.id,
    //             stock_in_id: null,
    //             price: 0,
    //           };
    //         })
    //     ),
    //   ])
    //     .then(() => {
    //       return res.status(201).send(adjustmentCase);
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on create stock in/out: ${error}`);
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } catch (error) {
    //   console.error(`[error]: Error on fetch adjustment case: ${error}`);
    //   return res.status(500).send(ErrorList["Internal server error"]);
    // }
  };

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

  static fetchUnconfirmed = (req: Request, res: Response) => {
    const page =
      req.query.page == null || req.query.page == undefined
        ? 1
        : Number(req.query.page);

    AdjustmentCaseModel.fetchUnconfirmed(page)
      .then(([result, count]) => {
        return res.status(200).send({
          data: result.map((x) => {
            return {
              id: x.id,
              name: x.name,
              date: x.date,
              type: Number(x.adjustment_case[0].quantity) > 0 ? 0 : 1,
              user_adjustment_case_code_created_byTouser:
                x.user_adjustment_case_code_created_byTouser,
              company: x.company,
            };
          }),
          count: count,
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching unconfirmed adjustment case ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

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

  static deleteByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // AdjustmentCaseModel.fetchByID(id).then((adjustmentCase) => {
    //   if (!adjustmentCase) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   AdjustmentCaseModel.deleteByID(id)
    //     .then(async (result) => {
    //       const socket = new SocketHelper("deleteAdjustmentCase", result);
    //       socket.create();
    //       // If all the item quantity > 0
    //       if (
    //         adjustmentCase.adjustment_case.every((x) => Number(x.quantity) >= 0)
    //       ) {
    //         // Get the stockIn IDs
    //         StockInModel.fetch(
    //           IStockInFetchMethod.BY_ADJUSTMENT_CASE_CODE_ID,
    //           id
    //         )
    //           .then(async (stockIns) => {
    //             await StockOutModel.delete(
    //               IStockOutDelete.BY_STOCK_IN_IDS,
    //               stockIns.map((x) => x.id)
    //             );
    //             await StockInModel.deleteMany(stockIns.map((x) => x.id));
    //             return res.status(200).send(result);
    //           })
    //           .catch((error) => {
    //             console.error(
    //               `[error]: Error on fetching stock in by good receipt code ID: ${error}`
    //             );
    //             return res.status(500).send(ErrorList["Internal server error"]);
    //           });
    //       } else if (
    //         adjustmentCase.adjustment_case.every((x) => Number(x.quantity) < 0)
    //       ) {
    //         // only delete the stock out
    //         const stockOuts = await StockOutModel.fetch(
    //           IStockOutFetch.BY_REFERENCE,
    //           adjustmentCase.adjustment_case.map((x) => {
    //             return {
    //               adjustment_case_code_id: adjustmentCase.id,
    //               adjustment_case_id: x.id,
    //               bill_id: null,
    //               bill_code_id: null,
    //             };
    //           })
    //         );
    //         await StockInModel.rollBack(
    //           stockOuts
    //             .filter((x) => x.stock_in_id != null)
    //             .map((x) => {
    //               return {
    //                 id: x.stock_in_id!,
    //                 quantity: Number(x.quantity),
    //               };
    //             })
    //         );
    //         await StockOutModel.delete(
    //           IStockOutDelete.BY_REFERENCE_IDS,
    //           adjustmentCase.adjustment_case.map((x) => {
    //             return {
    //               adjustment_case_code_id: adjustmentCase.id,
    //               adjustment_case_id: x.id,
    //               bill_id: null,
    //               bill_code_id: null,
    //             };
    //           })
    //         );
    //         return res.status(200).send(result);
    //       }
    //       StockInModel.deleteByReferenceIDs(
    //         adjustmentCase.adjustment_case.map((x) => {
    //           return {
    //             adjustment_event_code_id: adjustmentCase.id!,
    //             adjustment_event_id: x.id!,
    //             good_receipt_code_id: null,
    //             good_receipt_id: null,
    //           };
    //         })
    //       ).then(() => {});
    //       for (let i = 0; i < adjustmentCase.adjustment_case.length; i++) {
    //         const quantity = Number(adjustmentCase.adjustment_case[i].quantity);
    //         if (quantity > 0) {
    //           await queue.add("delete-stock-in", {
    //             itemID: adjustmentCase.adjustment_case[i]?.item?.id,
    //             goodReceiptID: null,
    //             adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
    //             quantity:
    //               Number(adjustmentCase.adjustment_case[i].quantity) *
    //               (adjustmentCase.adjustment_case[i].item_unit == null
    //                 ? 1
    //                 : Number(
    //                     adjustmentCase.adjustment_case[i].item_unit!.conversion
    //                   )),
    //           });
    //         } else if (quantity < 0) {
    //           await queue.add("delete-stock-out", {
    //             itemID: adjustmentCase.adjustment_case[i]?.item?.id,
    //             billID: null,
    //             adjustmentCaseID: adjustmentCase.adjustment_case[i].id,
    //             quantity:
    //               Number(adjustmentCase.adjustment_case[i].quantity) *
    //               (adjustmentCase.adjustment_case[i].item_unit == null
    //                 ? 1
    //                 : Number(
    //                     adjustmentCase.adjustment_case[i].item_unit!.conversion
    //                   )),
    //           });
    //         }
    //       }
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on deleting adjustment case: ${error}`);
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // });
  };
}

export default AdjustmentCaseController;
