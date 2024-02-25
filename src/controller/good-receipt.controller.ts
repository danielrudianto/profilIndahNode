import { Request, Response } from "express";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { StockInInterface } from "../interface/stock-in.interface";

class GoodReceiptController {
  /**
   * Create new good receipt
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const purchase_invoice_name = purchase_invoice.name;
    const userID = req.body.userId;
    const uuid = req.body.uuid;

    ItemPurchasePriceModel.fetchCurrentPrice(
      good_receipt_items.map((x) => {
        return {
          item_id: x.item_id,
          item_unit_id: x.item_unit_id,
        };
      })
    ).then((priceResult) => {
      GoodReceiptModel.create({
        uuid: uuid,
        name: name,
        purchase_invoice_name: purchase_invoice_name,
        date: date,
        supplier_id: supplier_id,
        company_id: company_id,
        created_by: userID,
        good_receipt: good_receipt_items.map((x) => {
          const priceIndex = priceResult.findIndex(
            (y) => y.item_id == x.item_id && y.item_unit_id == x.item_unit_id
          );
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: x.quantity,
            price: priceIndex == -1 ? 0 : priceResult[priceIndex].price,
            discount: priceIndex == -1 ? 0 : priceResult[priceIndex].discount,
          };
        }),
      })
        .then(async (goodReceiptResult) => {
          Promise.all(
            goodReceiptResult.good_receipt.map((x) => {
              const stockIn: StockInInterface = {
                itemID: x.item.id,
                createdAt: goodReceiptResult.created_at,
                date: goodReceiptResult.date,
                document: goodReceiptResult.name,
                opponent: goodReceiptResult.supplier.name,
                displayQuantity: parseFloat(x.quantity.toString()),
                unit: x.item_unit == null ? x.item.unit : x.item_unit.unit,
                quantity:
                  parseFloat(x.quantity.toString()) *
                  (x.item_unit == null
                    ? 1
                    : parseFloat(x.item_unit.conversion.toString())),
                billID: null,
                billCodeID: null,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: x.id,
                goodReceiptCodeID: goodReceiptResult.id,
                salesReturnID: null,
                salesReturnCodeID: null,
                customerID: null,
                supplierID: goodReceiptResult.supplier_id,
                companyID: goodReceiptResult.company_id,
                price:
                  parseFloat(x.price.toString()) -
                  parseFloat(x.discount.toString()),
              };

              return queue.add("insert-stock-in", stockIn);
            })
          )
            .then(() => {
              return res.status(201).send(goodReceiptResult);
            })
            .catch((error) => {
              console.error(`[error]: Error on creating good receipt ${error}`);
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching price ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
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
