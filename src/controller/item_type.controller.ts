import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import ItemTypeModel from "../model/item_type.model";

class ItemTypeController {
  static fetchItems = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword?.toString();
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ItemTypeModel.fetchItems(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              ...x,
              can_delete: x.item.length == 0,
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
          "ItemTypeController - Fetch Items",
          req.body.userId
        );
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
        LogHelper.log(
          new Date(),
          "error",
          error,
          "ItemTypeController - Submit Item",
          req.body.userId
        );
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
          if (!result) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            return res.status(200).send({
              ...result,
              can_delete: result.item.length == 0,
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
        .then((itemType) => {
          if (itemType == null || itemType.is_delete) {
            return res.status(404).send("Data tidak ditemukan.");
          } else if (itemType?.item.length == 0) {
            // Can delete
            ItemTypeModel.deleteById(id, req.body.userId)
              .then((result) => {
                const socket = new SocketHelper("deleteItemType", result);
                socket.create();

                LogHelper.log(
                  new Date(),
                  "Info",
                  `${result.user_item_type_deleted_byTouser?.name} berhasil menghapus data tipe barang ${result.name} (ID: ${result.id})`,
                  "ItemTypeController - Delete by Id",
                  req.body.userId
                );
                return res.status(200).send(result);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          } else {
            return res
              .status(400)
              .send(
                "Tidak dapat menghapus data. Mohon pastikan tidak ada barang yang menggunakan tipe ini."
              );
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
