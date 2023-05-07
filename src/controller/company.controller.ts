import { Request, Response } from "express";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";

class CompanyController {
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    CompanyModel.fetch(keyword, offset, limit)
      .then((result) => {
        GoodReceiptModel.countByCompanyIds(
          result[0].map((x) => {
            return x.id;
          })
        )
          .then((counts) => {
            return res.status(200).send({
              data: result[0].map((x) => {
                return {
                  ...x,
                  can_delete:
                    counts.filter((count) => count.company_id == x.id).length ==
                    0
                      ? true
                      : counts.filter((count) => count.company_id == x.id)[0]
                          ._count == 0,
                };
              }),
              count: result[1],
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static getAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    CompanyModel.fetchAutocomplete(keyword)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    CompanyModel.fetchById(id)
      .then((company) => {
        if (company == null || company.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else if (company[0].is_delete) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          CompanyModel.delete(id, req.body.userId)
            .then((company_result) => {
              const socket = new SocketHelper("deleteCompany", {
                name: company_result.name,
                id: company_result.id,
              });
              socket.create();

              return res.status(201).send(company_result);
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
    const address = req.body.address;
    const npwp =
      req.body.npwp == null || req.body.toString().length != 15
        ? null
        : req.body.npwp;
    const userID = req.body.userId;

    const company = new CompanyModel(name, address, npwp, userID, id);
    company
      .update()
      .then((result) => {
        const socket = new SocketHelper("updateCompany", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;

    const company = new CompanyModel(name, address, npwp, req.body.userId);
    company
      .create()
      .then((result) => {
        const socket = new SocketHelper("createCompany", {
          ...result,
          can_delete: true,
        });
        socket.create();
        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      CompanyModel.fetchById(id)
        .then((result) => {
          if (result == null || result.length == 0) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            const company = result[0];
            return res.status(200).send({
              id: company.id,
              name: company.name,
              address: company.address,
              npwp: company.npwp,
              is_delete: company.is_delete,
              can_delete: company.count == 0,
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

  static fetchAvailable = (req: Request, res: Response) => {
    CompanyModel.fetchAvailable()
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default CompanyController;
