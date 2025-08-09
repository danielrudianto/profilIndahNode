import { Request, Response } from "express";
import { meili } from "../helper/meili.helper";
import ErrorList from "../assets/error_list";
import { translateKeyword, translatePage } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { PackageCodeModel } from "../model/product-package.model";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { queue } from "../helper/queue.helper";

class ProductPackageController {
  private productPackageRepository: ProductPackageRepository;

  constructor(productPackageRepository: ProductPackageRepository) {
    this.productPackageRepository = productPackageRepository;
  }

  create = async (req: Request, res: Response) => {
    const package_content = req.body.package_content;
    const name = req.body.name;
    const price = req.body.price;
    const description = req.body.description;
    const userID = req.body.userId;

    try {
      const result = await this.productPackageRepository.create({
        name: name,
        description: description,
        price: price,
        created_by: userID,
        created_at: new Date(),
        package_content: package_content.map((x: any) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: x.quantity,
            price: x.price,
          };
        }),
      });

      await meili.index("package").addDocuments([result]);

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating product package: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const price = req.body.price;
    const description = req.body.description;
    const name = req.body.name;
    const id = req.body.id;
    const userID = req.body.userId;

    try {
      const productPackage = await this.productPackageRepository.fetchByID(id);
      if (!productPackage) {
        return res.status(404).send(ErrorList["Product package not found"]);
      }

      const result = await this.productPackageRepository.update({
        id: id,
        name: name,
        description: description,
        price: price,
        created_by: userID,
        created_at: new Date(),
      });

      await queue.add("package-updated", {
        id: id,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating product package: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  updateSalesPrice = async (req: Request, res: Response) => {
    try {
      const items = req.body.items;
      const result = await this.productPackageRepository.updateSalesPrice(
        items
      );

      for (let item of items) {
        await queue.add("package-updated", { id: item.package_code_id });
      }

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error updating sales price ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const packageCode = await this.productPackageRepository.fetchByID(id);
      if (!packageCode) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (packageCode.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.productPackageRepository.delete(id, userID);

      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      await meili.index("package").deleteDocument(id);
      const socket = new SocketHelper("deleteItemPackage", result);
      socket.create();

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting product package: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const content = req.query.content;
    const pageSize = Number(process.env.LIMIT!);

    const result = await meili.index("package").search(keyword, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });

    return res.status(200).send({
      data: result.hits.map((x) => {
        return new PackageCodeModel({
          id: x.id,
          name: x.name,
          description: x.description,
          price: x.price,
          package_content: x.package_content.map((item: any) => {
            return {
              product_id: item.product_id,
              product_unit_id: item.product_unit_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              product: {
                id: item.product.id,
                reference: item.product.reference,
                description: item.product.description,
                unit: item.product.unit,
              },
              product_unit: item.product_unit
                ? {
                    id: item.product_unit.id,
                    conversion: item.product_unit.conversion,
                    unit: item.product_unit.unit,
                  }
                : null,
            };
          }),
          is_delete: false, // Assuming is_delete is false for fetched packages
        });
      }),
      count: result.estimatedTotalHits,
    });
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productPackageRepository.fetchByID(id);

      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching product package by ID ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default ProductPackageController;
