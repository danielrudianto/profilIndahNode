import { Router } from "express";
import { OverpaymentController } from "../../controller/overpayment.controller";
import { prisma } from "../../helper/database.helper";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";

const router = Router();

const overpaymentContorller = new OverpaymentController(
  new OverpaymentRepository(prisma)
);

router.post("/", overpaymentContorller.create);

export default router;
