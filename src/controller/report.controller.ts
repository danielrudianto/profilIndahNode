import { Request, Response } from "express";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import ErrorList from "../assets/error_list";
import { mongoProductModel } from "../mongo-model/mongo-product.model";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { PromotionRepository } from "../repositories/promotion.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { SalesDepositPaymentRepository } from "../repositories/sales-deposit-payment.repository";
import { PaymentMethodRepository } from "../repositories/payment-method.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductRepository } from "../repositories/product.repository";
import { CompanyRepository } from "../repositories/company.repository";
import { ExpenseRepository } from "../repositories/expense.repository";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";

interface AdministratorDashboard {
  title: string;
  compare: boolean;
  current: number;
  previous?: number;
  code: number;
}

class ReportController {
  salesInvoiceRepository: SalesInvoiceRepository;
  promotionRepository: PromotionRepository;
  goodReceiptRepository: GoodReceiptRepository;
  adjustmentCaseRepository: AdjustmentCaseRepository;
  customerRepository: CustomerRepository;
  salesReturnRepository: SalesReturnRepository;

  salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  salesDepositPaymentRepository: SalesDepositPaymentRepository;

  paymentMethodRepository: PaymentMethodRepository;

  stockInRepository: StockInRepository;
  stockOutRepository: StockOutRepository;

  productRepository: ProductRepository;
  productStockRepository: ProductStockRepository;

  companyRepository: CompanyRepository;
  expenseRepository: ExpenseRepository;
  expenseTypeRepository: ExpenseTypeRepository;
  overpaymentRepository: OverpaymentRepository;

  stockCardRepository: StockCardRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    promotionRepository: PromotionRepository,
    goodReceiptRepository: GoodReceiptRepository,
    adjustmentCaseRepository: AdjustmentCaseRepository,
    customerRepository: CustomerRepository,
    salesReturnRepository: SalesReturnRepository,

    salesInvoicePaymentRepository: SalesInvoicePaymentRepository,
    salesDepositPaymentRepository: SalesDepositPaymentRepository,

    paymentMethodRepository: PaymentMethodRepository,

    stockInRepository: StockInRepository,
    stockOutRepository: StockOutRepository,

    productRepository: ProductRepository,
    productStockRepository: ProductStockRepository,
    companyRepository: CompanyRepository,

    expenseRepository: ExpenseRepository,
    expenseTypeRepository: ExpenseTypeRepository,

    overpaymentRepository: OverpaymentRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.promotionRepository = promotionRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.adjustmentCaseRepository = adjustmentCaseRepository;
    this.customerRepository = customerRepository;
    this.salesReturnRepository = salesReturnRepository;

    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.salesDepositPaymentRepository = salesDepositPaymentRepository;

    this.paymentMethodRepository = paymentMethodRepository;

    this.stockInRepository = stockInRepository;
    this.stockOutRepository = stockOutRepository;

    this.productRepository = productRepository;
    this.productStockRepository = productStockRepository;
    this.companyRepository = companyRepository;

    this.expenseRepository = expenseRepository;
    this.expenseTypeRepository = expenseTypeRepository;

