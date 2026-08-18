import { Request, Response } from "express";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";

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

  fetchSupplierPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.goodReceiptRepository.fetchSupplierPurchases(
        month,
        year
      );
      return res.status(200).send({ data: result });
    } catch (error) {
      console.error(`[error]: Error on fetching supplier purchases ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchBrandPurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.goodReceiptRepository.fetchBrandPurchases(
        month,
        year
      );
      return res.status(200).send({ data: result });
    } catch (error) {
      console.error(`[error]: Error on fetching brand purchases ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchTypePurchaseReport = async (req: Request, res: Response) => {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    try {
      const result = await this.goodReceiptRepository.fetchTypePurchases(
        month,
        year
      );
      return res.status(200).send({ data: result });
    } catch (error) {
      console.error(`[error]: Error on fetching type purchases ${error}`);
      return res.status(500).send(error);
    }
  };
}

export default PurchaseReportController;
