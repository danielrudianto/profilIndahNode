"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockInService = void 0;
class StockInService {
    constructor(stockInRepository) {
        this.stockInRepository = stockInRepository;
    }
    async delete() {
        try {
            const result = await this.stockInRepository.deleteAll();
            return result;
        }
        catch (error) {
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
        }
        catch (error) {
            throw error;
        }
    }
}
exports.StockInService = StockInService;
//# sourceMappingURL=stock-in.service.js.map