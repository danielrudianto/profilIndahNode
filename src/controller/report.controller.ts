import { Request, Response } from "express";
import LogHelper from "../helper/log.helper";
import StockValueHelper from "../helper/stock_value.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import { ItemModel } from "../model/item.model";
import PurchaseDocumentModel from "../model/purchase_document.model";
import SalesDistributionModel from "../model/sales_distribution.model";

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

    static fetchMonthlySalesStats = (req: Request, res: Response) => {
        const date = new Date();
        const date_before = new Date();
        date_before.setMonth(date_before.getMonth() - 1);

        Promise.all([
            BillCodeModel.fetchMonthlyByDate(date),
            BillCodeModel.fetchMonthlyByDate(date_before),
            ItemModel.fetchMonthlySoldByDate(date),
            ItemModel.fetchMonthlySoldByDate(date_before),
            BillModel.fetchMonthlyQuantitySoldByDate(date),
            BillModel.fetchMonthlyQuantitySoldByDate(date_before)
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
                    if(monthly){
                        const response: any = {};
                        response['current'] = [];
                        response['previous'] = [];

                        ((result as any[])[0] as any[]).forEach(x => {
                            const value = x.value;
                            const diff = parseInt(x.diff);
                            response['current'][Math.abs(diff)] = value;
                        });

                        for(var i = 0; i < 10; i++){
                            response['current'][i] = response['current'][i] || 0;
                        }

                        ((result as any[])[1] as any[]).forEach(x => {
                            const value = x.value;
                            const diff = parseInt(x.diff);
                            response['previous'][Math.abs(diff + 12)] = value;
                        })

                        for(var i = 0; i < 10; i++){
                            response['previous'][i] = response['previous'][i] | 0;
                        }

                        return res.status(200).send(response);
                    } else {
                        const response: any = [];
                        (result as any[]).forEach(x => {
                            const diff = x.diff;
                            const value = x.value;
                            response[Math.abs(diff)] = value;
                        });

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
                        const response: any = {};
                        response['current'] = [];
                        response['previous'] = [];

                        ((result as any[])[0] as any[]).forEach(x => {
                            const value = x.count;
                            const diff = parseInt(x.diff);
                            response['current'][Math.abs(diff)] = value;
                        });

                        for(var i = 0; i < 10; i++){
                            response['current'][i] = response['current'][i] || 0;
                        }

                        ((result as any[])[1] as any[]).forEach(x => {
                            const value = x.count;
                            const diff = parseInt(x.diff);
                            response['previous'][Math.abs(diff + 12)] = value;
                        })

                        for(var i = 0; i < 10; i++){
                            response['previous'][i] = response['previous'][i] | 0;
                        }

                        return res.status(200).send(response);
                    } else {
                        const response: any = [];
                        (result as any[]).forEach(x => {
                            const diff = x.diff;
                            const value = x.count;
                            response[Math.abs(diff)] = value;
                        });

                        for(var i = 0; i < 10; i++){
                            response[i] = response[i] | 0;
                        }

                        return res.status(200).send(response);
                    }
                }).catch(error => {
                    console.log(error);
                    LogHelper.log(new Date(), "error", error, "Report controller - Fetch sales chart", req.body.userId);
                    return res.status(500).send(error);
                })
                break;
            case 2:
                ItemModel.fetchChartItems(monthly, limit, shift).then(result => {
                    if(monthly){
                        const response: any = {};
                        response['current'] = [];
                        response['previous'] = [];

                        ((result as any[])[0] as any[]).forEach(x => {
                            const value = x.count;
                            const diff = parseInt(x.diff);
                            response['current'][Math.abs(diff)] = value;
                        });

                        for(var i = 0; i < 10; i++){
                            response['current'][i] = response['current'][i] || 0;
                        }

                        ((result as any[])[1] as any[]).forEach(x => {
                            const value = x.count;
                            const diff = parseInt(x.diff);
                            response['previous'][Math.abs(diff + 12)] = value;
                        })

                        for(var i = 0; i < 10; i++){
                            response['previous'][i] = response['previous'][i] | 0;
                        }

                        return res.status(200).send(response);
                    } else {
                        const response: any = [];
                        (result as any[]).forEach(x => {
                            const diff = x.diff;
                            const value = x.count;
                            response[Math.abs(diff)] = value;
                        });

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
        }
    }

    static fetchPLStats = (req: Request, res: Response) => {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        if(month == 0){
            // Fetch annual report
            Promise.all([
                BillCodeModel.fetchSum(month, year),
                SalesDistributionModel.fetchSum(month, year)
            ]).then(result => {
                console.log(result);
            })
        } else {
            // Fetch monthly report
            Promise.all([
                BillCodeModel.fetchSum(month, year),
                SalesDistributionModel.fetchSum(month, year)
            ]).then(result => {
                console.log(result);
            })
        }
    }

    static fetchFrequentItems = (req: Request, res: Response) => {
        const monthly = (!req.query.monthly) ? false : (req.query.monthly === 'true') ? true : false;
        ItemModel.fetchFrequentItems(monthly).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            LogHelper.log(new Date(), "error", error, "Report Controller - Fetch frequent items", req.body.userId);
            return res.status(500).send(error);
        })      
    }
}

export default ReportController;