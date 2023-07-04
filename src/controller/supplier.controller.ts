import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import SupplierModel from "../model/supplier.model";

class SupplierController {
  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;

    const supplier = new SupplierModel(
      name,
      address,
      npwp,
      null,
      req.body.userId
    );

    supplier
      .create()
      .then((supplier_result) => {
        const socket = new SocketHelper("createSupplier", supplier_result);
        socket.create();

        return res.status(201).send({
          ...supplier_result,
          can_delete: true,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;

    const supplier = new SupplierModel(name, address, npwp, id);
    supplier
      .update()
      .then((supplier_result) => {
        const socket = new SocketHelper("updateSupplier", supplier_result);
        socket.create();

        return res.status(201).send(supplier_result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(
          mysql_real_escape_string(req.query.keyword.toString())
        );
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    SupplierModel.fetch(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: (result[0] as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              address: x.address,
              npwp: x.npwp,
              created_by: x.created_by,
              created_at: new Date(x.created_at),
              can_delete: x.count == 0 ? true : false,
              user: {
                name: x.created_by_name,
              },
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userId;
    SupplierModel.fetchById(id).then((result) => {
      if (result == null || result.length == 0) {
        return res.status(404).send(ErrorList["Not found"]);
      } else if (result[0].count > 0) {
        return res.status(400).send(ErrorList["Delete error"]);
      } else {
        SupplierModel.deleteById(id, req.body.UserID).then((supplier) => {
          const socket = new SocketHelper("deleteSupplier", supplier);
          socket.create();

          return res.status(201).send(supplier);
        });
      }
    });
  };

  static getAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());
    SupplierModel.getAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    SupplierModel.fetchById(id)
      .then((result) => {
        if (result == null || result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          return res.status(200).send({
            ...result[0],
            count: parseInt(result[0].count),
          });
        }
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
      });
  };
}

export default SupplierController;
