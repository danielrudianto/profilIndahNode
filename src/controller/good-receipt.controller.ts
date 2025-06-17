import { Request, Response } from "express";
import GoodReceiptModel from "../model/good-receipt.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { StockInInterface } from "../interface/stock-in.interface";
import { StockInModel } from "../model/stock-in.model";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { PurchaseInvoiceRepository } from "../repositories/purchase-invoice.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductUnitRepository } from "../repositories/product-unit.repository";

class GoodReceiptController {
  private goodReceiptRepository: GoodReceiptRepository;
  private purchaseInvoiceRepository: PurchaseInvoiceRepository;
  private stockInRepository: StockInRepository;

  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    purchaseInvoiceRepository: PurchaseInvoiceRepository,
    stockInRepository: StockInRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.purchaseInvoiceRepository = purchaseInvoiceRepository;
    this.stockInRepository = stockInRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const purchase_invoice_name = purchase_invoice.name;
    const userID = req.body.userId;
    const uuid = req.body.uuid;

    try {
      const result = await this.goodReceiptRepository.create({
        uuid: uuid,
        name: name,
        date: date,
        company_id: company_id,
        supplier_id: supplier_id,
        created_at: new Date(),
        created_by: userID,
        good_receipt: good_receipt_items.map((x, index) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
      });

      await queue.add("good-receipt-created", {
        id: result.id,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  check = async (req: Request, res: Response) => {
    const name = req.body.name;
    try {
      const result = await this.goodReceiptRepository.fetchByName(name);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on checking good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.goodReceiptRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.goodReceiptRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching annual good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchMonthlyArchives = async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    try {
      const result = await this.goodReceiptRepository.fetchMonthlyArchives(
        year
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching monthly good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Fetch good receipt archive
   * @param req
   * @param res
   */
  static fetchArchive = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
      GoodReceiptModel.fetchArchiveYears()!
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
          console.error(
            `[error]: Error on fetching good receipt archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      GoodReceiptModel.fetchArchiveMonths(year)
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching good receipt archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const page = req.body.limit == null ? 1 : req.body.limit.page;
      const keyword = req.body.search == null ? "" : req.body.search.keyword;
      const mode = req.body.mode;

      GoodReceiptModel.fetchArchive({
        year: year,
        month: month,
        mode: mode,
        keyword: mysql_real_escape_string(keyword),
        limit: 10,
        offset: (page - 1) * 10,
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
                supplier_name: x.supplier_name,
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
          console.error(
            `[error]: Error on fetching good receipt archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };
}

export default GoodReceiptController;
