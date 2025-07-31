"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodReceiptService = void 0;
class GoodReceiptService {
    constructor(goodReceiptRepository, stockInRepository) {
        this.goodReceiptRepository = goodReceiptRepository;
        this.stockInRepository = stockInRepository;
    }
    async create(id) {
        try {
            const goodReceipt = await this.goodReceiptRepository.fetchByID(id);
            if (!goodReceipt) {
                throw new Error("Good receipt not found");
            }
            const result = await this.stockInRepository.createMany(goodReceipt.good_receipt.map((item) => {
                return {
                    date: goodReceipt.date,
                    company_id: goodReceipt.company_id,
                    supplier_id: goodReceipt.supplier_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    discount: item.discount,
                    created_at: new Date(),
                    created_by: goodReceipt.created_by,
                    good_receipt_id: item.id,
                    good_receipt_code_id: goodReceipt.id,
                    adjustment_case_code_id: null,
                    adjustment_case_id: null,
                };
            }));
            return result;
        }
        catch (error) {
            console.error("Error creating good receipt:", error);
            throw new Error("Failed to create good receipt");
        }
    }
}
exports.GoodReceiptService = GoodReceiptService;
//# sourceMappingURL=good-receipt.service.js.map