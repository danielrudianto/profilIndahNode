import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import ExpenseModel from "../model/expense.model";
import ExpenseTypeModel from "../model/expense.type.model";

class ExpenseTypeController {
  static create = (req: Request, res: Response) => {
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
        const socket = new SocketHelper("createExpenseType", result);
        socket.create();
        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const parent_id = !req.params.parent_id
      ? null
      : parseInt(req.params.parent_id.toString());
    const fetch_expenses = ExpenseTypeModel.fetch(parent_id);
    const fetch_expenses_children = ExpenseTypeModel.fetchChild();
    const fetch_expense_count = ExpenseModel.countByTypeGroup();

    Promise.all([fetch_expenses, fetch_expenses_children, fetch_expense_count])
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
        return res.status(500).send(error);
      });

    ExpenseTypeModel.fetch(parent_id)
      .then((result) => {})
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchByID = (req: Request, res: Response) => {
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

  static fetchAutocomplete = (req: Request, res: Response) => {
    const mode = req.query.mode;
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    if (mode == "child") {
      ExpenseTypeModel.fetchAutocomplete(keyword, "child")?.then((result) => {
        return res.status(200).send(result);
      });
    } else if (mode == "parent") {
      ExpenseTypeModel.fetchAutocomplete(keyword, "parent")?.then((result) => {
        return res.status(200).send(result);
      });
    }
  };

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ExpenseTypeModel.fetchById(id)
      .then((expense) => {
        if (expense == null || expense.is_delete) {
          return res.status(404).send("Data pengeluaran tidak ditemukan.");
        }

        if (expense.parent_id == null) {
          ExpenseTypeModel.fetch(expense.id)
            .then((children) => {
              if (children.length == 0) {
                ExpenseTypeModel.delete(expense.id, req.body.userId)
                  .then((result_delete) => {
                    const socket = new SocketHelper(
                      "deleteExpenseType",
                      result_delete
                    );
                    socket.create();

                    return res.status(201).send(result_delete);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res.status(500).send(ErrorList["Delete error"]);
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
                    const socket = new SocketHelper(
                      "deleteExpenseType",
                      result_delete
                    );
                    socket.create();
                    return res.status(201).send(result_delete);
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res.status(500).send(ErrorList["Delete error"]);
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

  static update = (req: Request, res: Response) => {
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
        const socket = new SocketHelper("updateExpenseType", result);
        socket.create();

        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ExpenseTypeController;
