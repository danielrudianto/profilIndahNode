import { Request, Response } from "express";
import GoodReceiptModel from "../model/good-receipt.model";
import ErrorList from "../assets/error_list";
import {
  mysql_real_escape_string,
  translateKeyword,
  translatePage,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockInRepository } from "../repositories/stock-in.repository";

class GoodReceiptController {
  private goodReceiptRepository: GoodReceiptRepository;
  private stockInRepository: StockInRepository;

  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    stockInRepository: StockInRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.stockInRepository = stockInRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const invoice_name = req.body.invoice_name;
    const faktur = req.body.faktur;
    const discount = req.body.discount;

    const userID = req.body.userId;
    const uuid = req.body.uuid;

    const is_confirm =
      req.body.is_confirm == undefined ? false : req.body.is_confirm;

    try {
      const result = await this.goodReceiptRepository.create({
        uuid: uuid,
        name: name,
        invoice_name: invoice_name,
        faktur: faktur,
        date: date,
        company_id: company_id,
        supplier_id: supplier_id,
        created_at: new Date(),
        created_by: userID,
        good_receipt: good_receipt_items.map((x, index) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
        discount: discount,
        confirmed_at: is_confirm ? new Date() : null,
        confirmed_by: is_confirm ? userID : null,
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

  fetchUnconfirmed = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT);

    try {
      const result = await this.goodReceiptRepository.fetchUnconfirmed({
        keyword: "",
        page: page,
        pageSize: pageSize,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching unconfirmed good receipts ${error}`
      );
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

  fetchArchives = async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT);
    const keyword = translateKeyword(req.query.keyword);

    try {
      const result = await this.goodReceiptRepository.fetchArchives({
        month: month,
        year: year,
        page: page,
        pageSize: pageSize,
        keyword: keyword,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default GoodReceiptController;
