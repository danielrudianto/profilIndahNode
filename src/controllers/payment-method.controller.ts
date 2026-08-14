import { Request, Response } from "express";
import ErrorList from "../constants/error_list";
import SocketHelper from "../utils/socket.helper";
import { PaymentMethodRepository } from "../repositories/payment-method.repository";
import { translateKeyword, translatePage } from "../utils/escape.helper";

class PaymentMethodController {
  private paymentMethodRepository: PaymentMethodRepository;

  constructor(paymentMethodRepository: PaymentMethodRepository) {
    this.paymentMethodRepository = paymentMethodRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    try {
      const result = await this.paymentMethodRepository.create({
        name: name,
        description: description,
        created_by: userID,
      });

      const socket = new SocketHelper("createPaymentMethod", result);

      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on create payment method: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    try {
      const paymentMethod = await this.paymentMethodRepository.fetchByID(id);
      if (!paymentMethod) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (paymentMethod.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.paymentMethodRepository.update({
        id: id,
        name: name,
        description: description,
        created_by: userID,
        created_at: new Date(),
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on update payment method: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const page = translatePage(req.query.page);
      const pageSize = parseInt(process.env.LIMIT!);

      const result = await this.paymentMethodRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetch payment methods: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result = await this.paymentMethodRepository.fetchAutocomplete(
        keyword
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetch autocomplete payment methods: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.paymentMethodRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetch payment method: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAll = async (req: Request, res: Response) => {
    try {
      const result = await this.paymentMethodRepository.fetchAll();
      return res.status(200).send([
        {
          id: null,
          name: "Cash",
          description: "Cash payment",
          can_delete: false,
        },
        ...result,
      ]);
    } catch (error) {
      console.error(`[error]: Error on fetch all payment methods: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const paymentMethod = await this.paymentMethodRepository.fetchByID(id);
      if (!paymentMethod) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (paymentMethod.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.paymentMethodRepository.delete(id, userID);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on delete payment method: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default PaymentMethodController;
