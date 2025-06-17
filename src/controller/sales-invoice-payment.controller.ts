import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";

export class SalesInvoicePaymentController {
  private salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  constructor(salesInvoicePaymentRepository: SalesInvoicePaymentRepository) {
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
  }
}
