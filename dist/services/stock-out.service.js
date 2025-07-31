"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockOutService = void 0;
class StockOutService {
    constructor(stockOutRepository, stockInRepository) {
        this.stockOutRepository = stockOutRepository;
        this.stockInRepository = stockInRepository;
    }
    async delete() {
        await this.stockOutRepository.delete();
    }
    async insertFromDocuments() {
        try {
            this.stockOutRepository.insertFromSalesInvoices();
            this.stockOutRepository.insertFromAdjustmentCases();
        }
        catch (error) {
            throw error;
        }
    }
    async calculateStockOut() {
        console.info(`[info]: Calculating stock out value, assigning to stock in`);
        const stockOuts = await this.stockOutRepository.fetchUnassigned();
        for (let stockOut of stockOuts) {
            const productID = stockOut.product_id;
            let quantity = Number(stockOut.quantity);
            while (quantity > 0) {
                if (quantity == 0) {
                    break;
                }
                const stockIn = await this.stockInRepository.fetchUnfilled(productID);
                if (!stockIn) {
                    quantity = 0;
                    break;
                }
                const stockInQuantity = Number(stockIn.residue);
                if (stockInQuantity >= quantity) {
                    await this.stockInRepository.update({
                        stockInID: stockIn.id,
                        stockOutID: stockOut.id,
                        residue: stockInQuantity - quantity,
                    });
                    quantity = 0;
                    break;
                }
                else {
                    await this.stockInRepository.updateAndCreate({
                        stockInID: stockIn.id,
                        stockOutID: stockOut.id,
                        residue: quantity - stockInQuantity,
                        stockOut: {
                            adjustment_case_id: stockOut.adjustment_case_id,
                            adjustment_case_code_id: stockOut.adjustment_case_code_id,
                            sales_invoice_id: stockOut.sales_invoice_id,
                            sales_invoice_code_id: stockOut.sales_invoice_code_id,
                            date: stockOut.date,
                            price: stockOut.price,
                            quantity: stockInQuantity,
                            stock_in_id: stockIn.id,
                            product_id: stockOut.product_id,
                        },
                    });
                    quantity -= stockInQuantity;
                }
            }
        }
    }
}
exports.StockOutService = StockOutService;
//# sourceMappingURL=stock-out.service.js.map