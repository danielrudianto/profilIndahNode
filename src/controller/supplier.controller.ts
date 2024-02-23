import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import SupplierModel from "../model/supplier.model";

class SupplierController {
  /**
   * Create a new supplier data
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const userID = req.body.userID;

    SupplierModel.create({
      name: name,
      address: address,
      npwp: npwp,
      created_by: userID,
    })
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

  /**
   * Fetch supplier data by keyword, page, and limit
   * @param req
   * @param res
   */
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

    SupplierModel.fetch(keyword, limit, offset, fetchMode.Pagination)!
      .then((result: any) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching supplier data ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch supplier data autocomplete
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());
    SupplierModel.fetch(keyword, 5, 0, fetchMode.Autocomplete)!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch supplier data by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    SupplierModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching supplier ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update supplier data
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const userID = req.body.userID;

    SupplierModel.update({
      id: id,
      name: name,
      address: address,
      npwp: npwp,
      created_by: userID,
    })
      .then((result) => {
        const socket = new SocketHelper("updateSupplier", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on updating supplier data ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete supplier data by ID
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userID;
    SupplierModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.is_delete) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (!result.can_delete) {
          return res.status(403).send(ErrorList["Delete error"]);
        }

        SupplierModel.deleteByID(id, userID)
          .then((result) => {
            const socket = new SocketHelper("deleteSupplier", result);
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on deleting supplier data ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching supplier ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default SupplierController;
