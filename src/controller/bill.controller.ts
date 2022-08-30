import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";

class BillController {
  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const bill = req.body.bill as any[];
    const date = (!req.body.date || req.body.date == null) ? new Date() : new Date(req.body.date);

    const bill_code = new BillCodeModel(
      customer_id,
      req.body.userId,
      payment_method_id,
      discount,
      delivery,
      date
    );

    bill_code
      .create()
      .then((result) => {
        BillModel.create(
          bill.map((x) => {
            return {
              ...x,
              bill_code_id: result.id,
            };
          })
        )
          .then(() => {
            LogHelper.log(
              new Date(),
              "info",
              `${result.user_bill_code_created_byTouser.name} berhasil menambahkan faktur penjualan ${result.name} (ID: ${result.id})`,
              "Bill controller - Create",
              req.body.userId
            );
            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(error);
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Bill controller - Create",
              req.body.userId
            );
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        console.error(error);
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Bill controller - Create",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static fetchCodeById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillCodeModel.fetchCodeById(id).then(result => {
      return res.status(200).send(result?.bill_code);
    }).catch(error => {
      LogHelper.log(new Date(), "error", error, "Bill controller - Fetch code by ID", req.body.userId);
      return res.status(500).send(error);
    })
  }

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchById(id).then(result => {
      return res.status(200).send(result);
    }).catch(error => {
      return res.status(500).send(error);
    })
  }

  static fetchArchive = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!req.params.year && !req.params.month) {
      const archive_years = BillCodeModel.fetchArchiveYears();
      const count_archive_years = BillCodeModel.countArchiveByYear();

      const transaction = new QueryTransactionHelper();
      transaction
        .create([archive_years, count_archive_years])
        .then((result) => {
          const response: any[] = [];
          (result[0] as any[]).forEach((item) => {
            response.push({
              year: item.year,
              count: (result[1] as any[]).filter((x) => x.year == item.year)[0]
                .count,
            });
          });

          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (!req.params.month) {
      const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      BillCodeModel.countArchiveByMonth(year)
        .then((counts) => {
          (counts as any[]).forEach((x) => {
            const month = x.month;
            const num = x.count;

            count[month - 1] = num;
          });

          return res.status(200).send(count);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.params.year && req.params.month) {
      const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
      const limit = parseInt(process.env.LIMIT!.toString());
      const offset = (page - 1) * limit;

      const transaction = new QueryTransactionHelper();
      transaction
        .create([
          BillCodeModel.fetchArchive(year, month, offset, limit),
          BillCodeModel.countArchive(year, month),
        ])
        .then((result) => {
          return res.status(200).send({
            data: result[0],
            count: result[1],
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Input tidak dikenal.");
    }
  };
}

export default BillController;
