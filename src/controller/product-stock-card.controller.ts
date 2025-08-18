import { Request, Response } from "express";
import { translatePage } from "../helper/escape.helper";
import { ProductRepository } from "../repositories/product.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";

export class ProductStockCardController {
  private productRepository: ProductRepository;
  private stockCardRepository: StockCardRepository;

  constructor(
    productRepository: ProductRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.productRepository = productRepository;
    this.stockCardRepository = stockCardRepository;
  }

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const page = translatePage(req.query.page);
    const pageSize = Number(req.query.pageSize);

    try {
      const result = await this.stockCardRepository.fetchByProductID({
        page: page,
        pageSize: pageSize,
        productID: id,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching product stock card ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchMutation = async (req: Request, res: Response) => {
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
    } catch (error) {
      console.error(`[error]: Error on fething product stock ${error}`);
      return res.status(500).send(error);
    }
  };
}
