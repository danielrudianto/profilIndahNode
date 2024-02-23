import { Request, Response } from "express";
import ExpenseModel from "../model/expense.model";
import ExpenseTypeModel from "../model/expense.type.model";
import SocketHelper from "../helper/socket.helper";
import ErrorList from "../assets/error_list";

class ExpenseController {
  /**
   * Create new expense record
   * Expense record is created by user
   * in order to calculate the company's expense
   * and used to calculate the company's profit
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const description = req.body.description;
    const date = new Date(req.body.date);
    const expense_type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    const userID = req.body.userID;

    ExpenseTypeModel.fetchByID(expense_type_id).then((type) => {
      if (!type) {
        return res.status(404).send(ErrorList["Expense type not found"]);
      }

      if (type.is_delete) {
        return res.status(404).send(ErrorList["Expense type not found"]);
      }

      ExpenseModel.create({
        value: value,
        description: description,
        date: date,
        expense_type_id: expense_type_id,
        company_id: company_id,
        created_by: userID,
      })
        .then((result) => {
          const socket = new SocketHelper("createExpense", result);
          socket.create();

          return res.status(201).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on creating expense: ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };

  /**
   * Fetch expense record by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ExpenseModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send("Pengeluaran tidak ditemukan.");
        }

        return res.status(200).send({
          ...result,
          value: parseFloat(result!.value.toString()),
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting expense: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update expense record
   * Expense record is created by user
   * in order to calculate the company's expense
   * and used to calculate the company's profit
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const id = req.body.id;
    const description = req.body.description;
    const date = new Date(req.body.date);
    const type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;
    const userID = req.body.userID;

    ExpenseModel.updateByID({
      id: id,
      value: value,
      description: description,
      date: date,
      expense_type_id: type_id,
      company_id: company_id,
      created_by: userID,
    })
      .then((result) => {
        const socket = new SocketHelper("updateExpense", result);
        socket.create();

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on updating expense: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch expense record by year and month
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    ExpenseModel.fetch(year, month, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching expense: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete expense record by ID
   * @param req
   * @param res
   */
  static deleteByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user_id = req.body.userID;

    ExpenseModel.deleteByID(id, user_id)
      .then((result) => {
        const socket = new SocketHelper("deleteExpense", result);
        socket.create();

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting expense: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch expense
   * @param req
   * @param res
   */
  static fetchDashboard = async (req: Request, res: Response) => {
    const todayDate = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    Promise.all([
      ExpenseModel.fetchTodaySum(
        todayDate.getFullYear(),
        todayDate.getMonth(),
        todayDate.getDate()
      ),
      ExpenseModel.fetchTodaySum(
        yesterdayDate.getFullYear(),
        yesterdayDate.getMonth(),
        yesterdayDate.getDate()
      ),
      ExpenseModel.fetchTodaySum(
        todayDate.getFullYear(),
        todayDate.getMonth() + 1
      ),
      ExpenseModel.fetchTodaySum(todayDate.getFullYear(), todayDate.getMonth()),
    ])
      .then(([expense1, expense2, expense3, expense4]: any[]) => {
        return res.status(200).send({
          today: expense1[0].value == null ? 0 : parseFloat(expense1[0].value),
          yesterday:
            expense2[0].value == null ? 0 : parseFloat(expense2[0].value),
          thisMonth:
            expense3[0].value == null ? 0 : parseFloat(expense3[0].value),
          lastMonth:
            expense4[0].value == null ? 0 : parseFloat(expense4[0].value),
        });
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default ExpenseController;
