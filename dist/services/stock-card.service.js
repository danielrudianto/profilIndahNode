"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockCardService = void 0;
class StockCardService {
    constructor(stockCardRepository) {
        this.stockCardRepository = stockCardRepository;
    }
    async update(id) {
        try {
            const stockCard = await this.stockCardRepository.fetchByID(id);
            if (!stockCard) {
                throw new Error("Stock card not found");
            }
            const previous = await this.stockCardRepository.fetchPrevious({
                product_id: stockCard.product_id,
                date: new Date(stockCard.date),
                id: id,
            });
            if (previous == null) {
                await this.stockCardRepository.reorderSince({
                    product_id: stockCard.product_id,
                    id: id,
                    initial_stock: 0,
                    date: new Date(stockCard.date),
                });
            }
            else {
                const runningStock = previous.stock;
                await this.stockCardRepository.reorderSince({
                    product_id: stockCard.product_id,
                    id: id,
                    initial_stock: runningStock,
                    date: new Date(stockCard.date),
                });
            }
        }
        catch (error) {
            throw error;
        }
    }
    async delete(data) {
        const stockCard = await this.stockCardRepository.fetch(data);
        if (!stockCard) {
            throw new Error("Stock card not found");
        }
        const id = stockCard.id;
        const previous = await this.stockCardRepository.fetchPrevious({
            product_id: stockCard.product_id,
            date: new Date(stockCard.date),
            id: id,
        });
        await this.stockCardRepository.delete(id);
        if (previous == null) {
            await this.stockCardRepository.reorderSince({
                product_id: stockCard.product_id,
                id: id,
                initial_stock: 0,
                date: new Date(stockCard.date),
            });
        }
        else {
            const runningStock = previous.stock;
            await this.stockCardRepository.reorderSince({
                product_id: stockCard.product_id,
                id: id,
                initial_stock: runningStock,
                date: new Date(stockCard.date),
            });
        }
    }
    async startup() {
        console.info(`[info]: Starting inserting stock card`);
        await this.stockCardRepository.startup();
        console.info(`[info]: Inserting stock card completed`);
        console.info(`[info]: Starting reordering stock card`);
        await this.stockCardRepository.reorder();
        console.info(`[info]: Reordering stock card completed`);
    }
    async reorder() {
        console.info(`[info]: Starting reordering stock card`);
        await this.stockCardRepository.reorder();
        console.info(`[info]: Reordering stock card completed`);
    }
}
exports.StockCardService = StockCardService;
//# sourceMappingURL=stock-card.service.js.map