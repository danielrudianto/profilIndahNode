import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import {
  dariCacheLaporan,
  keCacheLaporan,
  mintaHitungUlang,
  umurCacheLaporan,
} from "../utils/report-cache.helper";

/**
 * Laporan pembelian beserta unduhannya.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class PurchaseReportController {
  private goodReceiptRepository: GoodReceiptRepository;

  constructor(goodReceiptRepository: GoodReceiptRepository) {
    this.goodReceiptRepository = goodReceiptRepository;
  }

  fetchPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    /* Lima agregat sekaligus — yang paling pantas disimpan di halaman ini. */
    const kunci = `laporan:pembelian-utama:${year}:${month}`;

    if (!mintaHitungUlang(req.body.refresh)) {
      const tersimpan = await dariCacheLaporan(kunci);
      if (tersimpan) {
        return res.status(200).send(tersimpan);
      }
    }

    /* Kelima agregat saling bebas — berbarengan, bukan berbaris. */
    const [result, chart, brand, type, supplier] = await Promise.all([
      this.goodReceiptRepository.fetchByDateRange(
        new Date(year, month - 1, 1),
        new Date(year, month, 0)
      ),
      this.goodReceiptRepository.fetchChart(month, year),
      this.goodReceiptRepository.fetchBestBrand(month, year),
      this.goodReceiptRepository.fetchBestType(month, year),
      this.goodReceiptRepository.fetchBestSupplier(month, year),
    ]);

    const hasil = {
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
      computedAt: new Date().toISOString(),
    };

    await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

    return res.status(200).send(hasil);
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
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchSupplierPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:pembelian-supplier:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.goodReceiptRepository.fetchSupplierPurchases(
        month,
        year
      );
      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching supplier purchases ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchBrandPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:pembelian-brand:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.goodReceiptRepository.fetchBrandPurchases(
        month,
        year
      );
      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching brand purchases ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchTypePurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const kunci = `laporan:pembelian-type:${year}:${month}`;
    try {
      if (!mintaHitungUlang(req.query.refresh)) {
        const tersimpan = await dariCacheLaporan(kunci);
        if (tersimpan) {
          return res.status(200).send(tersimpan);
        }
      }

      const result = await this.goodReceiptRepository.fetchTypePurchases(
        month,
        year
      );
      const hasil = { data: result, computedAt: new Date().toISOString() };
      await keCacheLaporan(kunci, hasil, umurCacheLaporan(year, month));

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching type purchases ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default PurchaseReportController;
