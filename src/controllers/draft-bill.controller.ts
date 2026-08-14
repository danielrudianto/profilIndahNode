import { Request, Response } from "express";
import moment from "moment";
import ErrorList from "../constants/error_list";
import SocketHelper from "../utils/socket.helper";
import { IConfirmDraftBillItems } from "../interfaces/draft-bill.interface";
import { DraftBillRepository } from "../repositories/draft-bill.repository";

class DraftBillController {
  private draftBillRepository: DraftBillRepository;

  constructor(draftBillRepository: DraftBillRepository) {
    this.draftBillRepository = draftBillRepository;
  }

  /**
   * Create a new draft bill
   * @param req
   * @param res
   */
  create = (req: Request, res: Response) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items as any[];
    const userID = req.body.userId;
    const note = req.body.note;
    const date = new Date();
    const service = req.body.service;
    const delivery = req.body.delivery;
    const otc = req.body.otc;

    this.draftBillRepository
      .create({
        otc: otc,
        customer_id: customer_id,
        note: note,
        items: items,
        created_by: userID,
        name: DraftBillController.generateName(date),
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

  fetchByName = (req: Request, res: Response) => {
    const name = req.body.name;
    this.draftBillRepository
      .fetchByName(name)
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
  confirmByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const payment_methods = req.body.payment_methods;

    const service = req.body.service;
    const delivery = req.body.delivery;
    const discount = req.body.discount;
    const userID = req.body.userId;

    const items = req.body.items as any[];

    this.draftBillRepository.fetchByID(id).then((result) => {
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (result.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const bills: IConfirmDraftBillItems[] = [];

      items.forEach((x) => {
        const id = x.item_id;
        const product_unit_id = x.product_unit_id;

        const draftBillIndex = result.draft_bill.findIndex(
          (y) => y.product_id == id && y.product_unit_id == product_unit_id
        );

        // if (draftBillIndex != -1) {
        //   const price = Number(result.draft_bill[draftBillIndex].price);
        //   const discount = Number(result.draft_bill[draftBillIndex].discount);
        //   bills.push({
        //     product_id: result.draft_bill[draftBillIndex].product_id,
        //     product_unit_id: result.draft_bill[draftBillIndex].product_unit_id,
        //     quantity: Number(result.draft_bill[draftBillIndex].quantity),
        //     discount: discount,
        //     price: price,
        //   });
        // }
      });

      this.draftBillRepository
        .confirm({
          id: id,
          name: result.name,
          date: new Date(result.created_at!),
          customer_id: result.customer_id,
          payment_methods: payment_methods,
          service: service,
          delivery: delivery,
          discount: discount,
          items: bills,
          userID: userID,
        })
        .then(async ([_, bill]) => {
          const socket = new SocketHelper("confirm-draft-bill", bill);

          socket.create();
          // await queue.add("create-sales-invoice", bill);

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
  deleteByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const userID = req.body.userId;
    this.draftBillRepository
      .deleteByID(id, userID)
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
  fetchArchives = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      this.draftBillRepository
        .fetchArchiveYears(mode)!
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
      this.draftBillRepository
        .fetchArchiveMonths(year, mode)!
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

      this.draftBillRepository
        .fetchArchive(year, month, page, mode)!
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

  /**
   * Ambil draft bill berjalan milik satu OTC pada hari ini.
   *
   * Sebelumnya berada di SalesInvoiceController padahal yang dibaca adalah
   * draft bill, sehingga controller itu ikut bergantung pada model draft bill.
   */
  fetchByOTC = (req: Request, res: Response) => {
    const otc = req.params.otc;
    const date = moment().format("YYYY-MM-DD");
    this.draftBillRepository
      .fetchByOTC({
        otc: otc,
        date: date,
      })
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          return res.status(200).send(result);
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching bill by OTC ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default DraftBillController;
