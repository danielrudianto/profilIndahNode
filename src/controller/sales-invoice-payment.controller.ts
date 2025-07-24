import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";

export class SalesInvoicePaymentController {
  salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  receivableRepository: ReceivableRepository;
  salesInvoiceRepository: SalesInvoiceRepository;

  constructor(
    salesInvoicePaymentRepository: SalesInvoicePaymentRepository,
    receivableRepository: ReceivableRepository,
    salesInvoiceRepository: SalesInvoiceRepository
  ) {
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.receivableRepository = receivableRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
  }

  create = async (req: Request, res: Response) => {
    const sales_invoice_code_id = req.body.sales_invoice_code_id;
    const payment_method_id = req.body.payment_method_id;
    const value = req.body.value;
    const date = new Date(req.body.date);

    try {
      const salesInvoice = await this.salesInvoiceRepository.fetchByID(
        sales_invoice_code_id
      );
      if (!salesInvoice || salesInvoice.isDelete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const previousPayments = salesInvoice.sales_invoice_payment?.reduce(
        (a, b) => {
          return a + b.value;
        },
        0
      );

      const salesInvoiceValue =
        salesInvoice.sales_invoice!.reduce((a, b) => {
          return a + b.quantity * (b.price - b.discount);
        }, 0) +
        salesInvoice.delivery +
        salesInvoice.service -
        salesInvoice.discount;

      // may not be greater
      if (salesInvoiceValue < previousPayments + value) {
        return res
          .status(400)
          .send(ErrorList["Sales invoice payment is greater than value"]);
      }

      const result = await this.salesInvoicePaymentRepository.create({
        sales_invoice_code_id: sales_invoice_code_id,
        value: value,
        payment_method_id: payment_method_id,
        date: date,
      });

      await this.receivableRepository.addReceivableValue(value * -1);

      return res.status(201).send(result);
    } catch (error) {
      return res.status(500).send(error);
    }
  };
}
