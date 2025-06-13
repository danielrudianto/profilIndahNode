import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockRepository } from "../repositories/stock.repository";

export class SalesInvoiceService {
  salesInvoiceRepository: SalesInvoiceRepository;
  stockRepository: StockRepository;
  stockCardRepository: StockCardRepository;
  stockOutRepository: StockOutRepository;

  constructor(
    salesInvoiceRepository: SalesInvoiceRepository,
    stockRepository: StockRepository,
    stockCardRepository: StockCardRepository,
    stockOutRepository: StockOutRepository
  ) {
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.stockRepository = stockRepository;
    this.stockCardRepository = stockCardRepository;
    this.stockOutRepository = stockOutRepository;
  }

  async onSalesInvoiceCreated(id: number) {
    // first fetch the sales invoice data
    try {
      const salesInvoice = await this.salesInvoiceRepository.fetchByID(id);
      if (salesInvoice.isDelete) {
        console.warn(`Sales invoice with ID ${id} is marked as deleted.`);
        return;
      }

      // update the stock
      //   this.stockRepository.updateMany(
      //     salesInvoice.bill!.map((item) => {
      //       return {
      //         itemID: item.item_id,
      //         quantity:
      //           item.quantity *
      //           (item.item_unit == null ? 1 : item.item_unit.conversion),
      //       };
      //     })
      //   );
    } catch (error) {
      console.error(
        `[error]: Error on fetching sales invoice by ID ${id}: ${error}`
      );
      throw new Error("Internal server error");
    }
  }
}
