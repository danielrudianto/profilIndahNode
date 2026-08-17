import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { meili } from "../utils/meili.helper";
import { translateKeyword, translatePage } from "../utils/escape.helper";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { ProductModel } from "../models/product.model";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";

class ProductStockController {
  productStockRepository: ProductStockRepository;
  productPackageRepository: ProductPackageRepository;
  productRepository: ProductRepository;
  salesDepositRepository: SalesDepositRepository;

  constructor(
    productStockRepository: ProductStockRepository,
    productPackageRepository: ProductPackageRepository,
    productRepository: ProductRepository,
    salesDepositRepository: SalesDepositRepository
  ) {
    this.productStockRepository = productStockRepository;
    this.productPackageRepository = productPackageRepository;
    this.productRepository = productRepository;
    this.salesDepositRepository = salesDepositRepository;
  }

  fetchProblematic = async (req: Request, res: Response) => {
    const page = translatePage(req.body.page);
    const keyword = translateKeyword(req.body.keyword);
    const limit = Number(process.env.LIMIT!);
    const brands = req.body.brands;
    const types = req.body.types;

    try {
      const problematicResult =
        await this.productStockRepository.fetchProblematicStock({
          keyword: keyword,
          page: page,
          pageSize: limit,
          brands: brands,
          types: types,
        });

      return res.status(200).send(problematicResult);
    } catch (error) {
      console.error(
        `[error]: Error on fetching problematic product stock ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchInadequate = async (req: Request, res: Response) => {
    const page = translatePage(req.body.page);
    const keyword = translateKeyword(req.body.keyword);
    // pageSize opsional (divalidasi Zod, maksimum 10000) dipakai unduhan
    // Excel untuk menarik seluruh baris sekali jalan.
    const limit = req.body.pageSize
      ? Number(req.body.pageSize)
      : Number(process.env.LIMIT!);
    const brands = req.body.brands;
    const types = req.body.types;

    try {
      const problematicResult =
        await this.productStockRepository.fetchInadequateStock({
          keyword: keyword,
          page: page,
          pageSize: limit,
          brands: brands,
          types: types,
        });

      return res.status(200).send(problematicResult);
    } catch (error) {
      console.error(
        `[error]: Error on fetching problematic product stock ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = Number(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    const pageSize = Number(req.query.pageSize);
    const condition = req.query.condition as string | undefined;

    try {
      /*
        Penghitung chip selalu ikut, juga ketika saringannya sedang menyala:
        ia menyatakan keadaan SELURUH katalog, bukan halaman yang tampil.
        Dihitung dari halaman, angkanya berubah setiap kali pengguna berpindah
        halaman — dan itu terbaca seperti data yang berubah sendiri.
      */
      const summary = await this.productStockRepository.countConditions();

      /*
        Ketika disaring, datanya diambil dari basis data, bukan Meilisearch:
        "di bawah ambangnya sendiri" adalah perbandingan antara dua kolom, dan
        indeks pencarian tidak menyimpan hubungan itu. Kedua repositori ini
        sudah ada dan sudah dipakai halaman lain — bentuk barisnya sama persis
        dengan jalur biasa, sampai ke product_stock.stock dan product_brand.
      */
      if (condition === "low" || condition === "negative") {
        const hasil =
          condition === "low"
            ? await this.productStockRepository.fetchInadequateStock({
                keyword: keyword,
                page: page,
                pageSize: pageSize,
                brands: [],
                types: [],
              })
            : await this.productStockRepository.fetchProblematicStock({
                keyword: keyword,
                page: page,
                pageSize: pageSize,
                brands: [],
                types: [],
              });

        return res.status(200).send({
          data: hasil.data,
          count: hasil.count,
          summary: summary,
        });
      }

      const result = await meili.index("product").search(keyword, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        filter: ["is_active = true", "is_delete = false"],
      });

      const productStock = await this.productStockRepository.fetchStock(
        result.hits.map((x) => {
          return x.id;
        })
      );

      return res.status(200).send({
        data: result.hits.map((x) => {
          const index = productStock.findIndex((y) => {
            return y.id == x.id;
          });

          return {
            ...x,
            product_stock: {
              stock: index == -1 ? 0 : productStock[index].stock,
            },
          };
        }),
        count: result.estimatedTotalHits,
        summary: summary,
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching default product stock ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchWarehouse = async (req: Request, res: Response) => {
    const keyword = req.body.keyword;
    const page = req.body.page;
    const pageSize = req.body.pageSize;
    const role = req.body.role;

    try {
      if (role === 6) {
        const user_sales = req.body.user_sales as { product_type_id: number }[];
        const typeFilter = user_sales
          .map((x) => {
            return `product_type_id = ${x.product_type_id}`;
          })
          .join(" OR ");
        const result = await meili.index("product").search(keyword, {
          filter: ["is_delete = false", "is_active = true", typeFilter],
          offset: (page - 1) * pageSize,
          limit: pageSize,
        });

        const productStocks =
          await this.productStockRepository.fetchStockByProductID(
            result.hits.map((x) => {
              return x.id;
            })
          );

        const depositProductStock =
          await this.salesDepositRepository.calculatePendingStock(
            result.hits.map((x) => {
              return x.id;
            })
          );

        return res.status(200).send({
          data: result.hits.map((x) => {
            const index = productStocks.findIndex(
              (stock) => stock.product_id == x.id
            );

            const depositIndex = depositProductStock.findIndex(
              (deposit) => deposit.product_id == x.id
            );

            const stock = index == -1 ? 0 : productStocks[index].stock;
            const deposit =
              depositIndex == -1
                ? 0
                : depositProductStock[depositIndex].quantity;

            const product = ProductModel.fromMeilisearch(x);
            return {
              ...product,
              product_stock: {
                stock: stock - deposit,
              },
            };
          }),
          count: result.estimatedTotalHits,
        });
      } else {
        const result = await meili.index("product").search(keyword, {
          filter: ["is_delete = false", "is_active = true"],
          offset: (page - 1) * pageSize,
          limit: pageSize,
        });

        const productStocks =
          await this.productStockRepository.fetchStockByProductID(
            result.hits.map((x) => {
              return x.id;
            })
          );

        return res.status(200).send({
          data: result.hits.map((x) => {
            const index = productStocks.findIndex(
              (stock) => stock.product_id == x.id
            );
            const product = ProductModel.fromMeilisearch(x);
            return {
              ...product,
              product_stock: {
                stock: index == -1 ? 0 : productStocks[index].stock,
              },
            };
          }),
          count: result.estimatedTotalHits,
        });
      }
    } catch (error) {
      console.error(
        `[error]: Error on fetching product stock warehouse ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchInadequateWarehouse = async (req: Request, res: Response) => {
    const keyword = req.body.keyword;
    const page = req.body.page;
    const pageSize = req.body.pageSize;
    const userID = req.body.userId;

    try {
      const result = await this.productStockRepository.fetchInadequateWarehouse(
        {
          page: page,
          keyword: keyword,
          pageSize: pageSize,
        }
      );

      const products = await this.productRepository.fetchByIDs(
        result.data.map((x) => {
          return x.id;
        })
      );

      return res.status(200).send({
        data: result.data.map((x) => {
          const productIndex = products.findIndex(
            (product) => product.id == x.id
          );
          if (productIndex != -1) {
            return {
              ...products[productIndex],
              product_stock: {
                stock: x.product_stock.stock,
              },
            };
          }
        }),
        count: result.count,
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching product stock warehouse ${error}`
      );
      return res.status(500).send(error);
    }
  };

  fetchProductMetaDataByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching product meta data ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchByProductID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const stock = await this.productStockRepository.fetchStockByProductID([
        id,
      ]);

      return res.status(200).send({
        stock: stock.length == 0 ? 0 : stock[0],
      });
    } catch (error) {
      console.error(`[error]: Error on fetching product stock ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchByPackageID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const productPackage = await this.productPackageRepository.fetchByID(id);
      if (!productPackage) {
        return res.status(404).send(ErrorList["Product package not found"]);
      } else {
        const stock = await this.productStockRepository.fetchStockByProductID(
          productPackage.package_content!.map((x) => {
            return x.product_id;
          })
        );

        return res.status(200).send(
          productPackage.package_content!.map((x) => {
            const index = stock.findIndex((y) => y.product_id == x.product_id);
            return {
              product_id: x.product_id,
              stock: index == -1 ? 0 : stock[index].stock,
            };
          })
        );
      }
    } catch (error) {
      console.error(`[error]: Error on fetching package stock ${error}`);
      return res.status(500).send(error);
    }
  };
}

export default ProductStockController;
