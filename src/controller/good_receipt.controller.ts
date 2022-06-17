import { Request, Response } from "express";
import GoodReceiptModel from "../model/good_receipt.model";

class GoodReceiptController {
    static getById = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        GoodReceiptModel.getById(id).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default GoodReceiptController;