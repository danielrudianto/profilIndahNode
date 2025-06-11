import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { meili } from "../app";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import CustomerModel from "../model/customer.model";
import { CustomerRepository } from "../repositories/customer.repository";
import {
  translateKeyword,
  translateNPWP,
  translatePage,
  translatePageSize,
} from "../helper/escape.helper";

class CustomerController {
  private customerRepository: CustomerRepository;

  constructor(customerRepository: CustomerRepository) {
    this.customerRepository = customerRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const address = req.body.address;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const npwp = translateNPWP(req.body.npwp);
    const userID = req.body.userId;

    try {
      const result = this.customerRepository.create({
        name: name,
        address: address,
        npwp: npwp,
        pic: pic,
        phone_number: phone_number,
        created_by: userID,
        created_at: new Date(),
      });

      await meili.index("customer").addDocuments([result]);
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating customer: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = translateNPWP(req.body.npwp);
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;

    try {
      const existingCustomer = await this.customerRepository.fetchByID(id);
      if (!existingCustomer) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (existingCustomer.is_delete) {
        return res.status(400).send(ErrorList["Not found"]);
      }

      const result = await this.customerRepository.update({
        id: id,
        name: name,
        address: address,
        npwp: npwp,
        pic: pic,
        phone_number: phone_number,
        created_by: req.body.userId,
        created_at: new Date(),
      });

      await meili.index("customer").updateDocuments([result]);
      const socket = new SocketHelper("updateCustomer", result);
      socket.create();

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching customer: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const existingCustomer = await this.customerRepository.fetchByID(id);
      if (!existingCustomer) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (existingCustomer.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!existingCustomer.can_delete) {
        return res.status(400).send(ErrorList["Delete error"]);
      }

      const customer = await this.customerRepository.delete(id, userID);
      await meili.index("customer").deleteDocument(customer.id!);
      const socket = new SocketHelper("deleteCustomer", customer);
      socket.create();

      return res.status(200).send(customer);
    } catch (error) {
      console.error(`[error]: Error on deleting customer: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const customer = await this.customerRepository.fetchByID(id);
      if (!customer) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(customer);
    } catch (error) {
      console.error(`[error]: Error on fetching customer by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    // const pageSize = Number(process.env.LIMIT!);
    const pageSize = translatePageSize(req.query.pageSize);

    try {
      if (keyword != "") {
        const searchResult = await meili.index("customer").search(keyword, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });

        const ids = searchResult.hits.map((item) => item.id);
        const customer = await this.customerRepository.fetchByIDs(ids);
        return res.status(200).send({
          result: searchResult.hits.map((x) => {
            const index = customer.findIndex((y) => y.id == x.id);
            return index == -1 ? undefined : customer[index];
          }),
          count: searchResult.hits.length,
        });
      } else {
        const result = await this.customerRepository.fetch({
          keyword: keyword,
          page: page,
          pageSize: pageSize,
        });

        return res.status(200).send(result);
      }
    } catch (error) {
      console.error(`[error]: Error on fetching customer data: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result = await this.customerRepository.fetchAutocomplete(keyword);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching customer data: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default CustomerController;
