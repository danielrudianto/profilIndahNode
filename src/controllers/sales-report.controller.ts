import { Request, Response } from "express";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";

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

    const result = await this.salesInvoiceRepository.fetchByDateRange(
      new Date(year, month - 1, 1),
      new Date(year, month, 0)
    );

    const chart = await this.salesInvoiceRepository.fetchChart(month, year);
    const brand = await this.salesInvoiceRepository.fetchBestBrand(month, year);
    const type = await this.salesInvoiceRepository.fetchBestType(month, year);
    const sales = await this.salesInvoiceRepository.fetchBestSales(month, year);
    /*
      Kartu retur dan pelanggan di berkas desain 9a. Bentuk lama halaman
      membaca returned_value/returns yang tidak pernah dikirim siapa pun.
    */
    const retur = await this.salesReturnRepository.fetchMonthlyReturn(
      month,
      year
    );
    const customerCount = await this.salesInvoiceRepository.fetchCustomerCount(
      month,
      year
    );

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
      returned_value: retur.value,
      returns: retur.count,
      customerCount: customerCount,
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
}

export default SalesReportController;
