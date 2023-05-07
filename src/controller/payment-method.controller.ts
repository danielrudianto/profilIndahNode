import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import PaymentMethodModel from "../model/payment-method.model";

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
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              ...x,
              can_delete: x.count == 0,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static submit = (req: Request, res: Response) => {
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
        const socket = new SocketHelper("createPaymentMethod", {
          ...result,
          can_delete: true,
        });
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
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
        return res.status(500).send(error);
      });
  };

  static fetchAll = (req: Request, res: Response) => {
    PaymentMethodModel.fetchAll()
      .then((result) => {
        return res.status(200).send({
          data: result,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PaymentMethodModel.fetchById(id)
      .then((result) => {
        return res.status(200).send({
          ...result[0],
          can_delete: result[1] == 0,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;

    PaymentMethodModel.fetchById(id)
      .then((payment_method) => {
        if (payment_method[0] == null || payment_method[0].is_delete) {
          return res.status(404).send("Metode pembayaran tidak ditemukan.");
        } else {
          const paymentMethod = new PaymentMethodModel(
            name,
            description,
            req.body.userId,
            id
          );

          paymentMethod
            .update()
            .then((result) => {
              const socket = new SocketHelper("updatePaymentMethod", result);
              socket.create();

              return res.status(201).send(result);
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PaymentMethodModel.fetchById(id)
      .then((result) => {
        if (result == null || result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else if (result[0].count > 0) {
          return res.status(400).send(ErrorList["Delete error"]);
        } else {
          PaymentMethodModel.delete(id, req.body.userId)
            .then((result) => {
              const socket = new SocketHelper("deletePaymentMethod", result);
              socket.create();
              return res.status(201).send(result);
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default PaymentMethodController;
