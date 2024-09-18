import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import {
  DraftBillModel,
  IConfirmDraftBillItems,
} from "../model/draft-bill.model";
import PaymentMethodModel from "../model/payment-method.model";

class DraftBillController {
  /**
   * Create a new draft bill
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items as any[];
    const userID = req.body.userId;
    const note = req.body.note;
    const date = new Date();
    const service = req.body.service;
    const delivery = req.body.delivery;
    const uuid = req.body.uuid;

    DraftBillModel.fetchByUUID(uuid).then((result) => {
      if (result === 0) {
        DraftBillModel.create({
          uuid: uuid,
          customer_id: customer_id,
          note: note,
          items: items,
          created_by: userID,
          name: this.generateName(date),
          service: service,
          delivery: delivery,
        })
          .then((result) => {
            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on create draft bill: ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      } else {
        return res.status(400).send(ErrorList["Bill exists"]);
      }
    });
  };

  /**
   * Generate name for draft bill
   * @param date
   * @returns Draft bill name
   */
  static generateName(date: Date) {
    return `INV-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  }

  /**
   * Fetch draft bill by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    Promise.all([
      PaymentMethodModel.fetch("", 0, 0, fetchMode.Autocomplete),
      DraftBillModel.fetchByID(id),
    ])
      .then((result) => {
        return res.status(200).send({
          data: result[1],
          paymentMethods: result[0],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch draft bill by id: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch draft bills
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page =
      req.query.page == undefined || req.query.page == null
        ? 1
        : parseInt(req.query.page.toString());
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const mode = req.body.mode;

    const keyword =
      req.query.keyword == undefined
        ? ""
        : decodeURIComponent(req.query.keyword.toString());

    DraftBillModel.fetch(keyword, limit, offset, mode)!
      .then(([result, count]) => {
        return res.status(200).send({
          data: result,
          count: count,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchByName = (req: Request, res: Response) => {
    const name = req.body.name;
    DraftBillModel.fetchByName(name)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch draft bill by name: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Confirm bill and create new bill
   * @param req
   * @param res
   */
  static confirmByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const payment_method_id =
      req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const service = req.body.service;
    const delivery = req.body.delivery;
    const discount = req.body.discount;
    const userID = req.body.userId;

    const items = req.body.items as any[];

    DraftBillModel.fetchByID(id).then((result) => {
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (result.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const bills: IConfirmDraftBillItems[] = [];

      items.forEach((x) => {
        const id = x.id;

        const draftBillIndex = result.draft_bill.findIndex((y) => y.id == id);
        const price = Number(result.draft_bill[draftBillIndex].price);
        const discount = Number(result.draft_bill[draftBillIndex].discount);

        if (draftBillIndex != -1) {
          bills.push({
            item_id: result.draft_bill[draftBillIndex].item_id,
            item_unit_id: result.draft_bill[draftBillIndex].item_unit_id,
            quantity: Number(result.draft_bill[draftBillIndex].quantity),
            discount: discount,
            price: price,
          });
        }
      });
      DraftBillModel.confirm({
        id: id,
        name: result.name,
        date: new Date(result.created_at!),
        customer_id: result.customer_id,
        payment_method_id: payment_method_id,
        service: service,
        delivery: delivery,
        discount: discount,
        items: bills,
        userID: userID,
      })
        .then(async (bill) => {
          const socket = new SocketHelper("delete-draft-bill", {
            id: result.id,
          });

          socket.create();
          await queue.add("create-sales-invoice", bill);
          return res.status(201).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on confirm draft bill: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };

  /**
   * Delete draft bill by ID
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const userID = req.body.userId;
    DraftBillModel.deleteByID(id, userID)
      .then((result) => {
        const socket = new SocketHelper("delete-draft-bill", {
          id: result.id,
        });

        socket.create();
        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting draft bill ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch draft bill archives
   * @param req
   * @param res
   */
  static fetchArchives = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      DraftBillModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                count: parseInt(x.count.toString()),
              };
            })
          );
        })
        .catch((error) => {
          console.error(`[error]: Error on fetch draft bill archives ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      DraftBillModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(`[error]: Error on fetch draft bill archives ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (req.query.year != undefined && req.query.month != undefined) {
      const year = parseInt(req.query.year.toString());
      const month = parseInt(req.query.month.toString());
      const page =
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());

      DraftBillModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.created_at,
                is_delete: x.is_delete == 1,
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString()),
          });
        })
        .catch((error) => {
          console.error(`[error]: Error on fetch draft bill archives ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      return res.status(404).send(ErrorList["Parameter error"]);
    }
  };
}

export default DraftBillController;
