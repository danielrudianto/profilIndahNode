import { NextFunction, Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  translateDate,
  translateKeyword,
  translatePage,
  translateSalesName,
} from "../helper/escape.helper";
import { DraftBillModel } from "../model/draft-bill.model";
import moment from "moment";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { queue } from "../helper/queue.helper";
import { SalesInvoicePaymentModel } from "../model/sales-invoice-payment.model";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockRepository } from "../repositories/stock.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";

class SalesInvoiceController {
  salesInvoiceRepository: SalesInvoiceRepository;
  receivableRepository: ReceivableRepository;
  salesReturnRepository: SalesReturnRepository;
  stockOutRepository: StockOutRepository;
  stockRepository: StockRepository;
  salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  stockCardRepository: StockCardRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    receivableRepository: ReceivableRepository,
    salesReturnRepository: SalesReturnRepository,
    stockOutRepository: StockOutRepository,
    stockRepository: StockRepository,
    salesInvoicePaymentRepository: SalesInvoicePaymentRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.receivableRepository = receivableRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.stockOutRepository = stockOutRepository;
    this.stockRepository = stockRepository;
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
            price: Number(x.price / conversion),
            sales_invoice_id: x.id!,
            sales_invoice_code_id: billResult.id!,
          };
        })
      );

      await this.stockRepository.updateMany(
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
      console.log(result);

      await this.stockRepository.updateMany(
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
    const offset = req.body.pageSize;
    const isActive = req.body.isActive as boolean;
    const isDelete = req.body.isDelete as boolean;

    const isPaid = req.body.isPaid as boolean;
    const isUnpaid = req.body.isUnpaid as boolean;

    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;

    try {
      const result = await this.salesInvoiceRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        limit: offset,
        offset: (page - 1) * offset,
        isPaid: isPaid,
        isActive: isActive,
        isUnpaid: isUnpaid,
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
      const payments =
        this.salesInvoicePaymentRepository.fetchPaymentsBySalesInvoiceCodeID(
          id
        );
      return res.status(200).send(payments);
    } catch (error) {
      console.error(`[error]: Error on fetching payments ${error}`);
      return res.status(500).send(error);
    }
  };

  search = async (req: Request, res: Response) => {
    const filterObject = req.body.filterObject;
    const keyword = translateKeyword(req.body.keyword);
    const page = translatePage(req.body.page);
    const pageSize = Number(process.env.LIMIT);

    try {
      const result = await this.salesInvoiceRepository.search(
        this.validateSearch(filterObject),
        keyword,
        page,
        pageSize
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on searching sales invoice ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
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

  private validateSearch = (filters: any) => {
    const {
      dateStart = null,
      dateEnd = null,
      customers = [],
      status = 2,
    } = filters;

    return { dateStart, dateEnd, customers, status };
  };

  /**
   * Search sales invoice data archive
   * @param req
   * @param res
   */
  static fetchArchive = (req: Request, res: Response) => {
    // const year = req.body.year;
    // const month = req.body.month;
    // if (year == null && month == null) {
    //   BillCodeModel.fetchArchiveYears()!
    //     .then((result) => {
    //       return res.status(200).send(
    //         result
    //           .map((x) => {
    //             return {
    //               year: x.year,
    //               count: parseInt(x.count.toString().replace("n", "")),
    //             };
    //           })
    //           .sort((a, b) => {
    //             return a.year - b.year;
    //           })
    //       );
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else if (year != null && month == null) {
    //   const year = req.body.year;
    //   BillCodeModel.fetchArchiveMonths(year)
    //     .then((result) => {
    //       const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    //       result.forEach((x) => {
    //         response[x.month - 1] = parseInt(
    //           x.count.toString().replace("n", "")
    //         );
    //       });
    //       return res.status(200).send(response);
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else {
    //   const mode = req.body.mode;
    //   const page = req.body.limit.page;
    //   const keyword = req.body.search.keyword;
    //   BillCodeModel.fetchArchive({
    //     year: year,
    //     month: month,
    //     mode: mode,
    //     limit: 10,
    //     offset: (page - 1) * 10,
    //     keyword: mysql_real_escape_string(keyword),
    //   })!
    //     .then((result) => {
    //       return res.status(200).send({
    //         data: result[0].map((x) => {
    //           return {
    //             id: x.id,
    //             name: x.name,
    //             date: x.date,
    //             is_delete: x.is_delete == 1,
    //             is_confirm: x.is_confirm == 1,
    //             customer_name: x.customer_name,
    //             sales: x.sales,
    //           };
    //         }),
    //         count:
    //           result[1] == null || result[1].length == 0
    //             ? 0
    //             : parseInt(result[1][0].count.toString().replace("n", "")),
    //       });
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // }
  };

  static fetchArchiveV2 = (req: Request, res: Response) => {
    // const year = req.body.year;
    // const month = req.body.month;
    // if (year == null && month == null) {
    //   BillCodeModel.fetchArchiveYearsV2()!
    //     .then((result) => {
    //       return res.status(200).send(
    //         result.map((x) => {
    //           return {
    //             year: x.year,
    //             month: x.month,
    //             count: Number(x.count.toString().replace("n", "")),
    //           };
    //         })
    //       );
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else {
    //   const keyword = req.body.keyword;
    //   const page = req.body.page ?? 1;
    //   const status = req.body.status;
    //   const paymentStatus = req.body.paymentStatus;
    //   const startDate = req.body.startDate;
    //   const endDate = req.body.endDate;
    //   BillCodeModel.fetchArchiveV2({
    //     year: Number(year),
    //     month: Number(month),
    //     mode: status,
    //     status: status,
    //     paymentStatus: paymentStatus,
    //     limit: 20,
    //     offset: (page - 1) * 20,
    //     keyword: mysql_real_escape_string(keyword ?? ""),
    //     startDate: startDate,
    //     endDate: endDate,
    //   })!
    //     .then((result) => {
    //       return res.status(200).send({
    //         data: result[0].map((x) => {
    //           return {
    //             id: x.id,
    //             name: x.name,
    //             date: x.date,
    //             is_delete: x.is_delete == 1,
    //             is_confirm: x.is_confirm == 1,
    //             customer_name: x.customer_name,
    //             sales: x.sales,
    //             is_paid: x.is_paid == 1,
    //           };
    //         }),
    //         count:
    //           result[1] == null || result[1].length == 0
    //             ? 0
    //             : parseInt(result[1][0].count.toString().replace("n", "")),
    //       });
    //     })
    //     .catch((error) => {
    //       console.error(
    //         `[error]: Error on fetching sales invoice archive ${error}`
    //       );
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // }
  };

  /**
   * Fetch bill by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.fetchByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     let subTotal = 0;
    //     for (let item of result.bill) {
    //       subTotal += Number(item.price) * Number(item.quantity);
    //     }
    //     return res.status(200).send({
    //       ...result,
    //       subTotal: subTotal,
    //       discount: Number(result.discount),
    //       delivery: Number(result.delivery),
    //       service: Number(result.service),
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetching sales invoice by ID ${error}`
    //     );
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  static fetchPaymentsByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.fetchPaymentsByID(id)
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching payments by ID ${error}`);
    //     return res.status(500).send(error);
    //   });
  };

  static fetchByOTC = (req: Request, res: Response) => {
    const otc = req.params.otc;
    const date = moment().format("YYYY-MM-DD");
    DraftBillModel.fetchByOTC({
      otc: otc,
      date: date,
    })
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          return res.status(200).send(result);
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching bill by OTC ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static deletePaymentByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // BillCodeModel.deletePaymentByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     BillCodeModel.evaluateBill(result.bill_code_id)
    //       .then(() => {
    //         return res.status(201).send(result);
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on evaluating bill value ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on deleting payment by ID ${error}`);
    //     return res.status(500).send(error);
    //   });
  };

  /**
   * Fetch bill code by ID
   * @param req
   * @param res
   */
  static fetchCodeByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id.toString());
    // BillModel.fetchByID(id)
    //   .then((result) => {
    //     if (!result) {
    //       return res.status(404).send(ErrorList["Not found"]);
    //     }
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching bill code ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };
}

export default SalesInvoiceController;
