"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoiceService = void 0;
class SalesInvoiceService {
    constructor(salesInvoiceRepository, stockRepository, stockCardRepository, stockOutRepository) {
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.stockRepository = stockRepository;
        this.stockCardRepository = stockCardRepository;
        this.stockOutRepository = stockOutRepository;
    }
    async onSalesInvoiceCreated(id) {
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
        }
        catch (error) {
            console.error(`[error]: Error on fetching sales invoice by ID ${id}: ${error}`);
            throw new Error("Internal server error");
        }
    }
}
exports.SalesInvoiceService = SalesInvoiceService;
//# sourceMappingURL=sales-invoice.service.js.map