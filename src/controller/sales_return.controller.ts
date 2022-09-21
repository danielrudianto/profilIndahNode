import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";

class SalesReturnController {
    static create = (req: Request, res: Response) => {
        
    }

    static fetchSearch = (req: Request, res: Response) => {
        const date = new Date(req.body.date);
        const items = req.body.item as any[];

        BillCodeModel.fetchSearch(date, items).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default SalesReturnController;