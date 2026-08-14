import { Request, Response } from "express";
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
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";

interface AdministratorDashboard {
  title: string;
  compare: boolean;
  current: number;
  previous?: number;
  code: number;
}

class ReportController {
  salesInvoiceRepository: SalesInvoiceRepository;
  salesDepositRepository: SalesDepositRepository;

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
    salesDepositRepository: SalesDepositRepository,
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
    this.salesDepositRepository = salesDepositRepository;
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

  fetchAdministratorDashboard = async (req: Request, res: Response) => {
    try {
      const date = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [
        currentSales,
        previousSales,
        currentPurchase,
        previousPurchase,
        activePromotion,
        deposit,
      ] = await Promise.all([
        this.salesInvoiceRepository.fetchByDateRange(date, date),
        this.salesInvoiceRepository.fetchByDateRange(yesterday, yesterday),
        this.goodReceiptRepository.fetchByDateRange(date, date),
        this.goodReceiptRepository.fetchByDateRange(yesterday, yesterday),
        this.promotionRepository.countActive(),
        this.salesDepositRepository.countPending(),
      ]);

      return res.status(200).send({
        sales: {
          current: currentSales.value,
          previous: previousSales.value,
        },
        purchase: {
          current: currentPurchase.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
          previous: previousPurchase.reduce((a, b) => {
            return a + b.value - b.discount;
          }, 0),
        },
        deposit: deposit,
        promotion: activePromotion,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching sales dashboard ${error}`);
      return res.status(500).send(error);
    }
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

  fetchBrandSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.salesInvoiceRepository.fetchBrandSales({
        month: month,
        year: year,
      });

      return res.status(200).send({
        data: result,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching brand report ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchTypeSalesreport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.salesInvoiceRepository.fetchTypeSales({
        month: month,
        year: year,
      });

      return res.status(200).send({
        data: result,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching type report ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchSalesSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.salesInvoiceRepository.fetchSalesSales({
        month: month,
        year: year,
      });

      return res.status(200).send({
        data: result,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching type report ${error}`);
      return res.status(500).send(error);
    }
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

      const overpaymentReturn =
        await this.overpaymentRepository.fetchReportByReturnDate(date);

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

      const overpaymentReturnIndex = overpaymentReturn.findIndex(
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
            (overpaymentIndex == -1 ? 0 : overpayment[overpaymentIndex].value) -
            (overpaymentReturnIndex == -1
              ? 0
              : overpaymentReturn[overpaymentReturnIndex].value),
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

          const overpaymentReturnIndex = overpaymentReturn.findIndex(
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
              (overpaymentIndex == -1
                ? 0
                : overpayment[overpaymentIndex].value) -
              (overpaymentReturnIndex == -1
                ? 0
                : overpaymentReturn[overpaymentReturnIndex].value),
          };
        }),
      ]);
    } catch (error) {
      console.error(`[error]: Error on fetching money receipt ${error}`);
      return res.status(500).send(error);
    }
  };

  downloadMoneyReceipt = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const payments = await this.salesInvoicePaymentRepository.downloadReport(
        date
      );
      return res.status(200).send({
        data: payments,
      });
    } catch (error) {
      console.error(
        `[error]: Error on downloading money receipt data ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchDorMoneyReceipt = async (req: Request, res: Response) => {
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    const salesInvoiceDORPayments =
      await this.salesInvoicePaymentRepository.fetchDORPaymentsByDateRange(
        startDate,
        endDate
      );

    const salesDepositDORPayments =
      await this.salesDepositPaymentRepository.fetchDORPaymentsByDateRange(
        startDate,
        endDate
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

    return res.status(200).send({
      id: 0,
      name: "DOR",
      data: dorData,
    });
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
}

export default ReportController;
