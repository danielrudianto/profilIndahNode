import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { OverpaymentRepository } from "../repositories/overpayment.repository";

export class OverpaymentController {
  private overpaymentRepository: OverpaymentRepository;

  constructor(overpaymentRepository: OverpaymentRepository) {
    this.overpaymentRepository = overpaymentRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const customer_id = req.body.customer_id;
    const sales_invoice_code_id = req.body.sales_invoice_code_id;
    const userID = req.body.userId;
    const return_date = new Date(req.body.return_date);
    const return_payment_method = req.body.return_payment_method;
    const return_payment_number = req.body.return_payment_number;
    const overpayment = req.body.overpayment;

    try {
      this.overpaymentRepository.create({
        date: date,
        customer_id: customer_id,
        sales_invoice_code_id: sales_invoice_code_id,
        return_date: return_date,
        return_payment_number: return_payment_number,
        return_payment_method: return_payment_method,
        created_at: new Date(),
        created_by: userID,
        overpayment: overpayment.map((x: any) => {
          return {
            payment_method_id: x.payment_method_id,
            amount: x.amount,
          };
        }),
      });
    } catch (error) {
      console.error(`[error]: Error on creating overpayment ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
