import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import {
  translateKeyword,
  translatePage,
  translatePageSize,
} from "../utils/escape.helper";
import { queue } from "../utils/queue.helper";
import { ProductRepository } from "../repositories/product.repository";

export class ProductPurchasePriceController {
  private productRepository: ProductRepository;

  constructor(productRepository: ProductRepository) {
    this.productRepository = productRepository;
  }

  fetch = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const page = translatePage(req.query.page);
      /*
        Ukuran halaman datang dari peramban, seperti daftar barang.

        Dulu dipatok process.env.LIMIT, sehingga pemilih 10/25/50 di layar
        tidak berpengaruh apa pun: server tetap mengirim sepuluh baris
        sementara penomoran halaman menghitung sesuai pilihan, dan separuh
        nomor halaman membuka tabel kosong. Karena itu pemilihnya sempat
        disembunyikan di kedua halaman harga.

        translatePageSize menjepitnya ke 1..100 dan mengembalikan 10 untuk
        masukan yang tidak masuk akal, jadi angka karangan dari peramban tidak
        bisa meminta seluruh tabel sekaligus.
      */
      const pageSize = translatePageSize(req.query.pageSize);

      const result = await this.productRepository.fetchSales({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });
      return res.status(200).send(result);
    } catch (error) {
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const product_id = req.body.product_id;
    const sales_price = req.body.sales_price;
    const sales_discount = req.body.sales_discount;
    const product_unit = req.body.product_unit;

    try {
      const product = await this.productRepository.fetchByID(product_id);
      if (!product || product.is_delete!) {
        return res.status(404).send(ErrorList["Product not found"]);
      }

      await this.productRepository.updateSalesPrice([
        {
          product_id: product_id,
          product_unit_id: null,
          price: sales_price,
          discount: sales_discount,
        },
        ...product_unit.map((x: any) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            price: x.sales_price,
            discount: x.sales_discount,
          };
        }),
      ]);

      await queue.add("product-updated", {
        id: product_id,
      });

      return res.status(200).send(product);
    } catch (error) {
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  updateByProductID = async (req: Request, res: Response) => {
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

      const result = await this.productRepository.updatePurchasePrice(
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
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
