import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { BrandModel } from "../model/brand.model";

class BrandController {
  /**
   * Create a new brand
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const userID = req.body.userId;
    BrandModel.fetchByName(name)
      .then((brand) => {
        if (brand) {
          return res.status(400).send(ErrorList["Brand unique constraint"]);
        }

        BrandModel.create({
          name: name,
          created_by: userID,
        })
          .then((result) => {
            const socket = new SocketHelper("createBrand", {
              ...result,
              can_delete: true,
            });
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

  /**
   * Fetch brand data for autocomplete
   * @param req
   * @param res
   */
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

  /**
   * Fetch brand by id
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BrandModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        const itemBrand = result[0];
        return res.status(200).send({
          ...itemBrand,
          can_delete: itemBrand.can_delete! == "1" ? true : false,
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error while fetching brand by id [${id}] ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch brand data
   * @param req
   * @param res
   */
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

  /**
   * Update brand data
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const userID = req.body.userId;

    BrandModel.fetchByID(id)
      .then((brand_result) => {
        const brand = brand_result[0];
        if (brand == null || brand.is_delete) {
          return res.status(400).send("Data tidak ditemukan.");
        }

        BrandModel.updateByID({
          id: id,
          name: name,
          created_by: userID,
        })
          .then((result) => {
            const socket = new SocketHelper("updateBrand", result);
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on updating brand ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on updating brand ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete brand data
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    BrandModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result[0].is_delete) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (!result[0].can_delete) {
          return res.status(400).send(ErrorList["Unable to delete"]);
        }

        BrandModel.deleteByID(id, userID)
          .then((result) => {
            const socket = new SocketHelper("deleteBrand", result);
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on deleting brand ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting brand ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default BrandController;
