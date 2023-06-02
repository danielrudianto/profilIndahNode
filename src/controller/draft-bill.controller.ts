import { Request, Response } from "express";
import { DraftBillModel } from "../model/draft-bill.model";
import cron from "node-cron";

class DraftBillController {
  static create = (req: Request, res: Response) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items as any[];
    const userID = req.body.userId;
    const note = req.body.note;

    const draftBill = new DraftBillModel(
      customer_id,
      note,
      items,
      userID
    );

    draftBill
      .create()
      .then((result) => {
        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static order = (req: Request, res: Response) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const delivery = req.body.delivery;
    const service = req.body.service;
    const items = req.body.items as any[];
    const payment_method_id = req.body.payment_method_id;

    DraftBillModel.fetchByID(id).then((result) => {
      if (result == null) {
        return res.status(404).send("Draft bill not found.");
      } else if (result.is_delete) {
        return res.status(404).send("Draft bill is deleted.");
      } else {
        const date = new Date(result.created_at!);
        const name = `INV-${date.getFullYear()}-${Math.floor(
          Math.random() * 10
        )}${Math.floor(Math.random() * 10)}${Math.floor(
          Math.random() * 10
        )}${Math.floor(Math.random() * 10)}${Math.floor(
          Math.random() * 10
        )}${Math.floor(Math.random() * 10)}${Math.floor(
          Math.random() * 10
        )}${Math.floor(Math.random() * 10)}`;

        DraftBillModel.order(
          id,
          name,
          discount,
          delivery,
          service,
          result.customer_id,
          payment_method_id,
          items.map((x) => {
            const draftBillItemIndex = result.draft_bill.findIndex(
              (y) => y.id == x.id
            );
            if (draftBillItemIndex != -1) {
              return {
                item_id: result.draft_bill[draftBillItemIndex].item_id,
                item_unit_id:
                  result.draft_bill[draftBillItemIndex].item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
              };
            }
          }),
          date,
          req.body.userId
        )
          .then((result) => {
            return res.status(201).send(result[1]);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static truncateData = () => {
    // Create cron job
    // To truncate data every day at 00:00

    cron.schedule("0 0 0 * * *", async () => {
      await DraftBillModel.truncateData();
    });
  };
}

export default DraftBillController;
