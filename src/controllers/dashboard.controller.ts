import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { DashboardRepository } from "../repositories/dashboard.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { PromotionRepository } from "../repositories/promotion.repository";
import { dariCacheLaporan, keCacheLaporan } from "../utils/report-cache.helper";
import { UMUR_CACHE_LENCANA } from "../constants/cache.constant";

/**
 * Ringkasan angka untuk halaman dashboard.
 *
 * `fetch` melayani dashboard administrator (layar 9c) dalam satu balasan
 * lewat DashboardRepository. Dua handler lain adalah dashboard peran
 * sales dan purchasing yang masih memakai repository domain lama.
 */
export class DashboardController {
  private dashboardRepository: DashboardRepository;
  private salesInvoiceRepository: SalesInvoiceRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private promotionRepository: PromotionRepository;

  constructor(
    dashboardRepository: DashboardRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    goodReceiptRepository: GoodReceiptRepository,
    promotionRepository: PromotionRepository
  ) {
    this.dashboardRepository = dashboardRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.promotionRepository = promotionRepository;
  }

  fetch = async (req: Request, res: Response) => {
    // "Hari ini" milik pengguna, bukan milik server: frontend mengirim
    // tanggalnya. Tanpa parameter, jatuh ke tanggal server.
    const hariIni = req.query.date
      ? new Date(String(req.query.date))
      : new Date();
    const mingguLalu = new Date(hariIni);
    mingguLalu.setDate(mingguLalu.getDate() - 6);

    try {
      const result = await this.dashboardRepository.ringkasan(
        hariIni,
        mingguLalu
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching dashboard ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Lencana menu — berapa pekerjaan yang masih menunggu.
   *
   * Terbuka untuk semua peran yang sudah masuk, dan itu disengaja: menu di
   * sisi kiri sudah disaring peran, jadi lencana hanya terlihat pada item
   * yang memang boleh dibuka orang itu. Menyaringnya dua kali di sini hanya
   * menambah tempat yang bisa tidak sepakat.
   */
  fetchBadges = async (_req: Request, res: Response) => {
    try {
      /*
        Disimpan TIGA PULUH DETIK, dan itu yang membuat lencana ini murah.

        Tanpa cache, ongkosnya berlipat mengikuti jumlah orang yang membuka
        aplikasi: sepuluh staf berarti sepuluh kali hitung per menit untuk
        empat angka yang sama persis. Dengan cache bersama, ongkosnya tetap
        dua kali hitung per menit berapa pun jumlah penggunanya.

        Tiga puluh detik dipilih karena lencana menjawab "ada yang menunggu",
        bukan "ada yang menunggu detik ini". Setengah menit basi tidak
        mengubah satu pun keputusan orang — sementara memindai enam ribu
        barang tiap menit per pengguna sangat mengubah beban servernya.
      */
      const kunci = "lencana:menu";
      const tersimpan = await dariCacheLaporan(kunci);
      if (tersimpan) {
        return res.status(200).send(tersimpan);
      }

      const hasil = await this.dashboardRepository.fetchBadgeCounts();
      await keCacheLaporan(kunci, hasil, UMUR_CACHE_LENCANA);
      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching badge counts ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
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
      return res.status(500).send(ErrorList["Internal server error"]);
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
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default DashboardController;
