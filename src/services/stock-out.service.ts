import { PrismaClient } from "@prisma/client";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";

export class StockOutService {
  private stockOutRepository: StockOutRepository;
  private stockInRepository: StockInRepository;

  constructor(
    stockOutRepository: StockOutRepository,
    stockInRepository: StockInRepository
  ) {
    this.stockOutRepository = stockOutRepository;
    this.stockInRepository = stockInRepository;
  }

  async delete() {
    await this.stockOutRepository.delete();
  }

  async insertFromDocuments() {
    try {
      const salesInvoice =
        await this.stockOutRepository.insertFromSalesInvoices();

      console.info(
        `[info]: Successfully inserted sales invoice to stock out data`
      );
      const adjustmentCase =
        await this.stockOutRepository.insertFromAdjustmentCases();

      console.info(
        `[info]: Successfully inserted sales invoice to stock in data`
      );
    } catch (error) {
      throw error;
    }
  }

  async calculateStockOut() {
    console.info(`[info]: Calculating stock out value, assigning to stock in`);
    const stockOuts = await this.stockOutRepository.fetchUnassigned();
    console.info(`[info]: Found ${stockOuts.length} data to be assigned`);

    for (let i = 0; i < stockOuts.length; i++) {
      console.info(
        `[info]: Commencing product stock calculation ${i} / ${stockOuts.length}`
      );
      let quantity = Number(stockOuts[i].quantity);

      while (quantity > 0) {
        if (quantity == 0) {
          break;
        }

        const stockIn = await this.stockInRepository.fetchUnfilled(
          stockOuts[i].product_id
        );

        if (!stockIn) {
          quantity = 0;
          break;
        }

        if (stockIn.residue >= quantity) {
          await this.stockOutRepository.update({
            stock_in_id: stockIn.id,
            assignedQuantity: quantity,
            stockOut: stockOuts[i],
          });
          quantity = 0;
          break;
        } else {
          await this.stockOutRepository.update({
            stock_in_id: stockIn.id,
            assignedQuantity: stockIn.residue,
            stockOut: stockOuts[i],
          });

          stockOuts[i].id = 0;
          quantity -= stockIn.residue;
        }
      }

      console.info(
        `[info]: Completed product stock calculation ${i} / ${stockOuts.length}`
      );
    }
  }
}
