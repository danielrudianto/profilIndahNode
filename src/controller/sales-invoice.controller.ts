import { Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import ItemPriceModel from "../model/item_price.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { ProductPackageCodeModel } from "../model/product-package.model";
import { queue } from "../helper/queue.helper";
import SalesReturnModel from "../model/sales_return.model";

class SalesInvoiceController {
  /**
   * Create sales invoice data
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const uuid = req.body.uuid;
    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill as any[];
    const date =
      !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);
    const userID = req.body.userId;

    BillCodeModel.create({
      name: BillCodeModel.generateName(date),
      customer_id: customer_id,
      payment_method_id: payment_method_id,
      discount: discount,
      delivery: delivery,
      service: service,
      date: date,
      uuid: uuid,
      items: bill.map((x) => {
        if (x.package_code_id != undefined) {
          return {
            package_code_id: x.package_code_id,
            item_id: null,
            item_unit_id: null,
            quantity: x.quantity,
            price: x.price,
            discount: 0,
          };
        } else {
          return {
            package_code_id: null,
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }
      }),
      created_by: userID,
    })
      .then(async (result) => {
        try {
          await ItemPriceModel.updateMany(
            bill.filter((x) => x.save && x.item_id != null),
            req.body.userId
          );

          await ProductPackageCodeModel.updatePrice(
            bill.filter((x) => x.save && x.package_code_id != null)
          );

          await queue.add("create-sales-invoice", result);
          return res.status(201).send(result);
        } catch (error) {
          console.error(`[error]: Error on updating stock ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on creating bill ${error}`);
        return res.status(500).send(error);
      });
  };

  /**
   * Search sales invoice data
   * Can be narrowed down by customer, item, date, page, keyword
   * @param req
   * @param res
   */
  static fetchSearch = (req: Request, res: Response) => {
    const customers = req.body.customers as number[];
    const items = req.body.items as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;
    // status 0 => active
    // status 1 => deleted
    // status 2 => all

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
    BillCodeModel.search(
      customers,
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
   * Search sales invoice data archive
   * @param req
   * @param res
   */
  static fetchArchive = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
      BillCodeModel.fetchArchiveYears()!
        .then((result) => {
          return res.status(200).send(
            result
              .map((x) => {
                return {
                  year: x.year,
                  count: parseInt(x.count.toString().replace("n", "")),
                };
              })
              .sort((a, b) => {
                return a.year - b.year;
              })
          );
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      const year = req.body.year;
      BillCodeModel.fetchArchiveMonths(year)
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(
              x.count.toString().replace("n", "")
            );
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const mode = req.body.mode;
      const page = req.body.limit.page;
      const keyword = req.body.search.keyword;
      BillCodeModel.fetchArchive({
        year: year,
        month: month,
        mode: mode,
        limit: 10,
        offset: (page - 1) * 10,
        keyword: mysql_real_escape_string(keyword),
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
                customer_name: x.customer_name,
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString().replace("n", "")),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  /**
   * Fetch bill by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        let subTotal = 0;
        for (let item of result.bill) {
          subTotal +=
            parseFloat(item.price.toString()) *
            parseFloat(item.quantity.toString());
        }
        return res.status(200).send({
          ...result,
          subTotal: subTotal,
          discount: parseFloat(result.discount.toString()),
          delivery: parseFloat(result.delivery.toString()),
          service: parseFloat(result.service.toString()),
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching sales invoice by ID ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch bill code by ID
   * @param req
   * @param res
   */
  static fetchCodeByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching bill code ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete bill by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;

    const result = await BillCodeModel.fetchByID(id);
    console.log(result);
    if (!result) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (result.is_delete) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    // Check if there is any sales return on this bill
    const salesReturn = await SalesReturnModel.fetchByBillIDs(
      result.bill.map((x) => {
        return x.id;
      })
    );

    if (salesReturn.length > 0) {
      return res
        .status(400)
        .send(ErrorList["Delete bill sales return constraint"]);
    }

    const socket = new SocketHelper("deleteBill", result);
    socket.create();

    BillCodeModel.deleteByID(id, userID)
      .then(async (updateBill) => {
        await queue.add("delete-sales-invoice", result);
        return res.status(201).send(updateBill);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting bill ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch dashboard data
   * @param req
   * @param res
   */
  static fetchDashboard = async (req: Request, res: Response) => {
    // 1 Fetch today's sales
    // 2 Fetch this month's sales
    // 3 Fetch yesterday's sales
    // 4 Fetch last month's sales

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    Promise.all([
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      ),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate() - 1
      ),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        null
      ),
      BillCodeModel.fetchByDate(today.getFullYear(), today.getMonth(), null),
      BillCodeModel.fetchByDate(
        today.getFullYear(),
        today.getMonth(),
        -today.getDate()
      ),
    ])
      .then(([sales1, sales2, sales3, sales4, sales5]: any[]) => {
        return res.status(200).send({
          today: sales1[0].value == null ? 0 : parseFloat(sales1[0].value),
          yesterday: sales2[0].value == null ? 0 : parseFloat(sales2[0].value),
          thisMonth: sales3[0].value == null ? 0 : parseFloat(sales3[0].value),
          lastMonth: sales4[0].value == null ? 0 : parseFloat(sales4[0].value),
          monthOnMonth:
            sales5[0].value == null ? 0 : parseFloat(sales5[0].value),
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default SalesInvoiceController;
