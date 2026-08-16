import { NextFunction, Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import {
  translateDate,
  translateKeyword,
  translatePage,
  translateSalesName,
} from "../utils/escape.helper";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { queue } from "../utils/queue.helper";
import { SalesInvoicePaymentModel } from "../models/sales-invoice-payment.model";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { SalesInvoiceRebateRepository } from "../repositories/sales-invoice-rebate.repository";

class SalesInvoiceController {
  salesInvoiceRepository: SalesInvoiceRepository;
  receivableRepository: ReceivableRepository;
  salesReturnRepository: SalesReturnRepository;
  stockOutRepository: StockOutRepository;
  productStockRepository: ProductStockRepository;
  salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  stockCardRepository: StockCardRepository;
  salesInvoiceRebateRepository: SalesInvoiceRebateRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    receivableRepository: ReceivableRepository,
    salesReturnRepository: SalesReturnRepository,
    stockOutRepository: StockOutRepository,
    productStockRepository: ProductStockRepository,
    salesInvoicePaymentRepository: SalesInvoicePaymentRepository,
    stockCardRepository: StockCardRepository,
    salesInvoiceRebateRepository: SalesInvoiceRebateRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesInvoiceRebateRepository = salesInvoiceRebateRepository;
    this.receivableRepository = receivableRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.stockOutRepository = stockOutRepository;
    this.productStockRepository = productStockRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.stockCardRepository = stockCardRepository;
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
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
    /*
      Pengembalian diskon berupa uang. Kosong berarti diskonnya memang hanya
      dipotong di faktur, dan tidak ada uang yang keluar.
    */
    const rebate = req.body.rebate;

    try {
      const billResult = await this.salesInvoiceRepository.create({
        name: this.salesInvoiceRepository.generateName(date),
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
        sales_invoice: sales_invoice,
        sales_invoice_payment: sales_invoice_payment.map((x) => {
          return new SalesInvoicePaymentModel({
            date: translateDate(x.date),
            payment_method_id: x.payment_method_id,
            value: Number(x.value),
            sales_invoice_code_id: 0,
          });
        }),
        isDelete: false,
      });

      if (!billResult) {
        return res.status(500).send(ErrorList["Sales invoice creation failed"]);
      }

      /*
        Pengembalian diskon dicatat SETELAH fakturnya ada, sebab ia menunjuk
        ke id faktur itu. Nilainya sengaja tidak ikut mengurangi apa pun di
        atas: fakturnya harus tetap menunjukkan harga penuh, dan justru itu
        alasan potongannya diberikan sebagai uang.
      */
      if (rebate != null && Number(rebate.value) > 0) {
        await this.salesInvoiceRebateRepository.create({
          sales_invoice_code_id: billResult.id!,
          value: Number(rebate.value),
          payment_method_id: rebate.payment_method_id ?? null,
          date: date,
          receiver_name: rebate.receiver_name,
          bank_name: rebate.bank_name ?? null,
          account_number: rebate.account_number ?? null,
          created_by: userID,
          created_at: new Date(),
        });
      }

      if (!isPaid) {
        await this.receivableRepository.addReceivableValue(
          billResult.delivery +
            billResult.service -
            billResult.discount +
            billResult.sales_invoice!.reduce((a, b) => {
              return a + (b.price - b.discount) * b.quantity;
            }, 0) -
            billResult.sales_invoice_payment!.reduce((a, b) => {
              return a + b.value;
            }, 0)
        );
      }

      await this.stockOutRepository.create(
        billResult.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;
          return {
            stock_in_id: null,
            product_id: x.product_id,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            date: date,
            quantity: Number(x.quantity * conversion),
            /*
              NETTO diskon baris, seperti pada pembangunan ulang lewat CLI.
              Harga ini menjadi angka "sales" pada laporan HPP; tanpa
              dikurangi diskon, penjualannya tampak lebih besar dari uang
              yang sungguh masuk.
            */
            price: Number((x.price - x.discount) / conversion),
            sales_invoice_id: x.id!,
            sales_invoice_code_id: billResult.id!,
          };
        })
      );

      await this.productStockRepository.updateMany(
        billResult.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;

          return {
            productID: x.product_id,
            quantity: -1 * x.quantity * conversion,
          };
        })
      );

      const stockCardResult = await this.stockCardRepository.createMany(
        billResult.sales_invoice!.map((x) => {
          const conversion =
            x.product_unit == null ? 1 : x.product_unit.conversion;

          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: -1 * x.quantity * conversion,
            display_quantity: -1 * x.quantity,
            date: billResult.date,
            document_name: billResult.name,
            sales_invoice_id: x.id!,
            sales_invoice_code_id: billResult.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            good_receipt_code_id: null,
            good_receipt_id: null,
            sales_return_id: null,
            sales_return_code_id: null,
            stock: null,
            customer_id: billResult.customerID,
            supplier_id: null,
            created_at: new Date(),
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      /* Penetapan HPP menyusul di worker — lihat case hpp-assign. */
      await queue.add("hpp-assign", {});

      return res.status(201).send(billResult);
    } catch (error) {
      console.error(`[error]: Error on creating bill ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    const salesInvoice = await this.salesInvoiceRepository.fetchByID(id);
    if (!salesInvoice) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (salesInvoice.isDelete) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    const salesReturn =
      await this.salesReturnRepository.fetchBySalesInvoiceCodeID(id);

    if (salesReturn) {
      return res.status(400).send(ErrorList["Sales return exists"]);
    }

    try {
      const result = await this.salesInvoiceRepository.deleteByID(id, userID);

      await this.productStockRepository.updateMany(
        salesInvoice.sales_invoice!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              (x.product_unit == null ? 1 : x.product_unit.conversion) *
              x.quantity,
          };
        })
      );

      await this.stockOutRepository.deleteMany(
        salesInvoice.sales_invoice!.map((x) => {
          return {
            sales_invoice_id: x.id!,
            sales_invoice_code_id: salesInvoice.id!,
            adjustment_case_id: null,
            adjustment_case_code_id: null,
          };
        })
      );

      for (let i = 0; i < salesInvoice.sales_invoice!.length; i++) {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: salesInvoice.id,
          sales_invoice_id: salesInvoice.sales_invoice![i].id,
          adjustment_case_code_id: null,
          adjustment_case_id: null,
          sales_return_code_id: null,
          sales_return_id: null,
          good_receipt_code_id: null,
          good_receipt_id: null,
        });
      }

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting sales invoice ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.salesInvoiceRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archives ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    const keyword = translateKeyword(req.body.keyword);
    const page = translatePage(req.body.page);
    const pageSize = req.body.pageSize;
    const isActive = req.body.isActive as boolean;
    const isDelete = req.body.isDelete as boolean;

    const isPaid = req.body.isPaid as boolean;
    const isUnpaid = req.body.isUnpaid as boolean;

    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;

    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    try {
      const result = await this.salesInvoiceRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        isPaid: isPaid,
        isActive: isActive,
        isUnpaid: isUnpaid,
        isDelete: isDelete,
        sortBy: sortBy,
        sortDirection: sortDirection,
        startDate: startDate,
        endDate: endDate,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archive ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
      const result = await this.salesInvoiceRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: error during fetching sales invoice by ID ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchPayments = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      // `await` sebelumnya tidak ada, sehingga yang dikirim adalah objek
      // Promise-nya, bukan isinya. Express menyerialkannya menjadi `{}`, jadi
      // GET /sales-invoice/payment/:id SELALU membalas 200 dengan riwayat
      // pembayaran kosong — kasir menyimpulkan pelanggan belum membayar
      // padahal pembayarannya tercatat. Blok catch juga tidak pernah aktif
      // karena kegagalannya terjadi setelah balasan terkirim.
      const payments =
        await this.salesInvoicePaymentRepository.fetchPaymentsBySalesInvoiceCodeID(
          id
        );
      return res.status(200).send(payments);
    } catch (error) {
      console.error(`[error]: Error on fetching payments ${error}`);
      return res.status(500).send(error);
    }
  };

  searchSalesReturn = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const sales_invoice = req.body.sales_invoice;

    try {
      const result = await this.salesInvoiceRepository.searchByReturns(
        date,
        sales_invoice
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales return ${error}`);
      return res.status(500).send(error);
    }
  };
}

export default SalesInvoiceController;
