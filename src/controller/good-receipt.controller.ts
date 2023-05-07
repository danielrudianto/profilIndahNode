import { Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import SupplierModel from "../model/supplier.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import ProductStockModel from "../model/product-stock.model";

class GoodReceiptController {
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const purchase_invoice_name = purchase_invoice.name;
    const userID = req.body.userId;

    Promise.all([
      CompanyModel.fetchById(company_id),
      SupplierModel.fetchById(supplier_id),
    ])
      .then((validation) => {
        if (
          validation[0] == null ||
          validation[1] == null ||
          validation[0].length == 0 ||
          validation[1].length == 0
        ) {
          return res.status(400).send(ErrorList["Not found"]);
        } else {
          const goodReceipt = new GoodReceiptModel(
            name,
            date,
            userID,
            supplier_id,
            company_id
          );

          goodReceipt.create().then((goodReceiptResult) => {
            const purchaseDocument = new PurchaseInvoiceModel(
              purchase_invoice_name,
              null,
              date,
              0,
              goodReceiptResult.id,
              req.body.userId
            );

            purchaseDocument
              .create()
              .then(() => {
                ItemPurchasePriceModel.fetchCurrentPrice(
                  good_receipt_items.map((x) => {
                    return {
                      item_id: x.item_id,
                      item_unit_id: x.item_unit_id,
                    };
                  })
                )
                  .then((priceResult) => {
                    for (let x of good_receipt_items) {
                      const price = priceResult.filter(
                        (y) =>
                          y.item_id == x.item_id &&
                          y.item_unit_id == x.item_unit_id
                      )[0].price;
                      x.price = price;
                    }

                    GoodReceiptModel.insertItems(
                      good_receipt_items.map((x) => {
                        return {
                          good_receipt_code_id: goodReceiptResult.id,
                          item_id: x.item_id,
                          item_unit_id: x.item_unit_id,
                          quantity: x.quantity,
                          price: x.price,
                        };
                      })
                    )
                      .then(() => {
                        GoodReceiptModel.fetchById(goodReceiptResult.id)
                          .then((document) => {
                            if (document == null) {
                              return res
                                .status(400)
                                .send(ErrorList["Not found"]);
                            } else {
                              ProductStockModel.updateStock(
                                document?.good_receipt.map((x) => {
                                  const quantity =
                                    parseFloat(x.quantity.toString()) *
                                    (x.item_unit == null
                                      ? 1
                                      : parseFloat(
                                          x.item_unit.conversion.toString()
                                        ));
                                  return {
                                    item_id: x.item.id,
                                    quantity: quantity,
                                  };
                                })
                              ).then(() => {
                                return res.status(201).send(goodReceiptResult);
                              });
                            }
                          })
                          .catch(() => {
                            return res.status(201).send(goodReceiptResult);
                          });
                      })
                      .catch((error) => {
                        return res.status(500).send(error);
                      });
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    GoodReceiptModel.fetchById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      GoodReceiptModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      GoodReceiptModel.fetchArchiveMonths(year, mode)!
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

      GoodReceiptModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                supplier: {
                  id: x.supplier_id,
                  name: x.supplier_name,
                },
                company: {
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

  static fetchCodeById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id.toString());
      GoodReceiptModel.fetchCodeById(id)
        .then((result) => {
          if (!result) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            return res.status(200).send(result.good_receipt_code);
          }
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

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
          count: result[1][0].count,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default GoodReceiptController;
