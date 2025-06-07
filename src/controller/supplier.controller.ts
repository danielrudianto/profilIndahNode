import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { translateKeyword, translatePage } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import { SupplierRepository } from "../repositories/supplier.repository";

class SupplierController {
  private supplierRepository: SupplierRepository;

  constructor(supplierRepository: SupplierRepository) {
    this.supplierRepository = supplierRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const userID = req.body.userId;

    const supplier = await this.supplierRepository.create({
      name: name,
      address: address,
      npwp: npwp,
      created_by: userID,
      created_at: new Date(),
    });

    const socket = new SocketHelper("createSupplier", supplier);
    socket.create();

    return res.status(201).send(supplier);
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = Number(req.body.id);
      const name = req.body.name;
      const address = req.body.address;
      const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
      const userID = req.body.userId;

      const result = await this.supplierRepository.update({
        id: id,
        name: name,
        address: address,
        npwp: npwp,
        created_by: userID,
        created_at: new Date(),
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating supplier ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const userID = req.body.userId;
    try {
      const supplier = await this.supplierRepository.fetchByID(id);
      if (!supplier) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (supplier.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!supplier.can_delete) {
        return res.status(403).send(ErrorList["Delete error"]);
      }

      const result = await this.supplierRepository.delete(id, userID);

      const socket = new SocketHelper("deleteSupplier", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting supplier data ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const page = translatePage(req.query.page);
      const pageSize = parseInt(process.env.PAGE_SIZE!);

      const result = await this.supplierRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });

      return result;
    } catch (error) {
      console.error(`[error]: Error on fetching supplier data ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const result = await this.supplierRepository.fetchAutocomplete(keyword);
      return result;
    } catch (error) {
      console.error(
        `[error]: Error on fetching autocomplete supplier data ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await this.supplierRepository.fetchByID(id);

      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching supplier ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default SupplierController;
