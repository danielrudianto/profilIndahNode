import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { translateKeyword } from "../utils/escape.helper";
import SocketHelper from "../utils/socket.helper";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";

class ExpenseTypeController {
  private expenseTypeRepository: ExpenseTypeRepository;

  constructor(expenseTypeRepository: ExpenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    try {
      const result = await this.expenseTypeRepository.create({
        name: name,
        description: description,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("createExpenseType", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating expense type: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const name = req.body.name;
    const description = req.body.description;
    const userID = req.body.userId;

    try {
      const result = await this.expenseTypeRepository.update({
        name: name,
        description: description,
        id: id,
        created_by: userID,
        created_at: new Date(),
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating expense type: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const expenseType = await this.expenseTypeRepository.fetchByID(id);
      if (!expenseType) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.expenseTypeRepository.delete(id, userID);
      const socket = new SocketHelper("deleteExpenseType", result);
      socket.create();
      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting expense type: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    try {
      const result = await this.expenseTypeRepository.fetch();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching expense types: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAutocomplete = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    try {
      const result = await this.expenseTypeRepository.fetchAutocomplete(
        keyword
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching expense type autocomplete: ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.expenseTypeRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching expense type by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default ExpenseTypeController;
