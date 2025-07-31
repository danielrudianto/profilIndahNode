"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockRepository = void 0;
class StockRepository {
    constructor(prisma) {
        this.update = async (itemID, quantity) => { };
        this.updateMany = async (items) => {
            try {
                const updateData = [];
                for (let item of items) {
                    updateData.push(this.prisma.product_stock.upsert({
                        where: {
                            id: item.productID,
                        },
                        create: {
                            id: item.productID,
                            stock: item.quantity,
                        },
                        update: {
                            stock: {
                                increment: item.quantity,
                            },
                        },
                    }));
                }
                return this.prisma.$transaction(updateData);
            }
            catch (error) {
                throw error;
            }
        };
        this.fetchOutputReport = async (data) => {
        };
        this.prisma = prisma;
    }
}
exports.StockRepository = StockRepository;
//# sourceMappingURL=stock.repository.js.map