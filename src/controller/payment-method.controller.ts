import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import PaymentMethodModel, {
  IPaymentMethodManual,
} from "../model/payment-method.model";

class PaymentMethodController {
  /**
   * Create a new payment method
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    PaymentMethodModel.create({
      name: name,
      description: description,
      created_by: userID,
    })
      .then((result) => {
        const socket = new SocketHelper("createPaymentMethod", {
          ...result,
          can_delete: true,
        });
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on create payment method: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch payment method
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PaymentMethodModel.fetch(keyword, offset, limit, fetchMode.Pagination)!
      .then((result) => {
        return res.status(200).send({
          data: (result[0] as IPaymentMethodManual[]).map((x) => {
            return {
              ...x,
              can_delete: x.can_delete == "1" ? true : false,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch payment method: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch payment method autocomplete
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    PaymentMethodModel.fetch(keyword, 0, 5, fetchMode.Autocomplete)!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch all payment method
   * @param req
   * @param res
   */
  static fetchAll = (_: Request, res: Response) => {
    PaymentMethodModel.fetch("", 0, 0, fetchMode.All)!
      .then((result) => {
        return res.status(200).send({
          data: result,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch payment method by id
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PaymentMethodModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send({
          ...result[0],
          can_delete: result[0].can_delete == "1" ? true : false,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch payment method: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update payment method
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    PaymentMethodModel.fetchByID(id)
      .then((payment_method) => {
        if (payment_method[0] == null || payment_method[0].is_delete) {
          return res.status(404).send("Metode pembayaran tidak ditemukan.");
        } else {
          PaymentMethodModel.update({
            id: id,
            name: name,
            description: description,
            created_by: userID,
          })
            .then((result) => {
              const socket = new SocketHelper("updatePaymentMethod", result);
              socket.create();

              return res.status(201).send(result);
            })
            .catch((error) => {
              console.error(
                `[error]: Error on update payment method: ${error}`
              );
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Delete payment method
   * @param req
   * @param res
   */
  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    PaymentMethodModel.fetchByID(id)
      .then((result) => {
        if (!result || result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (!result[0].can_delete) {
          return res.status(400).send(ErrorList["Delete error"]);
        }

        PaymentMethodModel.delete(id, userID)
          .then((result) => {
            const socket = new SocketHelper("deletePaymentMethod", result);
            socket.create();
            return res.status(201).send(result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default PaymentMethodController;
