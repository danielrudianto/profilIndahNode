import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { UMUR_CACHE_LABA_RUGI } from "../constants/cache.constant";
import { redisClient } from "../utils/redis.helper";
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

  /*
    Cache laporan keuangan.

    Redis mati bukan alasan gagal: bacanya dibungkus try, dan yang gagal
    dibaca berarti dihitung ulang seperti sebelum cache ini ada.

    Nilai yang disimpan selalu membawa `computedAt`. Angka lama yang tidak
    menyebut umurnya lebih berbahaya daripada angka lama yang menyebutnya —
    yang pertama dikira baru.
  */
  private dariCache = async (kunci: string): Promise<any | null> => {
    try {
      const isi = await redisClient.get(kunci);
      return isi ? JSON.parse(isi) : null;
    } catch {
      return null;
    }
  };

  private keCache = async (kunci: string, nilai: unknown): Promise<void> => {
    try {
      await redisClient.setEx(
        kunci,
        UMUR_CACHE_LABA_RUGI,
        JSON.stringify(nilai)
      );
    } catch {
      /* gagal menulis cache — biarkan; permintaan berikut menghitung ulang */
    }
  };

  fetchProfitLoss = async (req: Request, res: Response) => {
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month);
    const report = parseInt(req.body.report);
    /* Tombol "hitung ulang" di layar; tanpa ini pembaca yang butuh angka
       terbaru terkurung sampai cache-nya kedaluwarsa. */
    const paksa = req.body.refresh === true || req.body.refresh === "true";
    const kunci = `laporan:laba-rugi:${year}:${month}`;

    try {
      if (!paksa) {
        const tersimpan = await this.dariCache(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

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

      const hasil = {
        company: company,
        expense: expense,
        stockOut: stockOut,
        computedAt: new Date().toISOString(),
      };

      await this.keCache(kunci, hasil);
      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching profit loss report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
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
    const paksa = req.query.refresh === "true" || req.query.refresh === "1";
    const kunci = `laporan:laba-rugi-tren:${year}:${month}`;

    try {
      if (!paksa) {
        const tersimpan = await this.dariCache(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

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

      const hasil = { data: data, computedAt: new Date().toISOString() };
      await this.keCache(kunci, hasil);
      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching profit loss trend ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
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
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default FinancialReportController;
