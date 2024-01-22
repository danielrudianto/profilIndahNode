import { Request, Response } from "express";

class DepositController {
  static create = (req: Request, res: Response) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const discount = req.body.discount;
    const delivery = req.body.delivery;
    const service = req.body.service;

    const uuid = req.body.uuid;
    const payments = req.body.payments;

    
  };

  static fetchByID = (req: Request, res: Response) => {};

  static fetch = (req: Request, res: Response) => {};

  static completeByID = (req: Request, res: Response) => {};

  static deleteByID = (req: Request, res: Response) => {};
}

export default DepositController;
