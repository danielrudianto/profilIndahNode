import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import AdjustmentCaseModel from "../model/adjustment_case.model";

class AdjustmentCaseController {
  static post = (req: Request, res: Response) => {
    const name = this.generateName(new Date(req.body.date));
    const adjustment_case = new AdjustmentCaseModel(
      name,
      new Date(req.body.date),
      req.body.userId,
      req.body.company_id
    );

    adjustment_case
      .create()
      .then((result) => {
        AdjustmentCaseModel.createMany(
          (req.body.adjustment_case as any[]).map((x) => {
            return {
              ...x,
              quantity: req.body.type == 0 ? x.quantity : -1 * x.quantity,
              adjustment_case_code_id: result.id,
            };
          })
        )
          .then(() => {
            return res.status(201).send(result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Adjustment case controller - Create",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchArchives = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
      const archive_years = AdjustmentCaseModel.fetchArchiveYears();
      const count_archive_years = AdjustmentCaseModel.countArchiveByYear();

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
    } else if (!req.params.month && req.params.year) {
      const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      AdjustmentCaseModel.countArchiveByMonth(year)
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
          AdjustmentCaseModel.fetchArchive(year, month, offset, limit),
          AdjustmentCaseModel.countArchive(year, month),
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

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    AdjustmentCaseModel.fetchById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchCodeById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }
    
    const id = parseInt(req.params.id.toString());
    AdjustmentCaseModel.fetchCodeById(id)
      .then((result) => {
        return res.status(200).send(result?.adjustment_case_code);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Adjustment Case Controller - fetchCodeById",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static generateName = (date: Date) => {
    return `ADJ-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  };
}

export default AdjustmentCaseController;
