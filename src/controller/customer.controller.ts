import { Request, Response } from "express";
import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill_code.model";
import CustomerModel from "../model/customer.model";

class CustomerController {
  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(500).send(validation_result.array()[0].msg);
    }

    const name = req.body.name;
    const address = req.body.address;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;

    const customer = new CustomerModel(
      name,
      address,
      npwp,
      pic,
      phone_number,
      req.body.userId
    );
    customer
      .create()
      .then((result) => {
        LogHelper.log(
          new Date(),
          "info",
          `${result.user.name} created customer with the name ${result.name} (ID: ${result.id})`,
          "Customer - Create",
          req.body.userId
        );

        const socket = new SocketHelper("createCustomer", {
          ...result,
          can_delete: true,
        });
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Customer - Create",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(500).send(validation_result.array()[0].msg);
    }

    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;

    const customer = new CustomerModel(
      name,
      address,
      npwp,
      pic,
      phone_number,
      req.body.userId,
      id
    );
    customer
      .update()
      .then((result) => {
        LogHelper.log(
          new Date(),
          "info",
          `${result.user_customer_updated_byTouser?.name} updated customer with the name ${result.name} (ID: ${result.id})`,
          "Customer - Update",
          req.body.userId
        );
        const socket = new SocketHelper("updateCustomer", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Customer - Update",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(500).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id.toString());
    BillModel.countByCustomerId(id).then((count) => {
      if (count == 0) {
        CustomerModel.delete(id, req.body.userId)
          .then((customer) => {
            LogHelper.log(
              new Date(),
              "info",
              `${customer.user_customer_deleted_byTouser?.name} deleted customer with the name ${customer.name} (ID: ${customer.id})`,
              "Customer - Delete",
              req.body.userId
            );

            const socket = new SocketHelper("deleteCustomer", customer);
            socket.create();

            return res.status(201).send(customer);
          })
          .catch((error) => {
            LogHelper.log(
              new Date(),
              "error",
              error,
              "Customer - Delete",
              req.body.userId
            );

            return res.status(500).send(error);
          });
      } else {
        return res
          .status(400)
          .send(
            "Konsumen tidak dapat dihapus karena terdapat bon dengan konsumen tersebut."
          );
      }
    });
  };

  static fetchAutocomplete = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(500).send(validation_result.array()[0].msg);
    }

    const keyword = req.query.keyword!.toString();
    CustomerModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Customer - Fetch autocomplete",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const page: number = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : req.query.keyword?.toString();

    CustomerModel.fetch(keyword, offset, limit)
      .then((result) => {
        BillModel.countByCustomerIds(
          result[0].map((x) => {
            return x.id;
          })
        )
          .then((count) => {
            return res.status(201).send({
              data: result[0].map((item) => {
                return {
                  ...item,
                  can_delete:
                    count.filter((x) => x.customer_id == item.id).length == 0
                      ? true
                      : count.filter((x) => x.customer_id == item.id)[0]
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
              "Customer - Fetch",
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
          "Customer - Fetch",
          req.body.userId
        );

        return res.status(500).send(error);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Customer - Fetch",
          req.body.userId
        );

        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id);
    const transaction = new QueryTransactionHelper();
    transaction
      .create([CustomerModel.fetchById(id), BillModel.countByCustomerId(id)])
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
}

export default CustomerController;
