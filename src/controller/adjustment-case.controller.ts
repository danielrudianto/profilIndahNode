import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { translateKeyword, translatePage } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockRepository } from "../repositories/stock.repository";

class AdjustmentCaseController {
  private adjustmentCaseRepository: AdjustmentCaseRepository;
  private stockRepository: StockRepository;
  private stockInRepository: StockInRepository;
  private stockOutRepository: StockOutRepository;
  private stockCardRepository: StockCardRepository;

  constructor(
    adjustmentCaseRepository: AdjustmentCaseRepository,
    stockRepository: StockRepository,
    stockInRepository: StockInRepository,
    stockOutRepository: StockOutRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.adjustmentCaseRepository = adjustmentCaseRepository;
    this.stockRepository = stockRepository;
    this.stockInRepository = stockInRepository;
    this.stockOutRepository = stockOutRepository;
    this.stockCardRepository = stockCardRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = this.generateName(new Date(date));
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const type = req.body.type;
    const adjustment_case = req.body.adjustment_case;

    if (type == 0 && companyID == null) {
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
        adjustment_case: adjustment_case.map((x: any) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: (type == 0 ? 1 : -1) * x.quantity,
          };
        }),
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating adjustment case: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
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

      await this.stockRepository.updateMany(
        result.adjustment_case.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              x.quantity *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
          };
        })
      );

      const type = this.checkType(result.adjustment_case);

      if (type == 0) {
        await this.stockInRepository.createMany(
          result.adjustment_case.map((x) => {
            return {
              date: result.date,
              product_id: x.product_id,
              quantity:
                x.quantity *
                (x.product_unit == null ? 1 : x.product_unit.conversion),
              price: 0,
              adjustment_case_code_id: result.id!,
              adjustment_case_id: x.id!,
              good_receipt_code_id: null,
              good_receipt_id: null,
              company_id: result.company_id!,
            };
          })
        );
      } else {
        await this.stockOutRepository.create(
          result.adjustment_case.map((x) => {
            return {
              date: result.date,
              product_id: x.product_id,
              quantity:
                x.quantity *
                (x.product_unit == null ? 1 : x.product_unit.conversion),
              adjustment_case_code_id: result.id!,
              adjustment_case_id: x.id!,
              sales_invoice_code_id: null,
              sales_invoice_id: null,
              price: 0,
              stock_in_id: null,
            };
          })
        );
      }

      const stockCardResult = await this.stockCardRepository.createMany(
        result.adjustment_case!.map((x) => {
          return {
            document_name: result.name,
            customer_id: null,
            supplier_id: null,
            date: result.date,
            good_receipt_id: null,
            good_receipt_code_id: null,
            adjustment_case_code_id: result.id!,
            adjustment_case_id: x.id!,
            sales_invoice_code_id: null,
            sales_invoice_id: null,
            sales_return_code_id: null,
            sales_return_id: null,
            quantity:
              x.quantity *
              (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
            display_quantity: x.quantity,
            stock: null,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      return res.status(201).send(adjustmentCase);
    } catch (error) {
      console.error(`[error]: Error on fetch adjustment case: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  private checkType(data: any[]) {
    const allPositive = data.every((x) => x.quantity > 0);
    const allNegative = data.every((x) => x.quantity < 0);

    if (allPositive) {
      return 0;
    }

    if (allNegative) {
      return 1;
    }

    return null;
  }

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

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (adjustmentCase.is_confirm || adjustmentCase.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.adjustmentCaseRepository.delete(id);

      await queue.add("adjustment-case-deleted", {
        id: result.id,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting adjustment case: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Not found"]);
      }
      return res.status(200).send(adjustmentCase);
    } catch (error) {
      console.error(`[error]: Error on fetching adjustment case: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchUnconfirmed = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT!);
    try {
      const result = await this.adjustmentCaseRepository.fetchUnconfirmed({
        page: page,
        pageSize: pageSize,
        keyword: "",
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching unconfirmed adjustment case: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const yearQuery = req.query.year;
    const monthQuery = req.query.month;

    if (!monthQuery && !yearQuery) {
      try {
        const result =
          await this.adjustmentCaseRepository.fetchAnnualArchives();
        return res.status(200).send(result);
      } catch (error) {
        console.error(`[error]: Error on fetching annual archives ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      }
    }

    const keyword = translateKeyword(req.body.keyword);
    const page = translatePage(req.body.page);
    const pageSize = Number(process.env.LIMIT!);
    const month = Number(monthQuery);
    const year = Number(yearQuery);

    const startDate = req.query.startDate
      ? new Date(req.query.startDate.toString())
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate.toString())
      : undefined;

    try {
      const result = await this.adjustmentCaseRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        is_active: true,
        is_delete: true,
      });

      console.log(result);

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archives ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  // static fetchArchivesV2 = (req: Request, res: Response) => {
  //   const year = req.body.year;
  //   const month = req.body.month;

  //   if (year == null && month == null) {
  //     AdjustmentCaseModel.fetchArchiveYearsV2()!
  //       .then((result) => {
  //         return res.status(200).send(
  //           result.map((x) => {
  //             return {
  //               year: x.year,
  //               month: x.month,
  //               count: Number(x.count.toString().replace("n", "")),
  //             };
  //           })
  //         );
  //       })
  //       .catch((error) => {
  //         console.error(`[error]: Error on fetching adjustment case: ${error}`);
  //         return res.status(500).send(ErrorList["Internal server error"]);
  //       });
  //   } else {
  //     const keyword = translateKeyword(req.body.keyword);
  //     const page = translatePage(req.body.page);
  //     const limit = Number(process.env.LIMIT!);

  //     AdjustmentCaseModel.fetchArchiveV2({
  //       year: Number(year),
  //       month: Number(month),
  //       limit: limit,
  //       offset: (page - 1) * limit,
  //       keyword: keyword,
  //     })!
  //       .then(([result, count]) => {
  //         return res.status(200).send({
  //           data: result.map((x) => {
  //             return {
  //               id: x.id,
  //               name: x.name,
  //               date: x.date,
  //               is_delete: x.is_delete == 1,
  //               is_confirm: x.is_confirm == 1,
  //               company_name: x.company_name,
  //               type: x.type.toString().replace("n", ""),
  //             };
  //           }),
  //           count:
  //             count == null || count.length == 0
  //               ? 0
  //               : parseInt(count[0].count.toString().replace("n", "")),
  //         });
  //       })
  //       .catch((error) => {
  //         console.error(
  //           `[error]: Error on fetching adjustment archive ${error}`
  //         );
  //         return res.status(500).send(ErrorList["Internal server error"]);
  //       });
  //   }
  // };

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
