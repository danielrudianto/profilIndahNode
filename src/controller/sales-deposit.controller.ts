import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  translateDate,
  translateKeyword,
  translatePage,
  translateSalesName,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { SalesDepositPaymentModel } from "../model/sales-deposit-payment.model";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockRepository } from "../repositories/stock.repository";

export class SalesDepositController {
  salesDepositRepository: SalesDepositRepository;
  salesInvoiceRepository: SalesInvoiceRepository;
  stockCardRepository: StockCardRepository;
  stockRepository: StockRepository;
  stockOutRepository: StockOutRepository;
  receivableRepository: ReceivableRepository;
  overpaymentRepository: OverpaymentRepository;

  constructor(
    salesDepositRepository: SalesDepositRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    stockCardRepository: StockCardRepository,
    stockRepository: StockRepository,
    stockOutRepository: StockOutRepository,
    receivableRepository: ReceivableRepository,
    overpaymentRepository: OverpaymentRepository
  ) {
    this.salesDepositRepository = salesDepositRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.stockCardRepository = stockCardRepository;
    this.stockRepository = stockRepository;
    this.stockOutRepository = stockOutRepository;
    this.receivableRepository = receivableRepository;
    this.overpaymentRepository = overpaymentRepository;
  }

  create = async (req: Request, res: Response) => {
    const userID = req.body.userId;
    const customerID = req.body.customer_id;
    const discount = Number(req.body.discount);
    const delivery = Number(req.body.delivery);
    const service = Number(req.body.service);
    const sales_invoice = req.body.sales_invoice as any[];
    const sales_invoice_payment = req.body.sales_invoice_payment as any[];
    const payment_term = req.body.payment_term;
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
        sales: sales,
        isPaid: isPaid,
        date: date,
        createdBy: userID,
        createdAt: new Date(),
        isConfirm: true,
        confirmedBy: userID,
        confirmedAt: new Date(),
        sales_deposit: sales_invoice,
        sales_deposit_payment: sales_invoice_payment.map((x) => {
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

  fetchByID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await this.salesDepositRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales deposit ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.salesDepositRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching annual archive ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const offset = Number(process.env.LIMIT!);
    const isActive = req.body.isActive as boolean;
    const isDelete = req.body.isDelete as boolean;

    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;

    try {
      const result = await this.salesDepositRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        limit: offset,
        offset: (page - 1) * offset,
        isActive: isActive,
        isDelete: isDelete,
        sortBy: sortBy,
        sortDirection: sortDirection,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archive ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  confirm = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const date = new Date(req.body.date);
    const userID = req.body.userId;
    const sales_invoice_payment = req.body.sales_invoice_payment as any[];
    const service = req.body.service;
    const delivery = req.body.delivery;
    const discount = req.body.discount;

    try {
      const deposit = await this.salesDepositRepository.fetchByID(id);
      if (!deposit) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (deposit.isDelete || deposit.isConfirm) {
        return res.status(400).send(ErrorList["Deposit already confirmed"]);
      }

      const value =
        (deposit.sales_deposit?.reduce((a, b) => {
          return a + b.quantity * (b.price - b.discount);
        }, 0) ?? 0) +
        deposit.delivery +
        deposit.service -
        deposit.discount;

      const payment = sales_invoice_payment.reduce((a: any, b: any) => {
        return a + b.value;
      }, 0);

      if (payment > value) {
        return res
          .status(400)
          .send(ErrorList["Sales deposit payment is greater than value"]);
      }
      const customerID = deposit.customerID;

      const result = await this.salesInvoiceRepository.create({
        name: this.salesDepositRepository.generateName(date),
        date: new Date(date),
        customerID: customerID,
        sales: deposit.sales,
        createdAt: new Date(),
        createdBy: userID,
        discount: deposit.discount,
        delivery: deposit.delivery,
        service: deposit.service,
        uuid: deposit.uuid,
        sales_invoice: deposit.sales_deposit!.map((x) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
        sales_invoice_payment: sales_invoice_payment!.map((x: any) => {
          return {
            payment_method_id: x.payment_method_id,
            value: x.value,
            date: new Date(x.date),
            sales_invoice_code_id: 0,
          };
        }),
        isPaid: deposit.isPaid,
        isConfirm: true,
        isDelete: false,
        confirmedAt: new Date(),
        confirmedBy: userID,
      });

      await this.salesDepositRepository.confirmByID(id, userID);

      if (!deposit.isPaid) {
        await this.receivableRepository.addReceivableValue(value - payment);
      }

      await this.stockOutRepository.create(
        result.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;
          return {
            stock_in_id: null,
            product_id: x.product_id,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            date: date,
            quantity: Number(x.quantity * conversion),
            price: Number(x.price / conversion),
            sales_invoice_id: x.id!,
            sales_invoice_code_id: result.id!,
          };
        })
      );

      await this.stockRepository.updateMany(
        result.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;

          return {
            productID: x.product_id,
            quantity: -1 * x.quantity * conversion,
          };
        })
      );

      const stockCardResult = await this.stockCardRepository.createMany(
        result.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;

          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: -1 * x.quantity * conversion,
            display_quantity: -1 * x.quantity,
            date: result.date,
            document_name: result.name,
            sales_invoice_id: x.id!,
            sales_invoice_code_id: result.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            good_receipt_code_id: null,
            good_receipt_id: null,
            sales_return_id: null,
            sales_return_code_id: null,
            stock: null,
            customer_id: result.customerID,
            supplier_id: null,
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on confirming sales deposit ${error}`);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const userID = req.body.userId;
    const date = new Date(req.body.date);

    const return_payment_date = new Date(req.body.return_payment_date);
    const return_payment_method = req.body.return_payment_method;
    const return_payment_number = req.body.return_payment_number;
    const return_payment_bank = req.body.return_payment_bank;
    const return_payment_name = req.body.return_payment_name;

    try {
      const salesDeposit = await this.salesDepositRepository.fetchByID(id);
      if (!salesDeposit) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (salesDeposit.isConfirm || salesDeposit.isDelete) {
        return res.status(400).send(ErrorList["Deposit already confirmed"]);
      }

      const result = await this.salesDepositRepository.delete(id, userID);

      await this.overpaymentRepository.createMany(
        salesDeposit.sales_deposit_payment!.map((x) => {
          return {
            date: x.date,
            sales_deposit_code_id: id,
            customer_id: salesDeposit.customerID!,
            return_payment_date: return_payment_date,
            return_payment_bank: return_payment_bank,
            return_payment_name: return_payment_name,
            return_payment_method: return_payment_method,
            return_payment_number: return_payment_number,
            created_by: userID,
            created_at: new Date(),
            value: Number(x.value),
          };
        })
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting sales deposit ${error}`);
    }
  };
}
