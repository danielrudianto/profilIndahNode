import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import CompanyController from "../controller/company.controller";
import { io } from "../helper/socket.connection.helper";
import CompanyModel from "../model/company.model";

const prisma = new PrismaClient();
const router = Router();

router.post("/", CompanyController.create);
router.get("/autocomplete", CompanyController.getAutocomplete);

router.get("/:id", (req, res, next) => {
  const id = parseInt(req.params.id);
  prisma
    .$transaction([
      prisma.company.findUnique({
        where: {
          id: id,
        },
      }),
      prisma.good_receipt_code.count({
        where: {
          company_id: id,
        },
      }),
    ])
    .then((result) => {
      res.status(200).send({
        ...result[0],
        can_delete: result[1] == 0 ? true : false,
      });
    })
    .catch((error) => {
      res.status(500).send(error);
    });
});

router.get("/", CompanyController.get);
router.delete("/:companyId", CompanyController.delete);
router.put("/", CompanyController.update);

export default router;
