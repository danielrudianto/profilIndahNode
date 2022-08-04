import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import ItemPriceController from "../controller/item_price.controller";
import { io } from "../app";
import LogHelper from "../helper/log.helper";

const prisma = new PrismaClient();
const router = Router();

router.get("/bulk", ItemPriceController.fetchAll);
router.get("/:reference", ItemPriceController.fetchByReference);
router.get("/", ItemPriceController.fetch);

router.post("/bulk", ItemPriceController.createBulk);

router.post("/", (req, res, next) => {
  const item_id = req.body.item_id;
  const discount = req.body.discount;
  const discount_project = req.body.discount_project;
  const price = req.body.price;

  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);

  prisma
    .$transaction([
      prisma.item_price.updateMany({
        where: {
          item_id: item_id,
          effective_date: {
            lte: date,
          },
        },
        data: {
          is_delete: true,
          deleted_by: req.body.userId,
          deleted_at: new Date(),
        },
      }),
      prisma.item_price.create({
        data: {
          item_id: item_id,
          price: price,
          discount: discount,
          discount_project: discount_project,
          effective_date: new Date(req.body.effective_date),
          created_at: new Date(),
          created_by: req.body.userId,
        },
      }),
    ])
    .then(async (result) => {
      const item = await prisma.item.findUnique({
        where: {
          id: result[1].item_id,
        },
        select: {
          id: true,
          reference: true,
          description: true,
          item_brand: {
            select: {
              name: true,
            },
          },
          item_price: {
            select: {
              price: true,
              discount: true,
              discount_project: true,
              created_at: true,
              effective_date: true,
            },
            where: {
              is_delete: false,
              effective_date: {
                lte: date,
              },
            },
            orderBy: [
              {
                effective_date: "desc",
              },
              {
                id: "desc",
              },
            ],
            take: 1,
            skip: 0,
          },
        },
      });

      io.emit("updatePrice", item);
      return res.status(200).send(result[1]);
    })
    .catch((error) => {
      LogHelper.log(new Date(), "error", error, "Item Price - Create", req.body.userId);
      return res.status(500).send(error);
    });
});

export default router;
