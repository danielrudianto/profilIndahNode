import { Router } from "express";
import { prisma } from "../utils/database.helper";
import AuditLogController from "../controllers/audit-log.controller";
import { AuditLogRepository } from "../repositories/audit-log.repository";
import { validate } from "../utils/validate.helper";
import { queryAuditLogSchema } from "../schemas/audit-log.schema";

const router = Router();

const auditLogController = new AuditLogController(
  new AuditLogRepository(prisma)
);

/*
  Penjagaannya dipasang di app.ts saat mount, mengikuti seluruh route lain.
  Jejak audit memperlihatkan siapa mengubah apa di seluruh sistem, jadi ia
  memang tidak layak terbuka untuk sembarang pengguna — pembatasan perannya
  ditetapkan di sana.
*/
router.get(
  "/",
  validate(queryAuditLogSchema, "query"),
  auditLogController.fetch
);

export default router;
