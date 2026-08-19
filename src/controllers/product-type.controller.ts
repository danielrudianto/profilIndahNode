import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import {
  translateKeyword,
  translatePage,
  translatePageSize,
} from "../utils/escape.helper";
import SocketHelper from "../utils/socket.helper";
import { ProductTypeRepository } from "../repositories/product-type.repository";

export class ProductTypeController {
  private productTypeRepository: ProductTypeRepository;

  constructor(productTypeRepository: ProductTypeRepository) {
    this.productTypeRepository = productTypeRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const userID = req.body.userId;

    try {
      /* Nama kembar ditolak — LIGHTING pernah lahir dua kali. */
      const kembar = await this.productTypeRepository.fetchByName(name);
      if (kembar != null) {
        return res
          .status(400)
          .send(ErrorList["Product type unique constraint"]);
      }

      const result = await this.productTypeRepository.create({
        name: name,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("createItemType", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating item type: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const userID = req.body.userId;

    try {
      /* Ganti nama pun tidak boleh menabrak tipe lain yang masih hidup. */
      const kembar = await this.productTypeRepository.fetchByName(name);
      if (kembar != null && kembar.id !== id) {
        return res
          .status(400)
          .send(ErrorList["Product type unique constraint"]);
      }

      const result = await this.productTypeRepository.update({
        name: name,
        created_by: userID,
        created_at: new Date(),
        id: id,
      });

      const socket = new SocketHelper("updateItemType", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating item type: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = Number(req.body.userId);
    try {
      const productType = await this.productTypeRepository.fetchByID(id);
      if (!productType) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (productType.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.productTypeRepository.delete(id, userID);
      const socket = new SocketHelper("deleteItemType", result);
      socket.create();
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching item type by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const pageSize = translatePageSize(req.query.pageSize);

    try {
      const result = await this.productTypeRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching item types: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productTypeRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (result.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching item type by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAll = async (req: Request, res: Response) => {
    try {
      const result = await this.productTypeRepository.fetchAll();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching item types: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result =
        await this.productTypeRepository.fetchAutocomplete(keyword);
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching autocomplete item types: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /* Barang dalam satu tipe — bahan dialog rincian di halaman master. */
  fetchProducts = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const page = translatePage(req.query.page);
      const keyword = translateKeyword(req.query.keyword);
      const mentah = Number(req.query.pageSize);
      /* Hanya ukuran yang ditawarkan UI; selain itu jatuh ke 10. */
      const pageSize = [10, 25, 50].includes(mentah) ? mentah : 10;

      const result = await this.productTypeRepository.fetchProducts(id, {
        page,
        pageSize,
        keyword,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching type products: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
