import { Request, Response } from "express";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";

/**
 * Laporan persediaan dan keluar-masuk barang.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class StockReportController {
  private stockInRepository: StockInRepository;
  private productRepository: ProductRepository;
  private productStockRepository: ProductStockRepository;
  private stockOutRepository: StockOutRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private adjustmentCaseRepository: AdjustmentCaseRepository;

  constructor(
    stockInRepository: StockInRepository,
    productRepository: ProductRepository,
    productStockRepository: ProductStockRepository,
    stockOutRepository: StockOutRepository,
    goodReceiptRepository: GoodReceiptRepository,
    adjustmentCaseRepository: AdjustmentCaseRepository
  ) {
    this.stockInRepository = stockInRepository;
    this.productRepository = productRepository;
    this.productStockRepository = productStockRepository;
    this.stockOutRepository = stockOutRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.adjustmentCaseRepository = adjustmentCaseRepository;
  }

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
}

export default StockReportController;
