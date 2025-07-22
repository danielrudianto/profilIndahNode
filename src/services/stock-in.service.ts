import { StockInRepository } from "../repositories/stock-in.repository";

export class StockInService {
  stockInRepository: StockInRepository;

  constructor(stockInRepository: StockInRepository) {
    this.stockInRepository = stockInRepository;
  }

  async delete() {
    try {
      const result = await this.stockInRepository.deleteAll();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async insertFromDocuments() {
    try {
      const result = await Promise.all([
        this.stockInRepository.insertFromGoodReceipts(),
        this.stockInRepository.insertFromAdjustmentCases(),
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}
