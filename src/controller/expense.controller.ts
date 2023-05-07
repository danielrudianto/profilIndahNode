import { Request, Response } from "express";
import ExpenseModel from "../model/expense.model";
import ExpenseTypeModel from "../model/expense.type.model";
import SocketHelper from "../helper/socket.helper";

class ExpenseController {
  static create = (req: Request, res: Response) => {
    const description = req.body.description;
    const date = new Date(req.body.date);
    const expense_type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;

    ExpenseTypeModel.fetchById(expense_type_id).then((type) => {
      if (type == null || type.is_delete) {
        return res.status(404).send("Tipe pengeluaran tidak ditemukan.");
      }

      const expense = new ExpenseModel(
        value,
        description,
        date,
        expense_type_id,
        company_id,
        req.body.userId
      );
      expense
        .create()
        .then((result) => {
          const socket = new SocketHelper("createExpense", result);
          socket.create();
          return res.status(201).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    });
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    const description = req.body.description;
    const date = new Date(req.body.date);
    const type_id = req.body.expense_type_id;
    const value = req.body.value;
    const company_id = req.body.company_id;

    const expense = new ExpenseModel(
      value,
      description,
      date,
      type_id,
      company_id,
      req.body.userId,
      id
    );
    expense
      .update()
      .then((result) => {
        const socket = new SocketHelper("updateExpense", result);
        socket.create();

        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    Promise.all([
      ExpenseModel.fetch(year, month, offset, limit),
      ExpenseModel.count(year, month),
    ])
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

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ExpenseModel.fetchById(id)
      .then((result) => {
        if (result == null) {
          return res.status(404).send("Pengeluaran tidak ditemukan.");
        } else {
          return res.status(200).send({
            ...result,
            value: parseFloat(result!.value.toString()),
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static deleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user_id = req.body.userId;

    ExpenseModel.deleteById(id, user_id)
      .then((result) => {
        const socket = new SocketHelper("deleteExpense", result);
        socket.create();

        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ExpenseController;
