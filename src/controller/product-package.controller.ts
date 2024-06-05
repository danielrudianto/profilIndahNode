import { Request, Response } from "express";
import { meili } from "../app";
import ErrorList from "../assets/error_list";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import { ProductPackageCodeModel } from "../model/product-package.model";

class ProductPackageController {
  /**
   * Create a new product package
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const package_content = req.body.package_content;
    const name = req.body.name;
    const price = req.body.price;
    const description = req.body.description;
    const userID = req.body.userId;

    ProductPackageCodeModel.create({
      name: name,
      description: description,
      price: price,
      items: package_content.map((x: any) => {
        return {
          item_id: x.item_id,
          item_unit_id: x.item_unit_id,
          quantity: x.quantity,
          price: x.price,
          discount: x.discount,
        };
      }),
      created_by: userID,
    })
      .then(async (result) => {
        await queue.add("create-product-package", result);

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on creating product package: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch product packages with pagination
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page ? 1 : parseInt(req.query.page as string);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const content = req.query.content;

    if (content == "true") {
      if (keyword == "") {
        ProductPackageCodeModel.fetch(page, keyword)
          .then((result) => {
            const data = result[0];
            const count = result[1];

            return res.status(200).send({
              data: data.map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  price: x.price,
                  information: `${x.package_content.length} item${
                    x.package_content.length > 1 ? "s" : ""
                  }`,
                  package_content: x.package_content.map((x) => {
                    return {
                      reference: x.item.reference,
                      description: x.item.description,
                      unit: x.item.unit,
                      quantity: x.quantity,
                      item_unit: x.item_unit,
                    };
                  }),
                  is_delete: x.is_delete,
                };
              }),
              count: count,
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error on fetching product package: ${error}`
            );
            return res.status(500).send(error);
          });
      } else {
        meili
          .index("package")
          .search(keyword, { limit: 10, offset: (page - 1) * 10 })
          .then((result) => {
            return res.status(200).send({
              data: result.hits.map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  price: x.price,
                  information: `${x.product_content.length} item${
                    x.product_content.length > 1 ? "s" : ""
                  }`,
                  package_content: x.product_content.map((x: any) => {
                    return {
                      reference: x.item.reference,
                      description: x.item.description,
                      unit: x.item.unit,
                      quantity: x.quantity,
                      item_unit: x.item_unit,
                    };
                  }),
                  is_delete: false,
                };
              }),
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error on fetching product package: ${error}`
            );
            return res.status(500).send(error);
          });
      }
    } else {
      if (keyword == "") {
        ProductPackageCodeModel.fetch(page, keyword)
          .then((result) => {
            const data = result[0];
            const count = result[1];

            return res.status(200).send({
              data: data.map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  price: x.price,
                  information: `${x.package_content.length} item${
                    x.package_content.length > 1 ? "s" : ""
                  }`,
                  is_delete: x.is_delete,
                };
              }),
              count: count,
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error on fetching product package: ${error}`
            );
            return res.status(500).send(error);
          });
      } else {
        meili
          .index("package")
          .search(keyword, { limit: 10, offset: (page - 1) * 10 })
          .then((result) => {
            return res.status(200).send({
              data: result.hits.map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  price: x.price,
                  information: `${x.product_content.length} item${
                    x.product_content.length > 1 ? "s" : ""
                  }`,
                  is_delete: false,
                };
              }),
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error on fetching product package: ${error}`
            );
            return res.status(500).send(error);
          });
      }
    }
  };

  /**
   * Fetch product package by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    ProductPackageCodeModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send({
          ...result,
          price: result.price,
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching product package by ID: ${error}`
        );
        return res.status(500).send(error);
      });
  };

  /**
   * Update product package by ID
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    console.log(req.body);
    const price = req.body.price;
    const description = req.body.description;
    const name = req.body.name;
    const id = req.body.id;

    ProductPackageCodeModel.update(name, description, price, id)
      .then(async (result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        await queue.add("update-product-package", result);

        const socket = new SocketHelper("updateItemPackage", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on updating product package: ${error}`);
        return res.status(500).send(error);
      });
  };

  /**
   * Delete product package by ID
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;

    ProductPackageCodeModel.delete(id, userID)
      .then(async (result) => {
        await meili.index("package").deleteDocument(id);
        const socket = new SocketHelper("deleteItemPackage", result);
        socket.create();
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting product package: ${error}`);
        return res.status(500).send(error);
      });
  };
}

export default ProductPackageController;
