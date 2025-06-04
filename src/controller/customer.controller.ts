import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { meili } from "../app";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import CustomerModel from "../model/customer.model";

class CustomerController {
  static create = async (req: Request, res: Response) => {
    try {
      const name = req.body.name;
      const address = req.body.address;
      const pic = req.body.pic;
      const phone_number = req.body.phone_number;
      const npwp =
        req.body.npwp == null
          ? null
          : req.body.npwp.toString().length == 15 ||
            req.body.npwp.toString().length == 16
          ? req.body.npwp
          : null;
      const userID = req.body.userId;

      const result = await new CustomerModel({
        name: name,
        address: address,
        npwp: npwp,
        pic: pic,
        phone_number: phone_number,
        created_by: userID,
      }).create();
      await meili.index("customer").addDocuments([result]);
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating customer: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  static fetchByID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const customer = await CustomerModel.fetchByID(id);
      if (!customer) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(customer);
    } catch (error) {
      console.error(`[error]: Error on fetching customer by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  static fetch = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword.toString());

    if (keyword != "") {
      meili
        .index("customer")
        .search(keyword, {
          limit: 10,
          offset: 0,
        })
        .then(async (result) => {
          const ids = result.hits.map((item) => item.id);
          const data = (await CustomerModel.fetchByIDs(ids)) as any[];
          return res.status(200).send({
            data: result.hits.map((x) => {
              const dataIndex = data.findIndex((y) => {
                y.id == x.id;
              });

              return {
                id: x.id,
                name: x.name,
                address: x.address,
                npwp: x.npwp,
                pic: x.pic,
                phone_number: x.phone_number,
                can_delete:
                  dataIndex == -1
                    ? false
                    : data[dataIndex].count == "1"
                    ? true
                    : false,
              };
            }),
            count: result.hits.length,
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching customer data on Meilisearch ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      CustomerModel.fetch("", offset, limit, fetchMode.Pagination)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching customer data: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  /**
   * Fetch customer autocomplete
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const keyword = req.query.keyword!.toString();
    CustomerModel.fetch(keyword, 0, 5, fetchMode.Autocomplete)!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching customer data: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update customer
   * @param req
   * @param res
   */
  static update = async (req: Request, res: Response) => {
    try {
      const id = req.body.id;
      const name = req.body.name;
      const address = req.body.address;
      const npwp =
        req.body.npwp == null
          ? null
          : req.body.npwp.toString().length == 15 ||
            req.body.npwp.toString().length == 16
          ? req.body.npwp
          : null;
      const pic = req.body.pic;
      const phone_number = req.body.phone_number;

      const customer = await CustomerModel.fetchByID(id);
      if (!customer || customer.is_delete == true) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      customer.name = name;
      customer.address = address;
      customer.npwp = npwp;
      customer.pic = pic;
      customer.phone_number = phone_number;
      customer.updated_by = req.body.userId;
      customer.updated_at = new Date();

      await customer.update();
      await meili.index("customer").updateDocuments([customer]);
      const socket = new SocketHelper("updateCustomer", customer);
      socket.create();
    } catch (error) {
      console.error(`[error]: Error on updating customer: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Delete customer
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;
    CustomerModel.fetchByID(id).then((result) => {
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!result.can_delete) {
        return res.status(400).send(ErrorList["Delete error"]);
      }

      CustomerModel.delete(id, userID)
        .then(async (customer) => {
          await meili.index("customer").deleteDocument(customer.id);
          const socket = new SocketHelper("deleteCustomer", customer);
          socket.create();

          return res.status(201).send(customer);
        })
        .catch((error) => {
          console.error(`[error]: Error on delete customer: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };
}

export default CustomerController;
