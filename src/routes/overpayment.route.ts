import { Router } from "express";
import { OverpaymentController } from "../controllers/overpayment.controller";
import { prisma } from "../utils/database.helper";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { validate } from "../utils/validate.helper";
import {
  ambilKelebihanBayarSchema,
  buatKelebihanBayarSchema,
  laporanPengembalianSchema,
} from "../schemas/overpayment.schema";

const router = Router();

const overpaymentController = new OverpaymentController(
  new OverpaymentRepository(prisma)
);

router.post(
  "/return",
  validate(laporanPengembalianSchema),
  overpaymentController.fetchReport
);

router.post(
  "/",
  validate(buatKelebihanBayarSchema),
  overpaymentController.create
);

router.get(
  "/:id",
  validate(ambilKelebihanBayarSchema, "params"),
  overpaymentController.fetchByID
);

/*
  Tanpa validasi, sama seperti sebelumnya. page dan pageSize diterjemahkan
  controller lewat translatePage/translatePageSize yang sudah punya nilai
  bawaan, dan sortBy/sortDirection tidak pernah diperiksa rantai lama.
  Memasang skema di sini akan menolak permintaan yang selama ini diterima,
  jadi pengetatannya dibahas terpisah.
*/
router.get("/", overpaymentController.fetch);

export default router;
