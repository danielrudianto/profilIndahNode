import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import {
  dariCacheLaporan,
  keCacheLaporan,
  mintaHitungUlang,
  umurCacheLaporan,
} from "../utils/report-cache.helper";

/**
 * Laporan penjualan beserta unduhannya.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class SalesReportController {
  private salesInvoiceRepository: SalesInvoiceRepository;
  private salesReturnRepository: SalesReturnRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    salesReturnRepository: SalesReturnRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.salesReturnRepository = salesReturnRepository;
  }

  fetchSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    /*
      Yang paling mahal dari seluruh halaman: tujuh agregat sekaligus. Ia yang
      paling pantas disimpan, dan bulan lampau tidak akan pernah berubah.
    */
    const kunci = `laporan:penjualan-utama:${year}:${month}`;

    /*
      Ketujuh agregat saling bebas — dijalankan BERBARENGAN, bukan
      berbaris. Berurutan, waktu halamannya adalah jumlah semua query;
      berbarengan, ia hanya selambat query terlambatnya.

      Kartu retur dan pelanggan di berkas desain 9a. Bentuk lama halaman
      membaca returned_value/returns yang tidak pernah dikirim siapa pun.
    */
    if (!mintaHitungUlang(req.body.refresh)) {
      const tersimpan = await dariCacheLaporan(kunci);
      if (tersimpan) {
        return res.status(200).send(tersimpan);
      }
    }

    const [result, chart, brand, type, sales, retur, customerCount] =
      await Promise.all([
        this.salesInvoiceRepository.fetchByDateRange(
          new Date(year, month - 1, 1),
          new Date(year, month, 0)
        ),
        this.salesInvoiceRepository.fetchChart(month, year),
        this.salesInvoiceRepository.fetchBestBrand(month, year),
        this.salesInvoiceRepository.fetchBestType(month, year),
        this.salesInvoiceRepository.fetchBestSales(month, year),
        this.salesReturnRepository.fetchMonthlyReturn(month, year),
        this.salesInvoiceRepository.fetchCustomerCount(month, year),
      ]);

    const hasil = {
      salesInvoiceCount: result.salesInvoiceCount,
      delivery: result.delivery,
      discount: result.discount,
      service: result.service,
      adminFee: result.adminFee,
      /*
        Biaya admin sengaja TIDAK masuk total. Ini laporan penjualan — angka
        omzet — sedangkan biaya admin uang titipan yang diteruskan ke bank.
        Ia dikirim terpisah supaya tetap bisa ditampilkan sebagai barisnya
        sendiri, bukan supaya ikut dijumlahkan.
      */
      total: result.value + result.delivery + result.service - result.discount,
      chart: chart,
      brand: brand,
      sales: sales,
      type: type,
      returned_value: retur.value,
      returns: retur.count,
      customerCount: customerCount,
      computedAt: new Date().toISOString(),
    };

    await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

    return res.status(200).send(hasil);
  };

  fetchBrandSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:penjualan-brand:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.salesInvoiceRepository.fetchBrandSales({
        month: month,
        year: year,
      });

      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching brand report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchCustomerSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:penjualan-customer:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.salesInvoiceRepository.fetchCustomerSales({
        month: month,
        year: year,
      });

      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching customer report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchTypeSalesreport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:penjualan-type:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.salesInvoiceRepository.fetchTypeSales({
        month: month,
        year: year,
      });

      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching type report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchSalesSalesReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:penjualan-sales:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.salesInvoiceRepository.fetchSalesSales({
        month: month,
        year: year,
      });

      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching type report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
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
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default SalesReportController;
