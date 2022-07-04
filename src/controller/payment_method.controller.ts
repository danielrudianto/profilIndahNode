import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill_code.model";
import PaymentMethodModel from "../model/payment_method.model";

class PaymentMethodController {
  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PaymentMethodModel.fetch(keyword, offset, limit)
      .then((result) => {
        BillModel.countByPaymentMethodIds(
          result[0].map((x) => {
            return x.id;
          })
        )
          .then((count) => {
            return res.status(200).send({
              data: result[0].map((datum) => {
                return {
                  ...datum,
                  can_delete:
                    count.filter((y) => {
                      y.payment_method_id == datum.id;
                    }).length == 0
                      ? true
                      : count.filter((y) => {
                          y.payment_method_id == datum.id;
                        })[0]._count == 0,
                };
              }),
              count: result[1],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static submit = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const name = req.body.name;
    const description = req.body.description;

    const paymentMethod = new PaymentMethodModel(
      name,
      description,
      req.body.userId
    );
    paymentMethod
      .create()
      .then((result) => {
        LogHelper.log(
          result.created_at,
          "info",
          `${result.user.name} berhasil menambahkan metode pembayaran dengan nama ${result.name} (ID: ${result.id}).`,
          "Payment Method - Create",
          req.body.userId
        );
        const socket = new SocketHelper("createPaymentMethod", {
          ...result,
          can_delete: true,
        });
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Payment Method - Create",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    PaymentMethodModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Payment Method - Create",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PaymentMethodModel.fetchById(id).then((result) => {
      return res.status(200).send({
        ...result[0],
        can_delete: result[1] == 0,
      });
    }).catch(error => {
      LogHelper.log(
        new Date(),
        "error",
        error,
        "Payment Method - Fetch by ID",
        req.body.userId
      );

      return res.status(500).send(error);
    })
  };

  static update = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;

    PaymentMethodModel.fetchById(id).then((payment_method) => {
      if (payment_method[0] == null || payment_method[0].is_delete) {
        return res.status(404).send("Metode pembayaran tidak ditemukan.");
      } else {
        const paymentMethod = new PaymentMethodModel(
          name,
          description,
          req.body.userId,
          id
        );

        paymentMethod.update().then((result) => {
          const socket = new SocketHelper("updatePaymentMethod", result);
          socket.create();

          return res.status(201).send(result);
        }).catch(error => {
          LogHelper.log(
            new Date(),
            "error",
            error,
            "Payment Method - Update",
            req.body.userId
          ); 
          return res.status(500).send(error);
        })
      }
    }).catch(error => {
      LogHelper.log(
        new Date(),
        "error",
        error,
        "Payment Method - Update",
        req.body.userId
      ); 
      
      return res.status(500).send(error);
    })
  };
}

export default PaymentMethodController;
