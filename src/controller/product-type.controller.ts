import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import ItemTypeModel from "../model/item_type.model";

class ItemTypeController {
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

    ItemTypeModel.fetchItems(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: (result[0] as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              created_at: new Date(x.created_at),
              user_item_type_created_byTouser: {
                name: x.createdByName,
                id: x.createdBy,
              },
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

  static createItem = (req: Request, res: Response) => {
    const name = req.body.name;
    const user_id = req.body.userId;

    const item_type = new ItemTypeModel(name, user_id);
    item_type
      .create()
      .then((result) => {
        const socket = new SocketHelper("createItemType", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static updateItem = (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const user_id = req.body.userId;

    const item_type = new ItemTypeModel(name, user_id, id);
    item_type
      .update()
      .then((result) => {
        const socket = new SocketHelper("updateItemType", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id.toString());

      ItemTypeModel.fetchItemById(id)
        .then((result) => {
          if (!result || (result as any[]).length == 0) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            const itemType = (result as any[])[0];
            return res.status(200).send({
              ...itemType,
              count: parseInt(itemType.count.toString()),
              can_delete:
                parseInt(itemType.count.toString()) == 0 ? true : false,
            });
          }
        })
        .catch((error) => {
          console.log(error);
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

  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    ItemTypeModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchByBrandId = (req: Request, res: Response) => {
    if (typeof req.body.ids === "string") {
      try {
        const ids = JSON.parse(
          (req.body.ids.toString() as string).replace("'", "").replace('"', "")
        ) as number[];
        ItemTypeModel.fetchByBrandIds(ids)
          .then((result) => {
            return res.status(200).send(result);
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
    } else {
      try {
        const ids = req.body.ids as number[];
        ItemTypeModel.fetchByBrandIds(ids)
          .then((result) => {
            return res.status(200).send(result);
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
    }
  };

  static deleteItem = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      ItemTypeModel.fetchItemById(id)
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
            ItemTypeModel.deleteById(id, req.body.userId)
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
