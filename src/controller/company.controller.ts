import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { CompanyRepository } from "../repositories/company.repository";
import { translateKeyword, translatePage } from "../helper/escape.helper";

class CompanyController {
  private companyRepository: CompanyRepository;

  constructor(companyRepository: CompanyRepository) {
    this.companyRepository = companyRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp =
      req.body.npwp == null
        ? null
        : req.body.npwp.toString().length == 15 ||
          req.body.npwp.toString().length == 16
        ? req.body.npwp
        : null;
    const userID = req.body.userId;

    try {
      const company = await this.companyRepository.create({
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("createCompany", company);
      socket.create();

      return res.status(201).send(company);
    } catch (error) {
      console.error(`[error]: Error on creating company: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp =
      req.body.npwp == null ||
      req.body.npwp.toString().length != 15 ||
      req.body.npwp.toString().length != 16
        ? null
        : req.body.npwp;
    const userID = req.body.userId;

    try {
      const result = await this.companyRepository.update({
        id: id,
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("updateCompany", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating company: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;
    try {
      const company = await this.companyRepository.fetchByID(id);
      if (!company) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (company.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!company.can_delete) {
        return res.status(404).send(ErrorList["Unable to delete"]);
      }

      const result = await this.companyRepository.delete(id, userID);
      const socket = new SocketHelper("deleteCompany", result);
      socket.create();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting company: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    const pageSize = Number(process.env.LIMIT!);

    try {
      const data = await this.companyRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });

      return res.status(200).send(data);
    } catch (error) {
      console.error(`[error]: Error on fetching company: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const companies = this.companyRepository.fetchAutocomplete(keyword);
      if (!companies) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(companies);
    } catch (error) {
      console.error(
        `[error]: Error on fetching company autocomplete: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAll = async (req: Request, res: Response) => {
    try {
      const companies = await this.companyRepository.fetchAll();
      return res.status(200).send(companies);
    } catch (error) {
      console.error(`[error]: Error on fetching all companies: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const company = await this.companyRepository.fetchByID(id);
    if (!company) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (company.is_delete) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    return res.status(200).send(company);
  };
}

export default CompanyController;
