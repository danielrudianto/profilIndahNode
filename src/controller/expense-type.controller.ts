import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import { fetchMode } from "../interface/fetch.interface";
import ExpenseModel from "../model/expense.model";
import ExpenseTypeModel from "../model/expense.type.model";

class ExpenseTypeController {
  /**
   * Create new expense type
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;
    ExpenseTypeModel.create({
      name: name,
      description: description,
      parent_id: parent_id,
      created_by: req.body.userId,
    })
      .then((result) => {
        const socket = new SocketHelper("createExpenseType", result);
        socket.create();

        return res.status(201).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch expense type
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    // Create a tree view of expense type
    ExpenseTypeModel.fetch("", 0, 0, fetchMode.All)
      .then((result) => {
        const parentExpenseType = result.filter((x) => x.parent_id == null);
        const childExpenseType = result.filter((x) => x.parent_id != null);
        const expenseType: any[] = [];

        parentExpenseType.forEach((parent) => {
          const children: any[] = [];
          childExpenseType
            .filter((x) => x.parent_id == parent.id)
            .forEach((child) => {
              children.push({
                id: child.id,
                name: child.name,
                description: child.description,
              });
            });
          expenseType.push({
            id: parent.id,
            name: parent.name,
            description: parent.description,
            children: children,
          });
        });

        return res.status(200).send(expenseType);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching expense type: ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch expense by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ExpenseTypeModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (result.parent_id == null) {
          // Get the children
          ExpenseTypeModel.fetchByID(result?.id!)
            .then((children) => {
              return res.status(200).send({
                ...result,
                children: children,
              });
            })
            .catch((error) => {
              console.error(
                `[error]: Error on fetch expense type by id ${error}`
              );
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        }

        ExpenseModel.countByType(result?.id!)
          .then((count) => {
            return res.status(200).send({
              ...result,
              count: count,
            });
          })
          .catch((error) => {
            console.error(
              `[error]: Error on counting expense type by id ${error}`
            );
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchAutocomplete = (req: Request, res: Response) => {
    // const mode = req.query.mode;
    // const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    // if (mode == "child") {
    //   ExpenseTypeModel.fetch(keyword, 5, 0, fetchMode.ChildAutocomplete)?.then(
    //     (result) => {
    //       return res.status(200).send(result);
    //     }
    //   );
    // } else if (mode == "parent") {
    //   ExpenseTypeModel.fetchAutocomplete(
    //     keyword,
    //     5,
    //     0,
    //     fetchMode.ChildAutocomplete
    //   )?.then((result) => {
    //     return res.status(200).send(result);
    //   });
    // }
  };

  static deleteByID = (req: Request, res: Response) => {
    // const id = parseInt(req.params.id);
    // ExpenseTypeModel.fetchById(id)
    //   .then((expense) => {
    //     if (expense == null || expense.is_delete) {
    //       return res.status(404).send("Data pengeluaran tidak ditemukan.");
    //     }
    //     if (expense.parent_id == null) {
    //       ExpenseTypeModel.fetch(expense.id)
    //         .then((children) => {
    //           if (children.length == 0) {
    //             ExpenseTypeModel.delete(expense.id, req.body.userId)
    //               .then((result_delete) => {
    //                 const socket = new SocketHelper(
    //                   "deleteExpenseType",
    //                   result_delete
    //                 );
    //                 socket.create();
    //                 return res.status(201).send(result_delete);
    //               })
    //               .catch((error) => {
    //                 return res.status(500).send(error);
    //               });
    //           } else {
    //             return res.status(500).send(ErrorList["Delete error"]);
    //           }
    //         })
    //         .catch((error) => {
    //           return res.status(500).send(error);
    //         });
    //     } else {
    //       // Data is a child
    //       // Check whether there is still expense data that uses this type
    //       ExpenseModel.countByType(expense.id)
    //         .then((expenses) => {
    //           if (expenses == 0) {
    //             ExpenseTypeModel.delete(expense.id, req.body.userId)
    //               .then((result_delete) => {
    //                 const socket = new SocketHelper(
    //                   "deleteExpenseType",
    //                   result_delete
    //                 );
    //                 socket.create();
    //                 return res.status(201).send(result_delete);
    //               })
    //               .catch((error) => {
    //                 return res.status(500).send(error);
    //               });
    //           } else {
    //             return res.status(500).send(ErrorList["Delete error"]);
    //           }
    //         })
    //         .catch((error) => {
    //           return res.status(500).send(error);
    //         });
    //     }
    //   })
    //   .catch((error) => {
    //     return res.status(500).send(error);
    //   });
  };

  /**
   * Update expense type by ID
   * @param req
   * @param res
   */
  static updateByID = (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const id = req.body.id;

    ExpenseTypeModel.updateByID({
      name: name,
      description: description,
      created_by: req.body.userId,
      id: id,
    })
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
