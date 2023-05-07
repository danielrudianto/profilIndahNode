import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import BillCodeModel from "../model/bill_code.model";
import ProductStockModel from "../model/product-stock.model";
import SalesReturnModel from "../model/sales_return.model";

class SalesReturnController {
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const payment_method_id =
      req.body.payment_method_id == 0 ? null : req.body.payment_method_id;

    const items = req.body.sales_return as any[];
    if (items.length > 0) {
      const name = `RJ-${date.getFullYear()}-${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}`;

      const sales_return_code = new SalesReturnModel(
        name,
        date,
        req.body.userId,
        payment_method_id,
        items,
        null,
        true
      );

      sales_return_code
        .create()
        .then((result) => {
          SalesReturnModel.fetchById(result.id).then((salesReturn) => {
            if (salesReturn == null) {
              return res.status(400).send(ErrorList["Not found"]);
            } else {
              ProductStockModel.updateStock(
                salesReturn.sales_return.map((x) => {
                  const quantity =
                    parseFloat(x.quantity.toString()) *
                    (x.bill.item_unit == null
                      ? 1
                      : parseFloat(x.bill.item_unit.conversion.toString()));
                  return {
                    item_id: x.bill.item.id,
                    quantity: quantity,
                  };
                })
              ).then(() => {
                return res.status(201).send(result);
              });
            }
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Data barang tidak dilampirkan.");
    }
  };

  static fetchSearch = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const items = req.body.items as any[];

    SalesReturnModel.fetchSearch(date, items)
      .then((result) => {
        return res.status(200).send(
          (result as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              date: x.date,
              customer: {
                name: x.customer_name,
              },
            };
          })
        );
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchives = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      SalesReturnModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      SalesReturnModel.fetchArchiveMonths(year, mode)!
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

      SalesReturnModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                customer:
                  (x.customer_id == null) == null
                    ? null
                    : {
                        id: x.customer_id,
                        name: x.customer_name,
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
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id)
      .then((result) => {
        if (result == null || result.sales_return.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          const bill_code_id = result?.sales_return[0].bill.bill_code_id;
          BillCodeModel.fetchById(bill_code_id).then((bill) => {
            let total = 0;
            for (let item of result.sales_return) {
              total +=
                parseFloat(item.quantity.toString()) *
                (parseFloat(item.bill.price.toString()) -
                  parseFloat(item.bill.discount.toString()));
            }
            return res.status(200).send({
              ...result,
              bill: bill,
              customer:
                result?.sales_return.length == 0 ||
                result?.sales_return[0].bill.bill_code.customer == null
                  ? null
                  : {
                      name: result.sales_return[0].bill.bill_code.customer.name,
                    },
              total: total,
            });
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static deleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id).then((salesReturn) => {
      if (salesReturn == null || salesReturn.is_delete) {
        return res.status(404).send("Data tidak ditemukan.");
      } else {
        SalesReturnModel.deleteById(id, req.body.userId)
          .then((result) => {
            SalesReturnModel.fetchById(id)
              .then(() => {
                ProductStockModel.updateStock(
                  salesReturn.sales_return.map((x) => {
                    const quantity =
                      parseFloat(x.quantity.toString()) *
                      -1 *
                      (x.bill.item_unit == null
                        ? 1
                        : parseFloat(x.bill.item_unit.conversion.toString()));
                    return {
                      item_id: x.bill.item.id,
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
              })
              .catch(() => {
                return res.status(201).send(result);
              });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static fetchCodeById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchCodeById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default SalesReturnController;
