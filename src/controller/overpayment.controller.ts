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
    const sales_deposit_code_id = req.body.sales_deposit_code_id;
    const userID = req.body.userId;
    const return_payment_date = new Date(req.body.return_payment_date);
    const return_payment_method = req.body.return_payment_method;
    const return_payment_number = req.body.return_payment_number;
    const return_payment_name = req.body.return_payment_name;
    const return_payment_bank = req.body.return_payment_bank;
    const value = req.body.value;

    try {
      this.overpaymentRepository.create({
        date: date,
        customer_id: customer_id,
        sales_deposit_code_id: sales_deposit_code_id,
        return_payment_date: return_payment_date,
        return_payment_method: return_payment_method,
        return_payment_name: return_payment_name,
        return_payment_bank: return_payment_bank,
        return_payment_number: return_payment_number,
        created_at: new Date(),
        created_by: userID,
        value: value,
      });
    } catch (error) {
      console.error(`[error]: Error on creating overpayment ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
