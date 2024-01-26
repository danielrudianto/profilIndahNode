import { Request, Response } from "express";
import DepositModel from "../model/deposit.model";
import { mysql_real_escape_string } from "../helper/escape.helper";
import ErrorList from "../assets/error_list";

class DepositController {
  static create = (req: Request, res: Response) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const discount = req.body.discount;
    const delivery = req.body.delivery;
    const service = req.body.service;

    const uuid = req.body.uuid;
    const payments = req.body.payments;
  };

  static fetchByID = (req: Request, res: Response) => {
    const id = Number(req.params.id);
    DepositModel.fetchByID(id).then((result) => {
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      let subTotal = 0;
      for (let item of result.deposit) {
        subTotal +=
          parseFloat(item.price.toString()) *
          parseFloat(item.quantity.toString());
      }
      return res.status(200).send({
        ...result,
        is_confirm: true,
        subTotal: subTotal,
        discount: parseFloat(result.discount.toString()),
        delivery: parseFloat(result.delivery.toString()),
        service: parseFloat(result.service.toString()),
      });
    });
  };

  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());
    const page = !req.query.page ? 1 : Number(req.query.page);

    DepositModel.fetch(keyword, page)
      .then(([result, count]) => {
        return res.status(200).send({
          data: result,
          count: count,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching deposit ${error}`);
        return res.status(500).send(error);
      });
  };

  static deleteByID = (req: Request, res: Response) => {};

  static fetchArchive = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    const mode = req.body.mode;
    if (year == null && month == null) {
      DepositModel.fetchArchiveYears(mode)!
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
          console.error(`[error]: Error on fetching deposit archive ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      const year = req.body.year;
      DepositModel.fetchArchiveMonths(year, mode)
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
          console.error(`[error]: Error on fetching deposit archive ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const page = req.body.limit.page;
      const keyword = req.body.search.keyword;
      DepositModel.fetchArchive({
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
                customer_name: x.customer_name,
                value: x.value,
                payment: x.payment,
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
}

export default DepositController;
