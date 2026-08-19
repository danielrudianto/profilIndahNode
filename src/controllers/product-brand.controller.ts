import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import {
  translateKeyword,
  translatePage,
  translatePageSize,
} from "../utils/escape.helper";
import SocketHelper from "../utils/socket.helper";
import { ProductBrandRepository } from "../repositories/product-brand.repository";

export class ProductBrandController {
  private productBrandRepository: ProductBrandRepository;

  constructor(productBrandRepository: ProductBrandRepository) {
    this.productBrandRepository = productBrandRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const userID = req.body.userId;

    const validation = await this.productBrandRepository.fetchByName(name);
    if (validation != null) {
      return res.status(400).send(ErrorList["Brand unique constraint"]);
    }

    const result = await this.productBrandRepository.create({
      name: name,
      created_by: userID,
      created_at: new Date(),
    });

    const socket = new SocketHelper("createBrand", result);
    socket.create();

    return res.status(201).send(result);
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const userID = req.body.userId;

    try {
      const existingBrand = await this.productBrandRepository.fetchByID(id);
      if (!existingBrand) {
        return res.status(400).send(ErrorList["Not found"]);
      }

      if (existingBrand.is_delete) {
        return res.status(400).send(ErrorList["Not found"]);
      }

      /* Ganti nama pun tidak boleh menabrak merek lain yang masih hidup. */
      const kembar = await this.productBrandRepository.fetchByName(name);
      if (kembar != null && kembar.id !== id) {
        return res.status(400).send(ErrorList["Brand unique constraint"]);
      }

      const result = await this.productBrandRepository.update({
        name: name,
        id: id,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("updateBrand", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating brand ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const existingBrand = await this.productBrandRepository.fetchByID(id);
      if (!existingBrand) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (existingBrand.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!existingBrand.can_delete) {
        return res.status(400).send(ErrorList["Unable to delete"]);
      }

      const result = await this.productBrandRepository.delete(id, userID);
      const socket = new SocketHelper("deleteBrand", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting brand ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result =
        await this.productBrandRepository.fetchAutocomplete(keyword);
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error while fetching autocomplete brands: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.productBrandRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error while fetching brand by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const pageSize = translatePageSize(req.query.pageSize);

    try {
      const result = await this.productBrandRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error while fetching brands: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /* Barang dalam satu merek — bahan dialog rincian di halaman master. */
  fetchProducts = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const page = translatePage(req.query.page);
      const keyword = translateKeyword(req.query.keyword);
      const mentah = Number(req.query.pageSize);
      /* Hanya ukuran yang ditawarkan UI; selain itu jatuh ke 10. */
      const pageSize = [10, 25, 50].includes(mentah) ? mentah : 10;

      const result = await this.productBrandRepository.fetchProducts(id, {
        page,
        pageSize,
        keyword,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching brand products: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
