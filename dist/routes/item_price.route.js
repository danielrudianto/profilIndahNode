"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const item_price_controller_1 = __importDefault(require("../controller/item_price.controller"));
const app_1 = require("../app");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
router.get("/bulk", item_price_controller_1.default.fetchAll);
router.get("/:reference", item_price_controller_1.default.fetchByReference);
router.get("/", item_price_controller_1.default.fetch);
router.post("/bulk", item_price_controller_1.default.createBulk);
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
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        const item = yield prisma.item.findUnique({
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
        app_1.io.emit("updatePrice", item);
        return res.status(200).send(result[1]);
    }))
        .catch((error) => {
        console.log(error);
        return res.status(500).send(error);
    });
});
exports.default = router;
