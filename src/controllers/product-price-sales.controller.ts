import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { translateKeyword, translatePage } from "../utils/escape.helper";
import { queue } from "../utils/queue.helper";
import { ProductRepository } from "../repositories/product.repository";

export class ProductSalesPriceController {
  private productRepository: ProductRepository;

  constructor(productRepository: ProductRepository) {
    this.productRepository = productRepository;
  }

  fetch = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const page = translatePage(req.query.page);
      const pageSize = Number(process.env.LIMIT!);

      const result = await this.productRepository.fetchSales({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });
      return res.status(200).send(result);
    } catch (error) {
      return res.status(500).send(error);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const product = await this.productRepository.fetchSalesPriceByID(id);
      return res.status(200).send(product);
    } catch (error) {
      console.error(`[error]: Error on fetching sales price by ID ${error}`);
      return res.status(500).send(error);
    }
  };

  update = async (req: Request, res: Response) => {
    const data: {
      product_unit_id: number | null;
      price: number;
      discount: number;
    }[] = req.body.data;
    const product_id = req.body.product_id;

    try {
      const product = await this.productRepository.fetchByID(product_id);
      if (!product || product.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.productRepository.updateSalesPrice(
        data.map((x) => {
          return {
            product_id: product_id,
            product_unit_id: x.product_unit_id,
            price: x.price,
            discount: x.discount,
          };
        })
      );

      await queue.add("product-updated", {
        id: product_id,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on updating product purchase price ${error}`
      );
      return res.status(500).send(error);
    }
  };
}
