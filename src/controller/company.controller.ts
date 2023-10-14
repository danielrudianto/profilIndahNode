import { Request, Response } from "express";
import CompanyModel from "../model/company.model";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";

class CompanyController {
  /**
   * Create new company
   * Company is a master data to determine which
   * company that user is working on
   * since Profil Indah has 2 separate company
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp =
      req.body.npwp == null
        ? null
        : req.body.npwp.toString().length == 15
        ? req.body.npwp
        : null;
    const userID = req.body.userId;

    CompanyModel.create({
      name: name,
      address: address,
      npwp: npwp,
      created_by: userID,
    })
      .then((result) => {
        const socket = new SocketHelper("createCompany", {
          ...result,
          can_delete: true,
        });
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on creating company: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch companies
   * Fetch companies with keyword, page, and limit
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    CompanyModel.fetch(keyword, limit, offset, fetchMode.Pagination)!
      .then((result) => {
        return res.status(200).send({
          data: (result[0] as any[]).map((x: any) => {
            return {
              ...x,
              can_delete: x.can_delete == "1" ? true : false,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching company: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch company by id
   *  - If company is not found, return 404
   *  - If company is found, return 200
   * @param req
   * @param res
   * @returns
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    CompanyModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        const company = result[0];

        return res.status(200).send({
          id: company.id,
          name: company.name,
          address: company.address,
          npwp: company.npwp,
          is_delete: company.is_delete,
          can_delete: company.can_delete! == "1" ? true : false,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching company ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch companies for autocomplete
   * Fetch companies with keyword, page, and limit
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    CompanyModel.fetch(keyword, 5, 0, fetchMode.Autocomplete)!
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching company: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update company data
   * @param req
   * @param res
   */
  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp =
      req.body.npwp == null || req.body.npwp.toString().length != 15
        ? null
        : req.body.npwp;
    const userID = req.body.userId;

    CompanyModel.updateByID({
      id: id,
      name: name,
      address: address,
      npwp: npwp,
      created_by: userID,
    })
      .then((result) => {
        const socket = new SocketHelper("updateCompany", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on updating company: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete company
   * Delete company by id
   * @param req
   * @param res
   */
  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    CompanyModel.fetchByID(id)
      .then((company) => {
        if (company == null || company.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (company[0].is_delete) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (!company[0].can_delete) {
          return res.status(404).send(ErrorList["Unable to delete"]);
        }

        CompanyModel.deleteByID(id, req.body.userId)
          .then((result) => {
            const socket = new SocketHelper("deleteCompany", {
              name: result.name,
              id: result.id,
            });
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on delete company: ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on delete company: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default CompanyController;
