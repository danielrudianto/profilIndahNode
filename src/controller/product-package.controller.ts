import { Request, Response } from "express";
import { meili } from "../helper/meili.helper";
import ErrorList from "../assets/error_list";
import { translateKeyword, translatePage } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import { PackageCodeModel } from "../model/product-package.model";
import { ProductPackageRepository } from "../repositories/product-package.repository";

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
        package_content: package_content.map((x: any) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
      });

      await meili.index("package").addDocuments(
        [
          {
            id: result.id,
            name: result.name,
            description: result.description,
            product_content: result.package_content,
          },
        ],
        {
          primaryKey: "id",
        }
      );

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
      const result = await this.productPackageRepository.update({
        id: id,
        name: name,
        description: description,
        price: price,
        created_by: userID,
        created_at: new Date(),
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating product package: ${error}`);
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

    const [result, count] = await Promise.all([
      meili.index("package").search(keyword, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      meili.index("package").getStats(),
    ]);

    return res.status(200).send({
      data: result.hits.map((x) => {
        return new PackageCodeModel({
          id: x.id,
          name: x.name,
          description: x.description,
          price: x.price,
          package_content: x.product_content.map((item: any) => {
            return {
              item_id: item.item.id,
              item_unit_id: item.item_unit ? item.item_unit.id : null,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
              item: {
                id: item.item.id,
                reference: item.item.reference,
                description: item.item.description,
                unit: item.item.unit,
              },
              item_unit: item.item_unit
                ? {
                    id: item.item_unit.id,
                    conversion: item.item_unit.conversion,
                    unit: item.item_unit.unit,
                  }
                : null,
            };
          }),
          is_delete: false, // Assuming is_delete is false for fetched packages
        });
      }),
      count: count.numberOfDocuments,
    });
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productPackageRepository.fetchByID(id);

      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }
    } catch (error) {
      console.error(
        `[error]: Error on fetching product package by ID ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default ProductPackageController;
