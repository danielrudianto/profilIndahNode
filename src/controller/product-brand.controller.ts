import { Request, Response } from "express";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { BrandModel } from "../model/brand.model";

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
    const id = parseInt(req.params.id);
    BrandModel.fetchById(id)
      .then((result) => {
        return res.status(200).send({
          ...result[0],
          can_delete: parseInt(result[1].toString()) == 0 ? true : false,
        });
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(
          mysql_real_escape_string(req.query.keyword.toString())
        );
    const limit = parseInt(process.env.LIMIT?.toString()!);
    const offset = (page - 1) * limit;

    BrandModel.fetch(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: (result[0] as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              created_at: x.created_at,
              created_by: x.created_by,
              user: {
                name: x.created_by_name,
              },
              is_delete: x.is_delete,
              can_delete: x.count == 0 ? true : false,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
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
              const socket = new SocketHelper("createBrand", {
                ...brand_result,
                can_delete: true,
              });
              socket.create();

              return res.status(201).send(brand_result);
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
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
            return res.status(201).send(result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
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
              return res.status(201).send(result);
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default BrandController;
