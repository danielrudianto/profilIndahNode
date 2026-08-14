import { Request, Response } from "express";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { PromotionRepository } from "../repositories/promotion.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";

/**
 * Ringkasan angka untuk halaman dashboard.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class DashboardController {
  private salesInvoiceRepository: SalesInvoiceRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private promotionRepository: PromotionRepository;
  private salesDepositRepository: SalesDepositRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    goodReceiptRepository: GoodReceiptRepository,
    promotionRepository: PromotionRepository,
    salesDepositRepository: SalesDepositRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.promotionRepository = promotionRepository;
    this.salesDepositRepository = salesDepositRepository;
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
}

export default DashboardController;
