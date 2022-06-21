import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { io } from "../helper/socket.connection.helper";
import ExpenseTypeModel from "../model/expense.type.model";

class ExpenseController {
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

  static createType = (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    const parent_id = req.body.parent_id;

    const expenseType = new ExpenseTypeModel(name, description, parent_id, req.body.userId);
    expenseType.create().then(result => {
        io.emit("createExpenseType", result);
        return res.status(201).send(result);
    }).catch(error => {
        return res.status(500).send(error);
    })
  }

  static fetchType = (req: Request, res: Response) => {
    const parent_id = (!req.params.parent_id) ? null : parseInt(req.params.parent_id.toString());
    // If parent ID is null, then also calculate children count
    if(parent_id == null){
      const fetch_expenses = ExpenseTypeModel.fetch(parent_id);
      const fetch_expenses_children = ExpenseTypeModel.fetchChild();

      const transaction = new QueryTransactionHelper();
      transaction.create([
        fetch_expenses,
        fetch_expenses_children
      ]).then(result => {
        const expense_type: any[] = [];
        (result[0] as any[]).forEach((item, index) => {
          const id = item.id;
          const name = item.name;
          const description = item.description;

          expense_type.push({
            id: id,
            name: name,
            description: description,
            children: (result[1] as any[]).filter(x => x.parent_id == id)
          });

        })
        
        return res.status(200).send(expense_type);
      }).catch(error => {
        return res.status(500).send(error);
      })
    } else {

    }

    ExpenseTypeModel.fetch(parent_id).then(result => {
        
    }).catch(error => {
        return res.status(500).send(error);
    })
  }
}

export default ExpenseController;