    this.overpaymentRepository = overpaymentRepository;
    this.stockCardRepository = stockCardRepository;
  }

  fetchAdministratorDashboard = (req: Request, res: Response) => {
    return res.status(200).send({
      sales: {
        current: 0,
        previous: 0,
      },
      purchase: {
        current: 0,
        previous: 0,
      },
      deposit: 0,
      promotion: 0,
      receivable: 0,
    });
  };

  fetchSalesDashboard = async (req: Request, res: Response) => {
    try {
      const date = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastMonth = new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1,
        0,
        0,
        0
      );

      const thisMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0
      );
      const endOfMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        0,
        0,
        0
      );

      const [
        currentSales,
        previousSales,
        currentMonth,
        previousMonth,
        activePromotion,
      ] = await Promise.all([
        this.salesInvoiceRepository.fetchByDateRange(date, date),
        this.salesInvoiceRepository.fetchByDateRange(yesterday, yesterday),
        this.salesInvoiceRepository.fetchByDateRange(thisMonth, endOfMonth),
        this.salesInvoiceRepository.fetchByDateRange(lastMonth, thisMonth),
        this.promotionRepository.countActive(),
      ]);

      return res.status(200).send({
        sales: {
          current: currentSales.value,
          previous: previousSales.value,
        },
        sales_month: {
          current: currentMonth.value,
          previous: previousMonth.value,
        },
        promotion: activePromotion,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching sales dashboard ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchPurchaseDashboard = async (req: Request, res: Response) => {
    try {
      const date = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastMonth = new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1,
        0,
        0,
        0
      );

      const thisMonth = new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
        0,
        0,
        0
      );
      const endOfMonth = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        0,
        0,
        0
      );

      const [
        currentPurchase,
        previousPurchase,
        currentMonth,
        previousMonth,
        activePromotion,
      ] = await Promise.all([
        this.goodReceiptRepository.fetchByDateRange(date, date),
        this.goodReceiptRepository.fetchByDateRange(yesterday, yesterday),
        this.goodReceiptRepository.fetchByDateRange(thisMonth, endOfMonth),
        this.goodReceiptRepository.fetchByDateRange(lastMonth, thisMonth),
        this.promotionRepository.countActive(),
      ]);

      return res.status(200).send({
        purchase: {
          current: currentPurchase.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
          previous: previousPurchase.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
        },
        purchase_month: {
          current: currentMonth.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
          previous: previousMonth.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
        },
        promotion: activePromotion,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching sales dashboard ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    const result = await this.salesInvoiceRepository.fetchByDateRange(
      new Date(year, month - 1, 1),
      new Date(year, month, 0)
    );

    const chart = await this.salesInvoiceRepository.fetchChart(month, year);
    const brand = await this.salesInvoiceRepository.fetchBestBrand(month, year);
    const type = await this.salesInvoiceRepository.fetchBestType(month, year);
    const sales = await this.salesInvoiceRepository.fetchBestSales(month, year);

    return res.status(200).send({
      salesInvoiceCount: result.salesInvoiceCount,
      delivery: result.delivery,
      discount: result.discount,
      service: result.service,
      total: result.value + result.delivery + result.service - result.discount,
      chart: chart,
      brand: brand,
      sales: sales,
      type: type,
    });
  };

  downloadSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    try {
      const result = await this.salesInvoiceRepository.fetchDownload(
        month,
        year
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales report ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);

    const result = await this.goodReceiptRepository.fetchByDateRange(
      new Date(year, month - 1, 1),
      new Date(year, month, 0)
    );

    const chart = await this.goodReceiptRepository.fetchChart(month, year);
    const brand = await this.goodReceiptRepository.fetchBestBrand(month, year);
    const type = await this.goodReceiptRepository.fetchBestType(month, year);
    const supplier = await this.goodReceiptRepository.fetchBestSupplier(
      month,
      year
    );

    return res.status(200).send({
      value: result.reduce((a, b) => {
        return a + b.value;
      }, 0),
      discount: result.reduce((a, b) => {
        return a + b.discount;
      }, 0),
      goodReceiptCount: result.reduce((a, b) => {
        return a + b.goodReceiptCount;
      }, 0),
      chart: chart,
      brand: brand,
      supplier: supplier,
      type: type,
    });
  };

  downloadPurchaseReport = async (req: Request, res: Response) => {
    try {
      const month = Number(req.body.month);
      const year = Number(req.body.year);

      const result = await this.goodReceiptRepository.fetchDownload(
        month,
        year
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching purchase invoice report ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchMoneyReceipt = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const paymentMethods = await this.paymentMethodRepository.fetchAll();

      const salesInvoicePayments =
        await this.salesInvoicePaymentRepository.fetchPaymentsByDate(date);

      const salesInvoiceDORPayments =
        await this.salesInvoicePaymentRepository.fetchDORPaymentsByDate(date);

      const salesDepositPayments =
        await this.salesDepositPaymentRepository.fetchPaymentsByDate(date);

      const salesDepositDORPayments =
        await this.salesDepositPaymentRepository.fetchDORPaymentsByDate(date);

      const salesReturnPayments =
        await this.salesReturnRepository.fetchPaymentsByDate(date);

      const overpayment =
        await this.overpaymentRepository.fetchReportByReceiveDate(date);

      const salesInvoicePaymentIndex = salesInvoicePayments.findIndex(
        (x) => x.payment_method_id == null
      );
      const salesDepositPaymentIndex = salesDepositPayments.findIndex(
        (x) => x.payment_method_id == null
      );
      const salesReturnPaymentIndex = salesReturnPayments.findIndex(
        (x) => x.payment_method_id == null
      );

      const overpaymentIndex = overpayment.findIndex(
        (x) => x.payment_method_id == null
      );

      const dorData: {
        sales: string | null;
        salesInvoice: number;
        salesDeposit: number;
      }[] = [];

      for (let i = 0; i < salesDepositDORPayments.length; i++) {
        const check = checkExistingSales(salesDepositDORPayments[i].sales);
        if (check == -1) {
          dorData.push({
            sales: salesDepositDORPayments[i].sales,
            salesInvoice: 0,
            salesDeposit: salesDepositDORPayments[i].value,
          });
        } else {
          dorData[check].salesDeposit += salesDepositDORPayments[i].value;
        }
      }

      for (let i = 0; i < salesInvoiceDORPayments.length; i++) {
        const check = checkExistingSales(salesInvoiceDORPayments[i].sales);
        if (check == -1) {
          dorData.push({
            sales: salesInvoiceDORPayments[i].sales,
            salesInvoice: salesInvoiceDORPayments[i].value,
            salesDeposit: 0,
          });
        } else {
          dorData[check].salesInvoice += salesInvoiceDORPayments[i].value;
        }
      }

      function checkExistingSales(sales: string | null): number {
        const index = dorData.findIndex((x) => x.sales == sales);
        return index;
      }

      return res.status(200).send([
        {
          id: null,
          name: "Cash",
          salesInvoice:
            salesInvoicePaymentIndex == -1
              ? 0
              : salesInvoicePayments[salesInvoicePaymentIndex].value,
          salesDeposit:
            salesDepositPaymentIndex == -1
              ? 0
              : salesDepositPayments[salesDepositPaymentIndex].value,
          salesReturn:
            salesReturnPaymentIndex == -1
              ? 0
              : salesReturnPayments[salesReturnPaymentIndex].value,
          overpayment:
            overpaymentIndex == -1 ? 0 : overpayment[overpaymentIndex].value,
        },
        {
          id: 0,
          name: "DOR",
          data: dorData,
        },
        ...paymentMethods.map((x) => {
          const salesInvoiceIndex = salesInvoicePayments.findIndex(
            (y) => y.payment_method_id == x.id
          );
          const salesDepositIndex = salesDepositPayments.findIndex(
            (y) => y.payment_method_id == x.id
          );
          const salesReturnIndex = salesReturnPayments.findIndex(
            (y) => y.payment_method_id == x.id
          );

          const overpaymentIndex = overpayment.findIndex(
            (y) => y.payment_method_id == x.id
          );

          return {
            id: x.id,
            name: x.name,
            salesInvoice:
              salesInvoiceIndex == -1
                ? 0
                : salesInvoicePayments[salesInvoiceIndex].value,
            salesDeposit:
              salesDepositIndex == -1
                ? 0
                : salesDepositPayments[salesDepositIndex].value,
            salesReturn:
              salesReturnIndex == -1
                ? 0
                : salesReturnPayments[salesReturnIndex].value,
            overpayment:
              overpaymentIndex == -1 ? 0 : overpayment[overpaymentIndex].value,
          };
        }),
      ]);
    } catch (error) {
      console.error(`[error]: Error on fetching money receipt ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchInventoryReport = async (req: Request, res: Response) => {
    try {
      const result = await this.stockInRepository.calculate();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching inventory report ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchOutputReport = async (req: Request, res: Response) => {
    const brand = req.body.brand as number[];
    const type = req.body.type as number[];
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;

    try {
      const result = await this.productRepository.fetchOutputReport({
        month: month,
        year: year,
        brand: brand,
        type: type,
        group: group,
      });

      const stock = await this.productStockRepository.fetchOutputReport({
        product_id: result.data.map((x) => {
          return x.id;
        }),
        month: month,
        year: year,
      });

      return res.status(200).send({
        brands: result.brands,
        types: result.types,
        data: result.data.map((x) => {
          const stockIndex = stock.findIndex((y) => y.product_id == x.id);
          return {
            ...x,
            stock: stockIndex == -1 ? 0 : stock[stockIndex].stock,
          };
        }),
      });
    } catch (error) {
      console.error(`[error]: Error on fetching output report ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchCompanyOutputReport = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const company_id = req.body.company_id;

      const result = await this.stockOutRepository.fetchCompanyOutputReport({
        date: date,
        companyID: company_id,
      });

      const goodReceipt = await this.goodReceiptRepository.fetchCompanyReport({
        date: date,
        companyID: company_id,
      });

      const adjustmentCase =
        await this.adjustmentCaseRepository.fetchCompanyReport({
          date: date,
          companyID: company_id,
        });

      return res.status(200).send({
        output: result,
        input: [...goodReceipt, ...adjustmentCase],
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching company output report ${error}`
      );
      return res.status(500).send(error);
    }
  };

  /**
   * Fetch dashboard purchase items
   */
  static fetchPurchaseDashboardV2 = (req: Request, res: Response) => {
    Promise.all([
      PurchaseInvoiceModel.fetchRecentPurchase(),
      PurchaseInvoiceModel.fetchOlderPurchase(),
      // PromotionModel.countActive(),
    ])
      .then(
        ([
          [purchaseCurrentValue, purchasePreviousValue],
          [purchaseMonthCurrentValue, purchaseMonthPreviousValue],
          // promotionCount,
        ]) => {
          return res.status(200).send({
            purchase: {
              current:
                purchaseCurrentValue == null
                  ? 0
                  : purchaseCurrentValue[0].value == null
                  ? 0
                  : Number(purchaseCurrentValue[0].value),
              previous:
                purchasePreviousValue == null
                  ? 0
                  : purchasePreviousValue[0].value == null
                  ? 0
                  : Number(purchasePreviousValue[0].value),
            },
            purchase_month: {
              current:
                purchaseMonthCurrentValue == null
                  ? 0
                  : purchaseMonthCurrentValue[0].value == null
                  ? 0
                  : Number(purchaseMonthCurrentValue[0].value),
              previous:
                purchaseMonthPreviousValue == null
                  ? 0
                  : purchaseMonthPreviousValue[0].value == null
                  ? 0
                  : Number(purchaseMonthPreviousValue[0].value),
            },
            // promotion: promotionCount,
          });
        }
      )
      .catch((error) => {
        console.error(`[error]: Error on fetching purchase report ${error}`);
        return res.status(500).send(error);
      });
  };
  /**
   * Download purchase report
   * This report will then be converted to PDF or Excel
   * Defined by user, rendered by client-side application
   * @param req
   * @param res
   */
  static downloadPurchaseReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;

    // PurchaseInvoiceModel.fetchReport({
    //   month: month,
    //   year: year,
    // })
    //   .then(([goodReceiptResult, goodReceiptItemsResult]) => {
    //     return res.status(200).send({
    //       document: goodReceiptResult,
    //       items: goodReceiptItemsResult,
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching purchase report ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  /**
   * Fetch sales report
   * Can be fetched by plain, customer, type, brand, package
   * @param req
   * @param res
   */
  static fetchSalesReport = (req: Request, res: Response) => {
    const month = req.body.month;
    const year = req.body.year;
    const mode = req.body.mode;

    // BillCodeModel.calculateTotalSales(month, year, mode)!
    //   .then((result) => {
    //     switch (mode) {
    //       case "plain":
    //         const date = new Date(year, month, 0).getDate();
    //         const sales_dates = new Array(date).fill(0);
    //         for (let sales of result[0]) {
    //           sales_dates[sales.day - 1] =
    //             Number(sales.value) - Number(sales.discount);
    //         }
    //         return res.status(200).send({
    //           sales: sales_dates,
    //           sales_detail: (result[1] as any[])
    //             .map((x) => {
    //               return {
    //                 name: x.customer_name,
    //                 value:
    //                   Number(x.value) -
    //                   Number(x.discount) +
    //                   Number(x.delivery) +
    //                   Number(x.service),
    //               };
    //             })
    //             .sort((a, b) => {
    //               return b.value - a.value;
    //             }),
    //         });
    //       case "customer":
    //         return res.status(200).send({
    //           sales_detail: result
    //             .map((x) => {
    //               return {
    //                 name: x.customer_name,
    //                 value: x.value - x.discount,
    //               };
    //             })
    //             .sort((a, b) => {
    //               return b.value - a.value;
    //             }),
    //         });
    //       case "type":
    //         return res.status(200).send({
    //           sales_detail: result
    //             .map((x) => {
    //               return {
    //                 name: x.item_type_name,
    //                 value: x.value,
    //               };
    //             })
    //             .sort((a, b) => {
    //               return b.value - a.value;
    //             }),
    //         });
    //         break;
    //       case "brand":
    //         return res.status(200).send({
    //           sales_detail: result
    //             .map((x) => {
    //               return {
    //                 name: x.item_brand_name,
    //                 value: x.value,
    //               };
    //             })
    //             .sort((a, b) => {
    //               return b.value - a.value;
    //             }),
    //         });
    //       case "package":
    //         return res.status(200).send({
    //           sales_detail: result.map((x) => {
    //             return {
    //               name: x.name,
    //               description: x.description,
    //               value: x.value,
    //             };
    //           }),
    //         });
    //       case "download":
    //         return res.status(200).send(
    //           (result as any[]).map((x) => {
    //             return {
    //               ...x,
    //               value: Number(x.value),
    //               discount: Number(x.discount),
    //               delivery: Number(x.delivery),
    //               service: Number(x.service),
    //             };
    //           })
    //         );
    //       case "sales":
    //         return res.status(200).send({
    //           sales_detail: result
    //             .map((x) => {
    //               return {
    //                 name: x.sales_name,
    //                 value: Number(x.value),
    //                 discount: Number(x.discount),
    //                 delivery: Number(x.delivery),
    //                 service: Number(x.service),
    //                 count: Number(x.count.toString()),
    //               };
    //             })
    //             .sort((a, b) => {
    //               return b.value - a.value;
    //             }),
    //         });
    //       case "V2":
    //         const brandMap: any = {};
    //         const typeMap: any = {};
    //         const customerMap: any = {};
    //         const salesMap: any = {};
    //         const dateMap: any = {};
    //         let total = 0;
    //         const codeID: number[] = [];

    //         SalesReturnModel.fetchValueByMonthYear(month, year)
    //           .then((returns) => {
    //             result.forEach((item) => {
    //               total += Number(item.value);
    //               // Aggregate by brand
    //               if (!brandMap[item.item_brand_id]) {
    //                 brandMap[item.item_brand_id] = {
    //                   name: item.item_brand_name,
    //                   item_brand_id: item.item_brand_id,
    //                   value: 0,
    //                 };
    //               }
    //               brandMap[item.item_brand_id].value += Number(item.value);

    //               // Aggregate by type
    //               if (!typeMap[item.item_type_id]) {
    //                 typeMap[item.item_type_id] = {
    //                   name: item.item_type_name,
    //                   item_type_id: item.item_type_id,
    //                   value: 0,
    //                 };
    //               }
    //               typeMap[item.item_type_id].value += Number(item.value);

    //               // Aggregate by customer
    //               if (!customerMap[item.customer_id]) {
    //                 customerMap[item.customer_id] = {
    //                   name: item.customer_name,
    //                   customer_id: item.customer_id,
    //                   value: 0,
    //                 };
    //               }
    //               customerMap[item.customer_id].value += Number(item.value);

    //               // Aggregate by sales
    //               if (!salesMap[item.sales]) {
    //                 salesMap[item.sales] = {
    //                   name: item.sales,
    //                   value: 0,
    //                 };
    //               }
    //               salesMap[item.sales].value += Number(item.value);

    //               // Aggregate by date
    //               if (!dateMap[item.day]) {
    //                 dateMap[item.day] = {
    //                   date: item.day,
    //                   delivery: 0,
    //                   service: 0,
    //                   discount: 0,
    //                   value: 0,
    //                 };
    //               }

    //               dateMap[item.day].value += Number(item.value);

    //               if (!codeID.includes(item.id)) {
    //                 dateMap[item.day].delivery += Number(item.delivery);
    //                 dateMap[item.day].service += Number(item.service);
    //                 dateMap[item.day].discount += Number(item.discount);
    //               }
    //             });

    //             const brands = Object.values(brandMap);
    //             const types = Object.values(typeMap);
    //             const customers = Object.values(customerMap);
    //             const sales = Object.values(salesMap);
    //             const dates = Object.values(dateMap);
    //             const delivery = dates.reduce((a, b: any) => a + b.delivery, 0);
    //             const service = dates.reduce((a, b: any) => a + b.service, 0);
    //             const discount = dates.reduce((a, b: any) => a + b.discount, 0);

    //             return res.status(200).send({
    //               brand: brands.sort((a: any, b: any) => b.value - a.value),
    //               type: types.sort((a: any, b: any) => b.value - a.value),
    //               customer: customers.sort(
    //                 (a: any, b: any) => b.value - a.value
    //               ),
    //               sales: sales,
    //               delivery: delivery,
    //               discount: discount,
    //               service: service,
    //               date: dates.map((x: any) => {
    //                 const date = Number(x.date.toString().replace("n", ""));
    //                 return {
    //                   date: date,
    //                   value: Number(x.value),
    //                   delivery: Number(x.delivery),
    //                   discount: Number(x.discount),
    //                   service: Number(x.service),
    //                   count: new Set(
    //                     result.filter((z) => z.day == date).map((z) => z.id)
    //                   ).size,
    //                 };
    //               }),
    //               count: result.length,
    //               total: total,
    //               // Transactions if the distinct bill_code_id number
    //               transactions: new Set(result.map((x) => x.id)).size,
    //               returns: new Set(returns.map((x) => x.bill_code_id)).size,
    //               returned_value: returns.reduce(
    //                 (a, b) => a + Number(b.value),
    //                 0
    //               ),
    //             });
    //           })
    //           .catch((error) => {
    //             console.error(
    //               `[error]: Error on fetching sales report ${error}`
    //             );
    //             return res.status(500).send(ErrorList["Internal server error"]);
    //           });
    //     }
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on fetching sales report ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  /**
   * Fetch current inventory value
   * @param req
   * @param res
   */
  // static fetchInventoryReport = (req: Request, res: Response) => {
  //   mongoStockInModel
  //     .aggregate([
  //       {
  //         $group: {
  //           _id: "$companyID",
  //           value: {
  //             $sum: {
  //               $multiply: ["$price", "$residue"],
  //             },
  //           },
  //         },
  //       },
  //     ])
  //     .then(async (result) => {
  //       // const companies = await CompanyModel.fetchAll();
  //       const companies: any[] = [];
  //       return res.status(200).send({
  //         value: result.reduce((a, b) => {
  //           return a + b.value;
  //         }, 0),
  //         company: companies.map((x) => {
  //           const index = result.findIndex((y) => {
  //             return y._id == x.id;
  //           });
  //           return {
  //             name: x.name,
  //             value: index == -1 ? 0 : result[index].value,
  //           };
  //         }),
  //       });
  //     })
  //     .catch((error) => {
  //       console.error(`[error]: Error on fetching inventory report. ${error}`);
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };

  /**
   * Download list of items
   * In inventory report to acknowledge more about the items
   * @param req
   * @param res
   */
  // static downloadInventoryReport = (req: Request, res: Response) => {
  //   mongoStockInModel
  //     .aggregate([
  //       // Match where residue > 0
  //       {
  //         $match: {
  //           $expr: {
  //             $gt: ["$residue", 0],
  //           },
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: "$itemID",
  //           value: {
  //             $sum: {
  //               $multiply: ["$price", "$residue"],
  //             },
  //           },
  //           quantity: {
  //             $sum: "$residue",
  //           },
  //         },
  //       },
  //     ])
  //     .then(async (result) => {
  //       // const items = await ItemModel.fetchByIDs(
  //       //   result.map((x) => {
  //       //     return x._id;
  //       //   })
  //       // );
  //       // return res.status(200).send(
  //       //   result
  //       //     .map((x) => {
  //       //       const itemIndex = items.findIndex((y) => y.id == x._id);
  //       //       if (itemIndex != -1) {
  //       //         return {
  //       //           reference: items[itemIndex].reference,
  //       //           description: items[itemIndex].description,
  //       //           quantity: x.quantity,
  //       //           unit: items[itemIndex].unit,
  //       //           value: x.quantity == 0 ? 0 : x.value / x.quantity,
  //       //           brand: items[itemIndex].item_brand_name,
  //       //           type: items[itemIndex].item_type_name,
  //       //         };
  //       //       }
  //       //     })
  //       //     .filter((x) => x != undefined)
  //       //     .sort((a, b) => {
  //       //       return a!.reference.localeCompare(b!.reference);
  //       //     })
  //       // );
  //     })
  //     .catch((error) => {
  //       console.error(
  //         `[error]: Error on downloading inventory report ${error}`
  //       );
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };

  /**
   * Fetch profit and loss report data
   * @param req
   * @param res
   * @returns
   */
  static fetchPLStats = async (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const report = parseInt(req.params.report);

    // Promise.all([
    //   BillCodeModel.fetchSum(month, year),
    //   PurchaseInvoiceModel.calculateTotalPurchase(
    //     month,
    //     year,
    //     CalculatePurchaseMode.Sum,
    //     null
    //   ),
    //   CompanyModel.fetch("", 0, 0, fetchMode.All),
    //   ExpenseModel.fetchSum(month, year),
    //   mongoStockOutModel.aggregate([
    //     {
    //       $lookup: {
    //         from: "stock-ins",
    //         localField: "stockInID",
    //         foreignField: "_id",
    //         as: "stockIn",
    //       },
    //     },
    //     {
    //       $unwind: {
    //         path: "$stockIn",
    //       },
    //     },
    //     {
    //       $project: {
    //         companyID: "$stockIn.companyID",
    //         stockIn: "$stockIn",
    //         price: "$price",
    //         month: { $month: "$date" },
    //         year: { $year: "$date" },
    //         quantity: "$quantity",
    //         value: "$value",
    //         billID: "$billID",
    //       },
    //     },
    //     month == 0
    //       ? {
    //           $match: {
    //             year: year,
    //             billID: {
    //               $ne: null,
    //             },
    //           },
    //         }
    //       : {
    //           $match: {
    //             month: month,
    //             year: year,
    //             billID: {
    //               $ne: null,
    //             },
    //           },
    //         },
    //     {
    //       $group: {
    //         _id: "$companyID",
    //         totalStockoutValue: {
    //           $sum: { $multiply: ["$quantity", "$value"] },
    //         },
    //         totalCOGS: {
    //           $sum: { $multiply: ["$quantity", "$stockIn.price"] },
    //         },
    //       },
    //     },
    //   ]),
    //   mongoOverflowModel.aggregate([
    //     {
    //       $project: {
    //         month: { $month: "$date" },
    //         year: { $year: "$date" },
    //         value: "$value",
    //         quantity: "$quantity",
    //       },
    //     },
    //     month == 0
    //       ? {
    //           $match: {
    //             year: year,
    //           },
    //         }
    //       : {
    //           $match: {
    //             month: month,
    //             year: year,
    //           },
    //         },
    //     {
    //       $group: {
    //         _id: null,
    //         totalValue: {
    //           $sum: {
    //             $multiply: ["$value", "$quantity"],
    //           },
    //         },
    //       },
    //     },
    //   ]),
    // ]).then(
    //   ([
    //     bills,
    //     purchases,
    //     companies,
    //     [expenses, expenseType],
    //     cogs,
    //     overflows,
    //   ]) => {
    //     if (report == 0) {
    //       return res.status(200).send({
    //         companies: companies,
    //         bills:
    //           bills.length == 0
    //             ? {
    //                 delivery: 0,
    //                 discount: 0,
    //                 value: 0,
    //                 service: 0,
    //               }
    //             : {
    //                 delivery: bills[0].delivery,
    //                 discount: bills[0].discount,
    //                 value: bills[0].value,
    //                 service: bills[0].service,
    //               },
    //         purchases:
    //           purchases == undefined
    //             ? []
    //             : purchases.map((x) => {
    //                 return {
    //                   value: x.value,
    //                   discount: x.discount,
    //                   name: x.name,
    //                   company_id: x.company_id,
    //                 };
    //               }),
    //         expenses: expenses,
    //         expenseType: expenseType
    //           .filter((x) => x.parent_id == null)
    //           .map((x) => {
    //             return {
    //               name: x.name,
    //               id: x.id,
    //               children: expenseType
    //                 .filter((y) => y.parent_id == x.id)
    //                 .map((y) => {
    //                   return {
    //                     name: y.name,
    //                     id: y.id,
    //                   };
    //                 }),
    //             };
    //           }),
    //         cogs: cogs,
    //         overflows: overflows.length == 0 ? 0 : overflows[0].totalValue,
    //       });
    //     } else {
    //       Promise.all([
    //         BillCodeModel.fetchAppendix(month, year),
    //         PurchaseInvoiceModel.fetchAppendix(month, year),
    //         ExpenseModel.fetchAppendix(month, year),
    //       ]).then(([billAppendix, purchaseAppendix, expenseAppendix]) => {
    //         return res.status(200).send({
    //           companies: companies,
    //           bills:
    //             bills.length == 0
    //               ? {
    //                   delivery: 0,
    //                   discount: 0,
    //                   value: 0,
    //                   service: 0,
    //                 }
    //               : {
    //                   delivery: bills[0].delivery,
    //                   discount: bills[0].discount,
    //                   value: bills[0].value,
    //                   service: bills[0].service,
    //                 },
    //           purchases:
    //             purchases == undefined
    //               ? []
    //               : purchases.map((x) => {
    //                   return {
    //                     value: x.value,
    //                     discount: x.discount,
    //                     name: x.name,
    //                     company_id: x.company_id,
    //                   };
    //                 }),
    //           expenses: expenses,
    //           expenseType: expenseType
    //             .filter((x) => x.parent_id == null)
    //             .map((x) => {
    //               return {
    //                 name: x.name,
    //                 id: x.id,
    //                 children: expenseType
    //                   .filter((y) => y.parent_id == x.id)
    //                   .map((y) => {
    //                     return {
    //                       name: y.name,
    //                       id: y.id,
    //                     };
    //                   }),
    //               };
    //             }),
    //           cogs: cogs,
    //           appendix: {
    //             bills: billAppendix,
    //             purchases: purchaseAppendix,
    //             expenses: expenseAppendix,
    //           },
    //         });
    //       });
    //     }
    //   }
    // );
  };

  fetchProfitLoss = async (req: Request, res: Response) => {
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month);
    const report = parseInt(req.body.report);

    try {
      const [sales, purchase, company, expense, stockOut] = await Promise.all([
        this.salesInvoiceRepository.fetchByDateRange(
          month == 0 ? new Date(year, 0, 1) : new Date(year, month - 1, 1),
          month == 0 ? new Date(year + 1, 0, 0) : new Date(year, month, 0)
        ),
        this.goodReceiptRepository.fetchByDateRange(
          month == 0 ? new Date(year, 0, 1) : new Date(year, month - 1, 1),
          month == 0 ? new Date(year + 1, 0, 0) : new Date(year, month, 0)
        ),
        this.companyRepository.fetchAll(),
        this.expenseRepository.fetchReport(month, year),
        this.stockOutRepository.calculate(month, year),
      ]);

      return res.status(200).send({
        sales: sales,
        purchase: purchase,
        company: company,
        expense: expense,
        stockOut: stockOut,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching profit loss report ${error}`);
      return res.status(500).send(error);
    }
  };

  /**
   * Fetch sales item report
   * Get output report (item quantity)
   * @param req
   * @param res
   */
  static fetchOutputReport = (req: Request, res: Response) => {
    const brand = req.body.brand as number[];
    const type = req.body.type as number[];
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;

    // ItemModel.fetchValueByBrandType(brand, type, month, year).then(
    //   async ([result, brands, types]) => {
    //     mongoStockCardModel
    //       .aggregate([
    //         {
    //           $match: {
    //             itemID: {
    //               $in: result.map((x) => x.id),
    //             },
    //             date: {
    //               $lt: new Date(year, month - 1, 1),
    //             },
    //           },
    //         },
    //         {
    //           $group: {
    //             _id: "$itemID",
    //             currentStock: {
    //               $sum: "$quantity",
    //             },
    //           },
    //         },
    //       ])
    //       .then((stocks) => {
    //         switch (group) {
    //           case "brand":
    //             // const brandResponse = brands.map((x) => {
    //             //   return {
    //             //     id: x.id,
    //             //     name: x.name,
    //             //     items: result
    //             //       .filter((y) => y.item_brand_id == x.id)
    //             //       .map((y) => {
    //             //         const stockIndex = stocks.findIndex(
    //             //           (z) => z._id == y.id
    //             //         );

    //             //         return {
    //             //           id: y.id,
    //             //           reference: y.reference,
    //             //           description: y.description,
    //             //           unit: y.unit,
    //             //           brand: y.item_brand_name,
    //             //           type: y.item_type_name,
    //             //           adjustment_input: Number(y.adjustmentQuantityPlus),
    //             //           adjustment_output: Number(y.adjustmentQuantityMinus),
    //             //           good_receipt_input: Number(y.goodReceiptQuantity),
    //             //           bill_output: Number(y.billQuantity),
    //             //           sales_return: Number(y.salesReturnQuantity),
    //             //           initialStock:
    //             //             stockIndex == -1
    //             //               ? 0
    //             //               : stocks[stockIndex].currentStock,
    //             //         };
    //             //       }),
    //             //   };
    //             // });

    //             return res.status(200).send(brandResponse);
    //           case "type":
    //             // const typeResponse = types.map((x) => {
    //             //   return {
    //             //     id: x.id,
    //             //     name: x.name,
    //             //     items: result
    //             //       .filter((y) => y.item_type_id == x.id)
    //             //       .map((y) => {
    //             //         const stockIndex = stocks.findIndex(
    //             //           (z) => z._id == y.id
    //             //         );

    //             //         return {
    //             //           id: y.id,
    //             //           reference: y.reference,
    //             //           description: y.description,
    //             //           unit: y.unit,
    //             //           brand: y.item_brand_name,
    //             //           type: y.item_type_name,
    //             //           adjustment_input: Number(y.adjustmentQuantityPlus),
    //             //           adjustment_output: Number(y.adjustmentQuantityMinus),
    //             //           good_receipt_input: Number(y.goodReceiptQuantity),
    //             //           bill_output: Number(y.billQuantity),
    //             //           sales_return: Number(y.salesReturnQuantity),
    //             //           initialStock:
    //             //             stockIndex == -1
    //             //               ? 0
    //             //               : stocks[stockIndex].currentStock,
    //             //         };
    //             //       }),
    //             //   };
    //             // });

    //             return res.status(200).send(typeResponse);
    //         }
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on fetching stock ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   }
    // );
  };

  fetchDailySalesReport = async (req: Request, res: Response) => {
    const day = req.body.day;
    const month = req.body.month;
    const year = req.body.year;
    const type = req.body.type as number[];

    try {
      const result = await this.stockOutRepository.fetchDailySalesReport({
        date: new Date(year, month - 1, day),
        type: type,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching daily sales report ${error}`);
      return res.status(500).send(error);
    }
  };

  static fetchSalesItemDailyReport = (req: Request, res: Response) => {
    const day = req.body.day;
    const month = req.body.month;
    const year = req.body.year;
    const type = req.body.type as number[];

    // ItemModel.fetchValueByBrandTypeDaily(type, day, month, year).then(
    //   async ([result, types]) => {
    //     mongoStockCardModel
    //       .aggregate([
    //         {
    //           $match: {
    //             itemID: {
    //               $in: result.map((x) => x.id),
    //             },
    //             date: {
    //               $lt: new Date(year, month - 1, day),
    //             },
    //           },
    //         },
    //         {
    //           $group: {
    //             _id: "$itemID",
    //             currentStock: {
    //               $sum: "$quantity",
    //             },
    //           },
    //         },
    //       ])
    //       .then((stocks) => {
    //         // const typeResponse = types.map((x) => {
    //         //   return {
    //         //     id: x.id,
    //         //     name: x.name,
    //         //     items: result
    //         //       .filter((y) => y.item_type_id == x.id)
    //         //       .map((y) => {
    //         //         const stockIndex = stocks.findIndex((z) => z._id == y.id);

    //         //         return {
    //         //           id: y.id,
    //         //           reference: y.reference,
    //         //           description: y.description,
    //         //           unit: y.unit,
    //         //           brand: y.item_brand_name,
    //         //           type: y.item_type_name,
    //         //           adjustment_input: Number(y.adjustmentQuantityPlus),
    //         //           adjustment_output: Number(y.adjustmentQuantityMinus),
    //         //           good_receipt_input: Number(y.goodReceiptQuantity),
    //         //           bill_output: Number(y.billQuantity),
    //         //           sales_return: Number(y.salesReturnQuantity),
    //         //           initialStock:
    //         //             stockIndex == -1 ? 0 : stocks[stockIndex].currentStock,
    //         //         };
    //         //       }),
    //         //   };
    //         // });

    //         return res.status(200).send(typeResponse);
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on fetching stock ${error}`);
    //         return res.status(500).send(ErrorList["Internal server error"]);
    //       });
    //   }
    // );
  };

  static fetchProductStockProblem = (req: Request, res: Response) => {
    Promise.all([
      mongoProductModel
        .find({
          currentStock: {
            $lt: 0,
          },
        })
        .sort({ reference: 1 }),
    ])
      .then((result) => {
        return res.status(200).send(
          result[0].map((x) => {
            return {
              id: x.itemID,
              reference: x.reference,
              description: x.description,
              stock: x.currentStock,
              unit: x.unit,
            };
          })
        );
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching problematic stock data: ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default ReportController;
