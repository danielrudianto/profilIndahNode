import { Router } from "express";
import { OverpaymentController } from "../controllers/overpayment.controller";
import { prisma } from "../utils/database.helper";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { validate } from "../utils/validate.helper";
import {
  getOverpaymentSchema,
  createOverpaymentSchema,
  refundReportSchema,
} from "../schemas/overpayment.schema";

const router = Router();

const overpaymentController = new OverpaymentController(
  new OverpaymentRepository(prisma)
);

router.post(
  "/return",
  validate(refundReportSchema),
  overpaymentController.fetchReport
);

router.post(
  "/",
  validate(createOverpaymentSchema),
  overpaymentController.create
);

router.get(
  "/:id",
  validate(getOverpaymentSchema, "params"),
  overpaymentController.fetchByID
);

/*
  Menandai uangnya sudah dikembalikan. PATCH, bukan POST: ini mengubah satu
  ruas pada catatan yang sudah ada, bukan membuat catatan baru.

  Skema parameternya dipakai ulang dari fetchByID — bentuk id-nya sama, dan
  menulis ulang aturan yang sama di dua tempat adalah cara aturan itu
  pelan-pelan berbeda.
*/
router.patch(
  "/:id/resolve",
  validate(getOverpaymentSchema, "params"),
  overpaymentController.resolve
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
