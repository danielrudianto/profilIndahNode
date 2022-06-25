import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../helper/socket.connection.helper";
import CompanyModel from "../model/company.model";

class CompanyController {
  static get = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    CompanyModel.fetch(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1],
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
    const id = parseInt(req.params.companyId);
    CompanyModel.fetchById(id).then((company) => {
      if (company == null || company?.is_delete) {
        return res
          .status(404)
          .send("Perusahaan tidak ditemukan atau sudah dihapus.");
      }

      CompanyModel.delete(id, req.body.userId).then((company_result) => {
        CompanyModel.count()?.then((company_count) => {
          io.emit("deleteCompany", {
            name: company_result.name,
            id: company_result.id,
            count: company_count,
          });

          return res.status(201).send(company_result);
        });
      });
    });
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const code_name = req.body.code_name;
    const address = req.body.address;
    const npwp =
      req.body.npwp == null || req.body.toString().length != 15
        ? null
        : req.body.npwp;

    CompanyModel.getByCodeName(code_name)
      .then((result) => {
        // There is another company
        // Using this code name
        if (result.filter((x) => x.id != id).length > 0) {
          return res
            .status(500)
            .send(
              "Kode perusahaan sudah terdaftar, mohon pastikan kode perusahaan unik."
            );
        }

        const company = new CompanyModel(
          name,
          address,
          npwp,
          req.body.userId,
          code_name,
          id
        );
        company
          .update()
          .then((company_result) => {
            io.emit("updateCompany", company_result);

            return res.status(201).send(company_result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static create = (req: Request, res: Response) => {
    const code_name = req.body.code_name;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;

    const company = new CompanyModel(
      name,
      address,
      npwp,
      req.body.userId,
      code_name
    );
    company
      .create()
      .then((result) => {
        CompanyModel.count()
          .then((count) => {
            io.emit("createCompany", {
              data: result,
              count: count,
            });

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

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const transaction = new QueryTransactionHelper();
    transaction
      .create([CompanyModel.fetchById(id), CompanyModel.checkDeleteById(id)])
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

export default CompanyController;
