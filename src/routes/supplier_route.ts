import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { purchaseOrderNameHelper } from "../middleware/name_helper";

const prisma = new PrismaClient()
const router = Router();

router.get("/", (req, res, next) => {

})

router.post("/", (req, res, next) => {
    
})