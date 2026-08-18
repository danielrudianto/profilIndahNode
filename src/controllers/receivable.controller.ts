import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { PAYMENT_ROUNDING_TOLERANCE } from "../constants/receivable.constant";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { translatePage, translatePageSize } from "../utils/escape.helper";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";

class ReceivableController {
  private receivableRepository: ReceivableRepository;
  private salesInvoiceRepository: SalesInvoiceRepository;

  constructor(
    receivableRepository: ReceivableRepository,
    salesInvoiceRepository: SalesInvoiceRepository
  ) {
    this.receivableRepository = receivableRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
  }

  fetch = async (req: Request, res: Response) => {
    try {
      console.log("start fetching");
      const result = await this.receivableRepository.fetch();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching receivable ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchByCustomerID = async (req: Request, res: Response) => {
    const customerID = Number(req.params.id);
    const page = translatePage(req.query.page);
    const pageSize = translatePageSize(req.query.pageSize);

    try {
      const result = await this.receivableRepository.fetchByCustomerID({
        customerID: customerID == 0 ? null : customerID,
        page: page,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching receivable by customerID ${error}`
      );
      return res.status(500).send(error);
    }
  };

  createPayment = async (req: Request, res: Response) => {
    try {
      const {
        date,
        amount,
        payment_method_id,
        full_payment,
        sales_invoice_id,
      } = req.body;

      const salesInvoice =
        await this.salesInvoiceRepository.fetchByID(sales_invoice_id);

      if (!salesInvoice || salesInvoice.isDelete) {
        return res.status(404).send(ErrorList["Sales invoice not found"]);
      }

      // Calculate the total value of the sales invoice
      const totalValue =
        salesInvoice.sales_invoice!.reduce(
          (sum: number, item: any) =>
            sum + item.quantity * (item.price - item.discount),
          0
        ) +
        salesInvoice.delivery +
        salesInvoice.service -
        salesInvoice.discount;

      // Calculate the total previous payments
      const previousPayment = salesInvoice.sales_invoice_payment!.reduce(
        (sum: number, payment: any) => sum + payment.value,
        0
      );

      const maximumPaymentValue = totalValue - previousPayment;

      // Handle full payment
      if (full_payment) {
        const result = await this.receivableRepository.create({
          date: new Date(date),
          payment_method_id,
          sales_invoice_code_id: sales_invoice_id,
          amount: maximumPaymentValue,
          is_paid: true,
        });
        return res.status(201).send(result);
      }

      // Handle partial payment
      if (amount > maximumPaymentValue) {
        return res
          .status(400)
          .send(ErrorList["Receivable exceed sales invoice"]);
      }

      const result = await this.receivableRepository.create({
        date: new Date(date),
        payment_method_id,
        sales_invoice_code_id: sales_invoice_id,
        amount,
        // Kesamaan persis membuat sisa Rp 1-5 hasil pembulatan
        // menggantungkan faktur "belum lunas" selamanya.
        is_paid: maximumPaymentValue - amount <= PAYMENT_ROUNDING_TOLERANCE,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on creating sales invoice payment ${error}`
      );
      return res.status(500).send(error);
    }
  };
}

export default ReceivableController;
