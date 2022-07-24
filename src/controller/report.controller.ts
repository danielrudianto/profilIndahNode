import { Request, Response } from "express";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import { ItemModel } from "../model/item.model";

class ReportController {
    static fetchSalesStats = (req: Request, res: Response) => {
        const date = new Date();
        const date_before = new Date();
        date_before.setDate(date_before.getDate() - 1);

        Promise.all([
            BillCodeModel.fetchByDate(date),
            BillCodeModel.fetchByDate(date_before),
            ItemModel.fetchSoldByDate(date),
            ItemModel.fetchSoldByDate(date_before),
            BillModel.fetchQuantitySoldByDate(date),
            BillModel.fetchQuantitySoldByDate(date_before)
        ]).then(result => {
            return res.status(200).send({
                sales: (result[0] as any[])[0].value || 0,
                prev_sales: (result[1] as any[])[0].value || 0,
                items: (result[2] as any[])[0].count,
                prev_items: (result[3] as any[])[0].count,
                count: (result[4] as any[])[0].quantity || 0,
                prev_count: (result[5] as any[])[0].quantity || 0
            });
        })
    }
}

export default ReportController;