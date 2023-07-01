import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import StockCardHelper from "../helper/stock_card.helper";
import { ItemModel } from "../model/item.model";
import ProductStockModel from "../model/product-stock.model";
import cron from "node-cron";

class ProductStockController {
  static fetch = (req: Request, res: Response) => {
    if (req.query.mode == "plain" || req.query.mode == "problem") {
      const page: number = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
      const limit = parseInt(process.env.LIMIT!);
      const offset = (page - 1) * limit;
      const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(
            mysql_real_escape_string(req.query.keyword.toString())
          );
      ProductStockModel.fetch(keyword, offset, limit, req.query.mode)
        .then((result) => {
          return res.status(200).send({
            data: result[0],
            count: result[1],
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static fetchByID = (req: Request, res: Response) => {
    const itemID = parseInt(req.params.id);
    const mode = req.query.mode;
    switch (mode) {
      case "card":
        const page =
          req.query.page == null ? 1 : parseInt(req.query.page.toString());
        ProductStockModel.fetchByID(itemID, (page - 1) * 10)
          .then((result) => {
            return res.status(200).send({
              data: (result[0] as any[]).map((x) => {
                return {
                  name: x.f0,
                  date: x.f1,
                  bill_id: x.f4,
                  adjustment_case_id: x.f5,
                  good_receipt_id: x.f6,
                  sales_return_id: x.f7,
                  quantity: x.f8,
                  stock: x.f9,
                  unit: x.f10,
                  conversion: x.f11,
                  document_id: x.f12,
                };
              }),
              count: (result[1] as any[])[0].f0,
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
    }
  };

  static create = (req: Request, res: Response) => {
    const mode = req.body.mode;
    const format = req.body.format;
    switch (mode) {
      case "inadequate":
        const brand_id = req.body.brand;
        const type_id = req.body.type;
        switch (format) {
          case "PDF":
            ProductStockModel.fetchInadequate(brand_id, type_id)
              .then((result) => {
                if (result.length == 0) {
                  return res.status(404).send(ErrorList["Not found"]);
                } else {
                  StockCardHelper.createInsufficientPdf(
                    result,
                    function (binary: string) {
                      return res.status(200).send({
                        data: binary,
                      });
                    },
                    function (error: any) {
                      return res.status(500).send(error);
                    }
                  );
                }
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
            break;
          default:
            ProductStockModel.fetchInadequate(brand_id, type_id)
              .then((result) => {
                return res.status(200).send({
                  data: result.map((x) => {
                    return {
                      reference: x.reference,
                      description: x.description,
                      minimumStock: x.minimum_stock,
                      unit: x.unit,
                      stock: x.stock,
                    };
                  }),
                });
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
            break;
        }
        break;
      case "input":
        const inputItemID = req.body.itemID;
        const inputDate = req.body.date;
        ItemModel.fetchById(inputItemID)
          .then((item) => {
            if (!item) {
              return res.status(404).send(ErrorList["Not found"]);
            } else {
              ProductStockModel.fetchStockData(
                inputItemID,
                "input",
                `${inputDate} 00:00:00`,
                `${inputDate} 23:59:59`
              )!
                .then((result) => {
                  return res.status(200).send(
                    (result as any[]).map((x) => {
                      return {
                        name: x.f0,
                        date: new Date(x.f1),
                        created_at: new Date(x.f2),
                        item_id: x.f3,
                        item_unit_id: x.f4,
                        bill_id: x.f5,
                        adjustment_case_id: x.f6,
                        good_receipt_id: x.f7,
                        sales_return_id: x.f8,
                        quantity: x.f9,
                        stock: x.f10,
                        unit: x.f11,
                        conversion: x.f12,
                      };
                    })
                  );
                })
                .catch((error) => {
                  console.log(error);
                  return res.status(500).send(error);
                });
            }
          })
          .catch((error) => {
            console.log(error);
            return res.status(500).send(error);
          });
        break;
      case "document":
        const documentItemID = req.body.itemID;
        const documentDate = req.body.date;
        ItemModel.fetchById(documentItemID)
          .then((item) => {
            if (!item) {
              return res.status(404).send(ErrorList["Not found"]);
            } else {
              ProductStockModel.fetchStockData(
                documentItemID,
                "document",
                documentDate,
                documentDate
              )!
                .then((result) => {
                  return res.status(200).send(
                    (result as any[]).map((x) => {
                      return {
                        name: x.f0,
                        date: new Date(x.f1),
                        created_at: new Date(x.f2),
                        item_id: x.f3,
                        item_unit_id: x.f4,
                        bill_id: x.f5,
                        adjustment_case_id: x.f6,
                        good_receipt_id: x.f7,
                        sales_return_id: x.f8,
                        quantity: x.f9,
                        stock: x.f10,
                        unit: x.f11,
                        conversion: x.f12,
                      };
                    })
                  );
                })
                .catch((error) => {
                  console.log(error);
                  return res.status(500).send(error);
                });
            }
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
        break;
      case "download":
        const itemID = req.body.itemID;
        const cardFormat = req.body.format;
        const dateStart = req.body.dateStart;
        const dateEnd = req.body.dateEnd;
        ItemModel.fetchById(itemID)
          .then((item) => {
            if (!item) {
              return res.status(404).send(ErrorList["Not found"]);
            } else {
              ProductStockModel.fetchStockData(
                itemID,
                "card",
                dateStart,
                dateEnd
              )!
                .then((result) => {
                  if (cardFormat == "CSV") {
                    StockCardHelper.createCsv(
                      (result as any[]).map((x) => {
                        return {
                          name: x.f0,
                          date: new Date(x.f1),
                          created_at: new Date(x.f2),
                          item_id: x.f3,
                          item_unit_id: x.f4,
                          bill_id: x.f5,
                          adjustment_case_id: x.f6,
                          good_receipt_id: x.f7,
                          sales_return_id: x.f8,
                          quantity: x.f9,
                          stock: x.f10,
                          unit: x.f11,
                          conversion: x.f12,
                          opponent: x.f13,
                        };
                      }),
                      function (array: any[]) {
                        return res.status(200).send({
                          data: array,
                        });
                      },
                      function (error: any) {
                        return res.status(500).send(error);
                      }
                    );
                  } else {
                    StockCardHelper.createPdf(
                      item[0],
                      (result as any[]).map((x) => {
                        return {
                          name: x.f0,
                          date: new Date(x.f1),
                          created_at: new Date(x.f2),
                          item_id: x.f3,
                          item_unit_id: x.f4,
                          bill_id: x.f5,
                          adjustment_case_id: x.f6,
                          good_receipt_id: x.f7,
                          sales_return_id: x.f8,
                          quantity: x.f9,
                          stock: x.f10,
                          unit: x.f11,
                          conversion: x.f12,
                          opponent: x.f13,
                        };
                      }),
                      function (binary: string) {
                        return res.status(200).send({
                          data: binary,
                        });
                      },
                      function (error: any) {
                        return res.status(500).send(error);
                      }
                    );
                  }
                })
                .catch((error) => {
                  return res.status(500).send(error);
                });
            }
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
    }
  };

  static scheduleData = () => {
    ProductStockModel.syncData();
    // Create a cron job to run every day at 00:00:00
    cron.schedule("0 */6 * * *", async () => {
      await ProductStockModel.syncData();
    });
  };
}

export default ProductStockController;
