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
import { ProductPurchasePriceRepository } from "../repositories/product-purchase-price.repository";

class GoodReceiptController {
  private goodReceiptRepository: GoodReceiptRepository;
  private purchaseInvoiceRepository: PurchaseInvoiceRepository;
  private stockInRepository: StockInRepository;
  private productPurchasePriceRepository: ProductPurchasePriceRepository;

  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    purchaseInvoiceRepository: PurchaseInvoiceRepository,
    stockInRepository: StockInRepository,
    productPurchasePriceRepository: ProductPurchasePriceRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.purchaseInvoiceRepository = purchaseInvoiceRepository;
    this.stockInRepository = stockInRepository;
    this.productPurchasePriceRepository = productPurchasePriceRepository;
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
      const purchasePrice =
        await this.productPurchasePriceRepository.fetchByItemIDs(
          good_receipt_items.map((x) => {
            return {
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
            };
          })
        );

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
            // if the price in that index is null, set it to 0
            price:
              purchasePrice[index] == null ? 0 : purchasePrice[index]!.price,
            discount:
              purchasePrice[index] == null ? 0 : purchasePrice[index]!.discount,
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
  
  /**
   * Search good receipt
   * @param req
   * @param res
   */
  static search = (req: Request, res: Response) => {
    const suppliers = req.body.suppliers as number[];
    const items = req.body.items as number[];
    const companies = req.body.companies as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;
    // 0 = active only, 1 = deleted only, 2 = all

    const formattedDate_1 =
      date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(
            new Date(date[0]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 =
      date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(
            new Date(date[1]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    GoodReceiptModel.search(
      suppliers,
      companies,
      items,
      [formattedDate_1, formattedDate_2],
      mysql_real_escape_string(keyword),
      page,
      status
    )
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: parseInt(result[1][0].count.toString()),
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
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

  /**
   * Fetch good receipt by id
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    GoodReceiptModel.fetchByID(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching good receipt ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
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
