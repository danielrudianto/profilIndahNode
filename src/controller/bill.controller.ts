import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
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

        const bill_code = new BillCodeModel(customer_id, req.body.userId, payment_method_id, discount, delivery);
        bill_code.create().then(result => {
            BillModel.create(bill.map(x => {
                return {
                    ...x,
                    bill_code_id: result.id
                }
            })).then(() => {
                LogHelper.log(new Date(), "info", `${result.user_bill_code_created_byTouser.name} berhasil menambahkan faktur penjualan ${result.name} (ID: ${result.id})`, "Bill controller - Create", req.body.userId);
                return res.status(201).send(result);
            }).catch(error => {
                LogHelper.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
                return res.status(500).send(error);
            })
        }).catch(error => {
            LogHelper.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
            return res.status(500).send(error);
        })
    }
}

export default BillController;