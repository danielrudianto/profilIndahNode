import { Request, Response } from "express";
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
  private companyRepository: CompanyRepository;
  private expenseRepository: ExpenseRepository;
  private stockOutRepository: StockOutRepository;

  constructor(
    companyRepository: CompanyRepository,
    expenseRepository: ExpenseRepository,
    stockOutRepository: StockOutRepository
  ) {
    this.companyRepository = companyRepository;
    this.expenseRepository = expenseRepository;
    this.stockOutRepository = stockOutRepository;
  }

  fetchProfitLoss = async (req: Request, res: Response) => {
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month);
    const report = parseInt(req.body.report);

    try {
      /*
        Dulu ikut mengangkut larik sales dan purchase (fetchByDateRange
        sebulan penuh) — halaman keuangan baru tidak pernah membacanya,
        jadi dua agregat itu dihitung hanya untuk dibuang browser.
      */
      const [company, expense, stockOut] = await Promise.all([
        this.companyRepository.fetchAll(),
        this.expenseRepository.fetchReport(month, year),
        this.stockOutRepository.calculate(month, year),
      ]);

      return res.status(200).send({
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
   * Tren 12 bulan untuk grafik laporan keuangan, berakhir pada bulan yang
   * diminta (month 0 — tampilan tahunan — dibaca Desember, sehingga
   * jendelanya persis Januari–Desember tahun itu). Hanya agregat per
   * bulan: pendapatan, HPP, dan beban; bulan kosong diisi nol di sini
   * supaya frontend selalu menerima 12 baris berurutan.
   */
  fetchProfitLossTrend = async (req: Request, res: Response) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month) || 12;

    try {
      const mulai = new Date(year, month - 12, 1);
      const sebelum = new Date(year, month, 1);

      const [stok, beban] = await Promise.all([
        this.stockOutRepository.trendBulanan(mulai, sebelum),
        this.expenseRepository.trendBulanan(mulai, sebelum),
      ]);

      const data = [];
      for (let mundur = 11; mundur >= 0; mundur--) {
        const d = new Date(year, month - 1 - mundur, 1);
        const tahunBaris = d.getFullYear();
        const bulanBaris = d.getMonth() + 1;
        const s = stok.find(
          (x) => x.year === tahunBaris && x.month === bulanBaris
        );
        const b = beban.find(
          (x) => x.year === tahunBaris && x.month === bulanBaris
        );
        data.push({
          year: tahunBaris,
          month: bulanBaris,
          sales: s?.sales ?? 0,
          hpp: s?.hpp ?? 0,
          expense: b?.value ?? 0,
        });
      }

      return res.status(200).send({ data: data });
    } catch (error) {
      console.error(`[error]: Error on fetching profit loss trend ${error}`);
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
