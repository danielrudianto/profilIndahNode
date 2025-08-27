import { redisClient } from "../helper/redis.helper";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";

export class SalesInvoiceService {
  salesInvoiceRepository: SalesInvoiceRepository;
  productStockRepository: ProductStockRepository;
  stockCardRepository: StockCardRepository;
  stockOutRepository: StockOutRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    productStockRepository: ProductStockRepository,
    stockCardRepository: StockCardRepository,
    stockOutRepository: StockOutRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.productStockRepository = productStockRepository;
    this.stockCardRepository = stockCardRepository;
    this.stockOutRepository = stockOutRepository;
  }

  async onSalesInvoiceCreated(id: number) {
    // first fetch the sales invoice data
    try {
      const salesInvoice = await this.salesInvoiceRepository.fetchByID(id);
      if (!salesInvoice) {
        console.error(`[error]: Sales invoice with ID ${id} not found.`);
        return;
      }

      if (salesInvoice.isDelete) {
        console.warn(`Sales invoice with ID ${id} is marked as deleted.`);
        return;
      }
    } catch (error) {
      console.error(
        `[error]: Error on fetching sales invoice by ID ${id}: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async syncSales() {
    try {
      const sales = await this.salesInvoiceRepository.fetchSales();
      console.info(`[Info]: Found ${sales.length} salesman in sales invoices`);
      await redisClient.del("salesmanList");
      for (let i = 0; i < sales.length; i++) {
        const salesName = sales[i];
        console.info(
          `[Info]: Completed inserting ${salesName} -- progress ${i + 1}/${
            sales.length
          }`
        );
        await redisClient.sAdd("salesmanList", salesName);
      }
    } catch (error) {
      console.error(`[error]: Error on sync salesman ${error}`);
      throw error;
    }
  }
}
