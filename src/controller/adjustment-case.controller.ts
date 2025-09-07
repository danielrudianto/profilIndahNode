import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  translateDate,
  translateKeyword,
  translatePage,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

class AdjustmentCaseController {
  private adjustmentCaseRepository: AdjustmentCaseRepository;
  private productStockRepository: ProductStockRepository;
  private stockInRepository: StockInRepository;
  private stockOutRepository: StockOutRepository;
  private stockCardRepository: StockCardRepository;

  constructor(
    adjustmentCaseRepository: AdjustmentCaseRepository,
    productStockRepository: ProductStockRepository,
    stockInRepository: StockInRepository,
    stockOutRepository: StockOutRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.adjustmentCaseRepository = adjustmentCaseRepository;
    this.productStockRepository = productStockRepository;
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
      return res
        .status(400)
        .send(ErrorList["Adjustment case company ID is required"]);
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
    const id = req.body.id;

    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (adjustmentCase.is_confirm) {
        return res
          .status(404)
          .send(ErrorList["Adjustment case has been confirmed"]);
      }

      if (adjustmentCase.is_delete) {
        return res
          .status(404)
          .send(ErrorList["Adjustment case has been deleted"]);
      }

      const result = await this.adjustmentCaseRepository.approve(id, userID);

      await this.productStockRepository.updateMany(
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
      } else if (type == 1) {
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
            created_at: new Date(),
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
    const id = req.body.id;
    const userID = req.body.userId;

    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Adjustment case not found"]);
      }

      if (adjustmentCase.is_confirm) {
        return res
          .status(404)
          .send(ErrorList["Adjustment case has been confirmed"]);
      }

      if (adjustmentCase.is_delete) {
        return res
          .status(404)
          .send(ErrorList["Adjustment case has been deleted"]);
      }

      const result = await this.adjustmentCaseRepository.reject(id, userID);
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on disapprove adjustment case: ${error}`);
      return res.status(500).send(error);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;
    try {
      const adjustmentCase = await this.adjustmentCaseRepository.fetchByID(id);
      if (!adjustmentCase) {
        return res.status(404).send(ErrorList["Adjustment case not found"]);
      }

      if (adjustmentCase.is_delete) {
        return res
          .status(404)
          .send(ErrorList["Adjustment case has been deleted"]);
      }

      if (!adjustmentCase.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Adjustment case has not been confirmed"]);
      }

      const result = await this.adjustmentCaseRepository.delete(id, userID);

      await this.productStockRepository.updateMany(
        adjustmentCase.adjustment_case.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              -1 *
              x.quantity *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
          };
        })
      );

      const type = this.checkType(adjustmentCase.adjustment_case);

      if (type == 0) {
        // found
        await this.stockInRepository.deleteMany(
          adjustmentCase.adjustment_case!.map((x: any) => {
            return {
              good_receipt_id: null,
              good_receipt_code_id: null,
              adjustment_case_id: x.id,
              adjustment_case_code_id: id,
              price: 0,
            };
          })
        );
      } else if (type == 1) {
        // lost
        await this.stockOutRepository.deleteMany(
          adjustmentCase.adjustment_case!.map((x: any) => {
            return {
              sales_invoice_code_id: null,
              sales_invoice_id: null,
              adjustment_case_id: x.id,
              adjustment_case_code_id: id,
            };
          })
        );
      }

      for (let i = 0; i < adjustmentCase.adjustment_case!.length; i++) {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: null,
          sales_invoice_id: null,
          adjustment_case_code_id: id,
          adjustment_case_id: adjustmentCase.adjustment_case![i].id,
          sales_return_code_id: null,
          sales_return_id: null,
          good_receipt_code_id: null,
          good_receipt_id: null,
        });
      }

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

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.adjustmentCaseRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching annual archives: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;

    const keyword = translateKeyword(req.body.keyword);
    const page = translatePage(req.body.page);
    const pageSize = req.body.pageSize;
    const startDate = translateDate(req.body.startDate);
    const endDate = translateDate(req.body.endDate);
    const isConfirm = req.body.isConfirm;
    const isReject = req.body.isReject;
    const isPending = req.body.isPending;
    const isLost = req.body.isLost;
    const isFound = req.body.isFound;
    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;

    try {
      const result = await this.adjustmentCaseRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        page: page,
        pageSize: pageSize,
        startDate: startDate,
        endDate: endDate,
        isConfirm: isConfirm,
        isReject: isReject,
        isPending: isPending,
        isLost: isLost,
        isFound: isFound,
        sortBy: sortBy,
        sortDirection: sortDirection,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archives ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default AdjustmentCaseController;
