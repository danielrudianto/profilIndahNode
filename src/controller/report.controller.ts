import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
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

    static fetchSalesChart = (req: Request, res: Response) => {
        const shift = parseInt(req.query.shift!.toString());
        const monthly = (req.query.monthly === "false") ? false : (req.query.monthly === "true") ? true : false;
        const type = parseInt(req.query.type!.toString());
        const limit = parseInt(process.env.LIMIT!);
        const date = new Date();
        date.setMonth(date.getMonth() - shift);

        const current_year = date.getFullYear();
        const current_month = date.getMonth() + 1;
        switch (type){
            case 0:
                // Ambil data penjualan
                BillCodeModel.fetchChartItems(monthly, limit, shift).then(result => {
                    const response: any[] = [];
                    if(monthly){
                        (result as any[]).forEach(x => {
                            const month = x.month;
                            const year = x.year;
                            const value = x.value;
                            const month_difference = (month - current_month) + (year - current_year) * 12;
                            response[Math.abs(month_difference)] = value;
                        })

                        for(var i = 0; i < 10; i++){
                            response[i] = response[i] | 0;
                        }

                        return res.status(200).send(response);
                    } else {
                        (result as any[]).forEach(x => {
                            const month = x.month;
                            const year = x.year;
                            const value = x.value;
                            const month_difference = (month - current_month) + (year - current_year) * 12;
                            response[Math.abs(month_difference)] = value;
                        })

                        for(var i = 0; i < 10; i++){
                            response[i] = response[i] | 0;
                        }

                        return res.status(200).send(response);
                    }
                }).catch(error => {
                    LogHelper.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                    return res.status(500).send(error);
                })
                break;
            case 1:
                // Ambil data penjualan
                ItemModel.fetchChartItems(monthly, limit, shift).then(result => {
                    const response: any[] = [];
                    if(monthly){
                        (result as any[]).forEach(x => {
                            const month = x.month;
                            const year = x.year;
                            const value = x.value;
                            const month_difference = (month - current_month) + (year - current_year) * 12;
                            response[Math.abs(month_difference)] = value;
                        })

                        return res.status(200).send(response);
                    } else {
                        (result as any[]).forEach(x => {
                            const month = x.month;
                            const year = x.year;
                            const value = x.value;
                            const month_difference = (month - current_month) + (year - current_year) * 12;
                            response[Math.abs(month_difference)] = value;
                        })

                        return res.status(200).send(response);
                    }
                }).catch(error => {
                    LogHelper.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                    return res.status(500).send(error);
                })
                break;
            case 2:
                ItemModel.fetchChartItems(monthly, limit, shift).then(result => {
                    console.log(result);
                    return res.status(200).send(result);
                }).catch(error => {
                    LogHelper.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                    return res.status(500).send(error);
                })
                break;
        }
    }
}

export default ReportController;