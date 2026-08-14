import { Router } from "express";
import DraftBillController from "../controllers/draft-bill.controller";
import { prisma } from "../utils/database.helper";
import { DraftBillRepository } from "../repositories/draft-bill.repository";
import { validate } from "../utils/validate.helper";
import {
  createDraftBillSchema,
  deleteDraftBillSchema,
  confirmDraftBillSchema,
} from "../schemas/draft-bill.schema";

const router = Router();

const draftBillController = new DraftBillController(
  new DraftBillRepository(prisma)
);

/*
  authMiddleware pada app.use("/draft-bill", ...) berjalan lebih dulu dan
  menulis userId ke req.body. validate() sengaja tidak mengganti isi req.body
  dengan hasil parse, jadi nilai itu tetap sampai ke controller.
*/
router.post(
  "/confirm",
  validate(confirmDraftBillSchema),
  draftBillController.confirmByID
);

router.post(
  "/delete",
  validate(deleteDraftBillSchema),
  draftBillController.deleteByID
);

router.post("/", validate(createDraftBillSchema), draftBillController.create);

router.get("/archives", draftBillController.fetchArchives);
// router.get(
//   "/unconfirmed",
//   (req: Request, _, next: NextFunction) => {
//     req.body.mode = fetchMode.Unconfirmed;
//     next();
//   },
//   DraftBillController.fetch
// );
router.get("/name/:name", draftBillController.fetchByName);
/*
  GET /:id dihapus. Handler-nya hanya berisi kode yang dikomentari, jadi
  permintaan tidak pernah dibalas.
*/
// router.get(
//   "/",
//   (req: Request, _, next: NextFunction) => {
//     req.body.mode = fetchMode.Pagination;
//     next();
//   },
//   DraftBillController.fetch
// );

export default router;
