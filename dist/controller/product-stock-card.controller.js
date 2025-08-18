"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductStockCardController = void 0;
const escape_helper_1 = require("../helper/escape.helper");
class ProductStockCardController {
    constructor(productRepository, stockCardRepository) {
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const pageSize = Number(req.query.pageSize);
            try {
                const result = await this.stockCardRepository.fetchByProductID({
                    page: page,
                    pageSize: pageSize,
                    productID: id,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching product stock card ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchMutation = async (req, res) => {
            const date = new Date(req.body.date);
            const productID = req.body.product_id;
            const viewBy = req.body.viewBy;
            try {
                const result = await this.stockCardRepository.fetchMutation({
                    date: date,
                    productID: productID,
                    viewBy: viewBy,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fething product stock ${error}`);
                return res.status(500).send(error);
            }
        };
        this.productRepository = productRepository;
        this.stockCardRepository = stockCardRepository;
    }
}
exports.ProductStockCardController = ProductStockCardController;
//# sourceMappingURL=product-stock-card.controller.js.map