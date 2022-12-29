import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import { BrandModel } from "../model/brand.model";
import { ItemModel } from "../model/item.model";

class BrandController {
  /** Fetch autocomplete of item brand */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    BrandModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /** Fetch brand data by ID */
  static fetchById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id);
    BrandModel.fetchById(id)
      .then((result) => {
        return res.status(200).send({
          ...result[0],
          can_delete: result[1] == 0 ? true : false,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT?.toString()!);
    const offset = (page - 1) * limit;

    BrandModel.fetch(keyword, offset, limit)
      .then((result) => {
        ItemModel.countByBrandIds(
          result[0].map((x) => {
            return x.id;
          })
        )
          .then((count) => {
            return res.status(200).send({
              data: result[0].map((item) => {
                return {
                  ...item,
                  _count: undefined,
                  can_delete:
                    count.filter((x) => x.item_brand_id == item.id).length == 0
                      ? true
                      : count.filter((x) => x.item_brand_id == item.id)[0]
                          ._count == 0,
                };
              }),
              count: result[1],
            });
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Brand - Fetch",
              req.body.userId
            );

            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Brand - Fetch",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }
    const name = req.body.name;
    BrandModel.fetchByName(name)
      .then((brand) => {
        if (brand != null) {
          return res.status(400).send("Mohon masukkan nama merek unik.");
        } else {
          const brand_object = new BrandModel(name, req.body.userId);
          brand_object
            .create()
            .then((brand_result) => {
              LogHelper.log(
                brand_result.created_at,
                "info",
                `${brand_result.user.name} created new brand with the name ${brand_result.name} (ID: ${brand_result.id})`,
                `Brand - Create`,
                req.body.userId
              );

              const socket = new SocketHelper("createBrand", {
                ...brand_result,
                can_delete: true,
              });
              socket.create();

              return res.status(201).send(brand_result);
            })
            .catch((error) => {
              LogHelper.log(
                new Date(),
                "error",
                `${error}`,
                `Brand - Create`,
                req.body.userId
              );

              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = req.body.id;
    const name = req.body.name;

    BrandModel.fetchById(id)
      .then((brand_result) => {
        const brand = brand_result[0];
        if (brand == null || brand.is_delete) {
          return res.status(400).send("Data tidak ditemukan.");
        }

        BrandModel.update(id, name, new Date(), req.body.userId)
          .then((result) => {
            const socket = new SocketHelper("updateBrand", result);
            socket.create();

            LogHelper.log(
              result.updated_at!,
              "info",
              `${result.user_item_brand_updated_byTouser?.name} updated brand with the name ${result.name} (ID: ${result.id})`,
              `Brand - Create`,
              req.body.userId
            );

            return res.status(201).send(result);
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              `${error}`,
              `Brand - Update`,
              req.body.userId
            );

            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id);
    BrandModel.fetchById(id)
      .then((brand_result) => {
        const brand = brand_result[0];
        const count = brand_result[1];
        if (brand == null || count > 0) {
          return res.status(500).send("Merek tidak dapat dihapus.");
        } else {
          BrandModel.delete(id, req.body.userId)
            .then((result) => {
              const socket = new SocketHelper("deleteBrand", result);
              socket.create();

              LogHelper.log(
                result.deleted_at!,
                "info",
                `${result.user_item_brand_deleted_byTouser?.name} deleted brand with the name ${result.name} (ID: ${result.id})`,
                `Brand - Delete`,
                req.body.userId
              );

              return res.status(201).send(result);
            })
            .catch((error) => {
              LogHelper.log(
                new Date(),
                "error",
                `${error})`,
                `Brand - Delete`,
                req.body.userId
              );

              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          `${error})`,
          `Brand - Delete`,
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchUsed = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT?.toString()!);
    const offset = (page - 1) * limit;

    BrandModel.fetchUsed(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: (result[1] as any[])[0].count,
        });
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Brand Controller - Fetch Used",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };
}

export default BrandController;
