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
        console.info(`[info]: Found ${stockOuts.length} data to be assigned`);
        const stockIns = await this.stockInRepository.fetchManyUnfilled([
            ...new Set(stockOuts.map((s) => s.product_id)),
        ]);
        const bulkUpdate = [];
        for (let i = 0; i < stockOuts.length; i++) {
            console.info(`[info]: Commencing stock out calculationi ${i + 1} out of ${stockOuts.length} (${Math.round(((i + 1) * 100) / stockOuts.length)}%)`);
            const productID = stockOuts[i].product_id;
            let quantity = Number(stockOuts[i].quantity);
            while (quantity > 0) {
                if (quantity == 0) {
                    break;
                }
                const stockInIndex = stockIns.findIndex((x) => x.product_id == stockOuts[i].product_id);
                if (stockInIndex == -1) {
                    quantity = 0;
                    break;
                }
                const stockIn = stockIns[stockInIndex];
                if (stockIn.residue >= quantity) {
                    bulkUpdate.push({
                        type: "update",
                        stockInID: stockIns[stockInIndex].id,
                        stockOutID: stockOuts[i].id,
                        residue: stockIn.residue - quantity,
                    });
                    stockIns[stockInIndex].residue -= quantity;
                    quantity = 0;
                    break;
                }
                else {
                    bulkUpdate.push({
                        type: "updateAndCreate",
                        stockInID: stockIns[stockInIndex].id,
                        stockOutID: stockIns[stockInIndex].id,
                        residue: 0,
                        quantity: stockIn.residue,
                        stockOut: {
                            adjustment_case_id: stockOuts[i].adjustment_case_id,
                            adjustment_case_code_id: stockOuts[i].adjustment_case_code_id,
                            sales_invoice_id: stockOuts[i].sales_invoice_id,
                            sales_invoice_code_id: stockOuts[i].sales_invoice_code_id,
                            date: stockOuts[i].date,
                            price: stockOuts[i].price,
                            quantity: quantity - stockIn.residue,
                            stock_in_id: stockOuts[i].id,
                            product_id: stockOuts[i].product_id,
                        },
                    });
                    quantity -= stockIn.residue;
                    stockIns.splice(stockInIndex, 1);
                }
            }
        }
        await this.stockInRepository.bulkUpdate(bulkUpdate);
    }
}
exports.StockOutService = StockOutService;
//# sourceMappingURL=stock-out.service.js.map