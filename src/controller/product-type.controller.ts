import { Request, Response } from "express";
import { meili } from "../app";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import ItemTypeModel from "../model/item_type.model";

class ItemTypeController {
  /**
   * Create a new item type
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const user_id = req.body.userID;

    ItemTypeModel.create({
      name: name,
      userID: user_id,
    })
      .then((result) => {
        const socket = new SocketHelper("createItemType", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch item types
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(
          mysql_real_escape_string(req.query.keyword?.toString())
        );
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ItemTypeModel.fetch(keyword, limit, offset, fetchMode.Pagination)!
      .then(([result, count]) => {
        return res.status(200).send({
          data: (result as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              created_at: new Date(x.created_at),
              user_item_type_created_byTouser: {
                name: x.createdByName,
                id: x.created_by,
              },
              can_delete: x.count == 0 ? true : false,
            };
          }),
          count: count,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch item types: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch item type autocomplete
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    ItemTypeModel.fetch(keyword, 5, 0, fetchMode.Autocomplete)!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetch item type autocomplete: ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch item type by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    ItemTypeModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result[0].is_delete == 1) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send({
          ...result[0],
          count: parseInt(result[0].count.toString()),
          can_delete: parseInt(result[0].count.toString()) == 0 ? true : false,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching item type: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update item type by ID
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const userID = req.body.userID;

    ItemTypeModel.updateByID({
      name: name,
      userID: userID,
      id: id,
    })
      .then(async (result) => {
        const socket = new SocketHelper("updateItemType", {
          ...result,
          item: undefined,
        });
        socket.create();

        await queue.add("update-item-type", result);

        return res.status(201).send({
          ...result,
          item: undefined,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching item type: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete item type by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      ItemTypeModel.fetchByID(id)
        .then((result) => {
          if (!result || (result as any[]).length == 0) {
            return res.status(404).send("Data does not exist");
          } else if ((result as any[])[0].is_delete == 1) {
            return res.status(404).send("Data does not exist");
          } else if ((result as any[])[0].count > 0) {
            return res
              .status(400)
              .send(
                "Data cannot be deleted because there are other data depending on this data"
              );
          } else {
            ItemTypeModel.deleteById(id, req.body.userID)
              .then((result) => {
                const socket = new SocketHelper("deleteItemType", result);
                socket.create();
                return res.status(200).send(result);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          }
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };
}

export default ItemTypeController;
