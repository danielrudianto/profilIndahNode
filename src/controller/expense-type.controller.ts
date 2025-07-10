import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { translateKeyword } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import ExpenseTypeModel from "../model/expense.type.model";
import { ExpenseTypeRepository } from "../repositories/expense-type.repository";

class ExpenseTypeController {
  private expenseTypeRepository: ExpenseTypeRepository;

  constructor(expenseTypeRepository: ExpenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;
    const userID = req.body.userId;

    try {
      const result = await this.expenseTypeRepository.create({
        name: name,
        description: description,
        parent_id: parent_id,
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
        parent_id: null,
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

      if (expenseType.parent_id == null) {
        const children = await this.expenseTypeRepository.countByParentID(
          expenseType.id!
        );

        if (children > 0) {
          return res.status(400).send(ErrorList["Expense type has child"]);
        }
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

  fetchChildAutocomplete = async (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // const keyword = translateKeyword(req.query.keyword);
    // try {
    //   const result = await this.expenseTypeRepository.fetchChildAutocomplete(
    //     id,
    //     keyword
    //   );
    //   return res.status(200).send(result);
    // } catch (error) {
    //   console.error(`[error]: Error on fetching child autocomplete: ${error}`);
    //   return res.status(500).send(ErrorList["Internal server error"]);
    // }
  };

  fetchParentAutocopmlete = async (req: Request, res: Response) => {
    // const keyword = translateKeyword(req.query.keyword);
    // try {
    //   const result = await this.expenseTypeRepository.fetchParentAutocomplete(
    //     keyword
    //   );
    //   return res.status(200).send(result);
    // } catch (error) {
    //   console.error(`[error]: Error on fetching parent autocomplete: ${error}`);
    //   return res.status(500).send(ErrorList["Internal server error"]);
    // }
  };

  /**
   * Fetch expense type
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    // ExpenseTypeModel.fetch("", 0, 0, fetchMode.All).then((result) => {
    //   const parentExpenseType = result.filter((x) => x.parent_id == null);
    //   const childExpenseType = result.filter((x) => x.parent_id != null);
    //   const expenseType: any[] = [];
    //   parentExpenseType.forEach((parent) => {
    //     const children: any[] = [];
    //     childExpenseType
    //       .filter((x) => x.parent_id == parent.id)
    //       .forEach((child) => {
    //         children.push({
    //           id: child.id,
    //           name: child.name,
    //           description: child.description,
    //         });
    //       });
    //     expenseType.push({
    //       id: parent.id,
    //       name: parent.name,
    //       description: parent.description,
    //       children: children,
    //     });
    //   });
    // });
  };

  /**
   * Fetch expense type children
   * @param req
   * @param res
   */
  static fetchChildren = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // ExpenseTypeModel.fetch("", 0, 0, fetchMode.ChildByParentID, id)
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetching expense type children :${error}`
    //     );
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  /**
   * Fetch expense type autocomplete
   * @param req
   * @param res
   */
  static fetchAutocomplete = (req: Request, res: Response) => {
    // const mode = req.query.mode;
    // const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    // if (mode == "parent") {
    //   ExpenseTypeModel.fetch(keyword, 5, 0, fetchMode.ParentAutocomplete)
    //     ?.then((result) => {
    //       return res.status(200).send(result);
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on fetching autocomplete ${error}`);
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // } else {
    //   ExpenseTypeModel.fetch(keyword, 5, 0, fetchMode.ChildAutocomplete)
    //     ?.then((result) => {
    //       return res.status(200).send(result);
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on fetching autocomplete ${error}`);
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // }
  };
}

export default ExpenseTypeController;
