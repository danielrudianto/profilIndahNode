import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../app";
import ExpenseModel from "../model/expense.model";
import ExpenseTypeModel from "../model/expense.type.model";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import { validationResult } from "express-validator";

class ExpenseController {
  static create = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

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
          io.emit("createExpense", result);
          return res.status(201).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    });
  };

  static update = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

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
        io.emit("updateExpense", result);
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    const page = !req.query.page
      ? 1
      : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    const expense = ExpenseModel.fetch(year, month, offset, limit);
    const count = ExpenseModel.count(year, month);
    const transaction = new QueryTransactionHelper();
    transaction
      .create([expense, count])
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

  static parentAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    ExpenseTypeModel.fetchAutocomplete(keyword, null)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static itemAutocomplete = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    ExpenseTypeModel.fetchItemAutocomplete(keyword)
      .then((result) => {
        const response: any[] = [];
        result.forEach((item) => {
          response.push({
            id: item.id,
            name: `${item.expense_type?.name}/${item.name}`,
            description: item.description,
          });
        });
        return res.status(200).send(response);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static createType = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;

    const expenseType = new ExpenseTypeModel(
      name,
      description,
      parent_id,
      req.body.userId
    );
    expenseType
      .create()
      .then((result) => {
        io.emit("createExpenseType", result);
        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static updateType = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const name = req.body.name;
    const description = req.body.description;
    const id = req.body.id;

    const expense_type = new ExpenseTypeModel(
      name,
      description,
      null,
      req.body.userId,
      id
    );
    expense_type
      .update()
      .then((result) => {
        io.emit("updateExpenseType", result);
        return res.status(200).send(result);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Expense Type - Update",
          req.body.userId
        );
        return res.status(500).send(error);
      });
  };

  static deleteType = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id);
    ExpenseTypeModel.fetchById(id)
      .then((expense) => {
        if (expense == null || expense.is_delete) {
          return res.status(404).send("Data pengeluaran tidak ditemukan.");
        }

        if (expense.parent_id == null) {
          // Data is a parent
          // Check whether there is still class that uses that parent
          ExpenseTypeModel.fetch(expense.id)
            .then((children) => {
              if (children.length == 0) {
                ExpenseTypeModel.delete(expense.id, req.body.userId)
                  .then((result_delete) => {
                    io.emit("deleteExpenseType", result_delete);
                    return res.status(201).send(result_delete);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res
                  .status(500)
                  .send(
                    "Data tidak dapat dihapus karena ada jenis pengeluaran yang menggunakan data ini."
                  );
              }
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        } else {
          // Data is a child
          // Check whether there is still expense data that uses this type
          ExpenseModel.countByType(expense.id)
            .then((expenses) => {
              if (expenses == 0) {
                ExpenseTypeModel.delete(expense.id, req.body.userId)
                  .then((result_delete) => {
                    io.emit("deleteExpenseType", result_delete);
                    return res.status(201).send(result_delete);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res
                  .status(500)
                  .send(
                    "Data tidak dapat dihapus karena ada pengeluaran yang menggunakan data ini."
                  );
              }
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchType = (req: Request, res: Response) => {
    const parent_id = !req.params.parent_id
      ? null
      : parseInt(req.params.parent_id.toString());
    const fetch_expenses = ExpenseTypeModel.fetch(parent_id);
    const fetch_expenses_children = ExpenseTypeModel.fetchChild();
    const fetch_expense_count = ExpenseModel.countByTypeGroup();

    const transaction = new QueryTransactionHelper();
    transaction
      .create([fetch_expenses, fetch_expenses_children, fetch_expense_count])
      .then((result) => {
        const expense_type: any[] = [];
        (result[0] as any[]).forEach((item, index) => {
          const id = item.id;
          const name = item.name;
          const description = item.description;
          const parent_id = item.parent_id;

          const children: any[] = [];
          (result[1] as any[])
            .filter((x) => x.parent_id == id)
            .forEach((child) => {
              child.count =
                result[2].filter((x: any) => x.expense_type_id == child.id)
                  .length == 0
                  ? 0
                  : result[2].filter(
                      (x: any) => x.expense_type_id == child.id
                    )[0]._count;
              children.push({
                id: child.id,
                name: child.name,
                description: child.description,
                count: child.count,
              });
            });

          expense_type.push({
            id: id,
            name: name,
            description: description,
            children: children,
          });
        });

        return res.status(200).send(expense_type);
      })
      .catch((error) => {
        LogHelper.log(
          new Date(),
          "error",
          error,
          "Expense Type - Fetch",
          req.body.userId
        );
        return res.status(500).send(error);
      });

    ExpenseTypeModel.fetch(parent_id)
      .then((result) => {})
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchTypeById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    const id = parseInt(req.params.id);
    ExpenseTypeModel.fetchById(id)
      .then((result) => {
        if (result?.parent_id == null) {
          // Get the children
          ExpenseTypeModel.fetch(result?.id!)
            .then((children) => {
              return res.status(200).send({
                ...result,
                children: children,
              });
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        } else {
          ExpenseModel.countByType(result?.id!)
            .then((count) => {
              return res.status(200).send({
                ...result,
                count: count,
              });
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

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
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

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
