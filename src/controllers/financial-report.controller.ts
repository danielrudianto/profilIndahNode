import { Request, Response } from "express";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { CompanyRepository } from "../repositories/company.repository";
import { ExpenseRepository } from "../repositories/expense.repository";

/**
 * Laporan laba rugi dan penjualan harian.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class FinancialReportController {
  private salesInvoiceRepository: SalesInvoiceRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private companyRepository: CompanyRepository;
  private expenseRepository: ExpenseRepository;
  private stockOutRepository: StockOutRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    goodReceiptRepository: GoodReceiptRepository,
    companyRepository: CompanyRepository,
    expenseRepository: ExpenseRepository,
    stockOutRepository: StockOutRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.companyRepository = companyRepository;
    this.expenseRepository = expenseRepository;
    this.stockOutRepository = stockOutRepository;
  }

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

export default FinancialReportController;
