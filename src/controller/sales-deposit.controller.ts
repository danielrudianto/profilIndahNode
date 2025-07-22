import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  translateDate,
  translateKeyword,
  translatePage,
  translateSalesName,
} from "../helper/escape.helper";
import { SalesDepositPaymentModel } from "../model/sales-deposit-payment.model";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";

export class SalesDepositController {
  private salesDepositRepository: SalesDepositRepository;

  constructor(salesDepositRepository: SalesDepositRepository) {
    this.salesDepositRepository = salesDepositRepository;
  }

  create = async (req: Request, res: Response) => {
    const userID = req.body.userId;
    const customerID = req.body.customer_id;
    const discount = Number(req.body.discount);
    const delivery = Number(req.body.delivery);
    const service = Number(req.body.service);
    const sales_invoice = req.body.sales_invoice as any[];
    const sales_invoice_payment = req.body.sales_invoice_payment as any[];
    const paymentTerm = req.body.payment_term;
    const date = translateDate(req.body.date);
    const isPaid = req.body.is_paid;
    const sales = translateSalesName(req.body.sales);
    const uuid = req.body.uuid;
    const type = req.body.type;

    try {
      const billResult = await this.salesDepositRepository.create({
        name: this.salesDepositRepository.generateName(date),
        uuid: uuid,
        customerID: customerID,
        discount: discount,
        delivery: delivery,
        service: service,
        paymentTerm: paymentTerm,
        sales: sales,
        isPaid: isPaid,
        date: date,
        createdBy: userID,
        createdAt: new Date(),
        isConfirm: true,
        confirmedBy: userID,
        confirmedAt: new Date(),
        deposit: sales_invoice,
        deposit_payment: sales_invoice_payment.map((x) => {
          return new SalesDepositPaymentModel({
            date: translateDate(x.date),
            payment_method_id: x.payment_method_id,
            value: Number(x.value),
            sales_deposit_code_id: 0,
          });
        }),
        isDelete: false,
        type: type,
      });

      if (!billResult) {
        return res.status(500).send(ErrorList["Sales deposit creation failed"]);
      }

      return res.status(201).send(billResult);
    } catch (error) {
      console.error(`[error]: Error on creating bill ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    const pageSize = Number(process.env.LIMIT!);

    try {
      const result = await this.salesDepositRepository.fetch({
        page: page,
        pageSize: pageSize,
        keyword: keyword,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales deposit ${error}`);
      return res.status(500).send(error);
    }
  };
}
