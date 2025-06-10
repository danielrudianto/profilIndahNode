import { Request, Response } from "express";
import ExpenseTypeModel from "../model/expense.type.model";
import SocketHelper from "../helper/socket.helper";
import ErrorList from "../assets/error_list";
import { ExpenseRepository } from "../repositories/expense.repository";
import { translatePage } from "../helper/escape.helper";

class ExpenseController {
  private expenseRepository: ExpenseRepository;

  constructor(expenseRepository: ExpenseRepository) {
    this.expenseRepository = expenseRepository;
  }

  create = async (req: Request, res: Response) => {
    const description = req.body.description;
    const date = new Date(req.body.date);
    const expenseTypeID = req.body.expense_type_id;
    const value = req.body.value;
    const companyID = req.body.company_id;
    const userID = req.body.userId;

    try {
      const result = await this.expenseRepository.create({
        description: description,
        date: date,
        expense_type_id: expenseTypeID,
        value: value,
        company_id: companyID,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("createExpense", result);
      socket.create();

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating expense: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const description = req.body.description;
    const expenseTypeID = req.body.expense_type_id;
    const value = req.body.value;
    const companyID = req.body.company_id;
    const userID = req.body.userId;
    const date = new Date(req.body.date);

    try {
      const result = await this.expenseRepository.update({
        id: id,
        description: description,
        date: date,
        expense_type_id: expenseTypeID,
        value: value,
        company_id: companyID,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("updateExpense", result);
      socket.create();

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating expense: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const result = await this.expenseRepository.delete(id, userID);
      const socket = new SocketHelper("deleteExpense", result);
      socket.create();

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting expense: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT);

    const result = await this.expenseRepository.fetch({
      year: year,
      month: month,
      page: page,
      pageSize: pageSize,
    });

    return result;
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.expenseRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching expense by ID: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchSummary = async (req: Request, res: Response) => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    const startYesterday = new Date();
    startYesterday.setDate(startYesterday.getDate() - 1);
    startYesterday.setHours(0, 0, 0, 0);

    const endYesterday = new Date();
    endYesterday.setDate(endYesterday.getDate() - 1);
    endYesterday.setHours(23, 59, 59, 999);

    const startThisMonth = new Date(
      startToday.getFullYear(),
      startToday.getMonth(),
      1,
      0,
      0,
      0,
      0
    );

    const endThisMonth = new Date(
      startToday.getFullYear(),
      startToday.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const startLastMonth = new Date(
      startToday.getFullYear(),
      startToday.getMonth() - 1,
      1,
      0,
      0,
      0,
      0
    );

    const endLastMonth = new Date(
      startToday.getFullYear(),
      startToday.getMonth(),
      0,
      23,
      59,
      59,
      999
    );

    try {
      const [todaySum, yesterdaySum, thisMonthSum, lastMonthSum] =
        await Promise.all([
          this.expenseRepository.fetchSum(startToday, endToday),
          this.expenseRepository.fetchSum(startYesterday, endYesterday),
          this.expenseRepository.fetchSum(startThisMonth, endThisMonth),
          this.expenseRepository.fetchSum(startLastMonth, endLastMonth),
        ]);

      return res.status(200).send({
        today: todaySum,
        yesterday: yesterdaySum,
        thisMonth: thisMonthSum,
        lastMonth: lastMonthSum,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching expense summary: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default ExpenseController;
