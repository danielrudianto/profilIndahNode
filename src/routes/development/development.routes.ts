import { NextFunction, Request, Response, Router } from "express";
import SearchHelper, { syncMode } from "../../helper/search.helper";
import { ProductService } from "../../services/product.service";
import { ProductRepository } from "../../repositories/product.repository";
import { prisma } from "../../helper/database.helper";
import { ProductUnitRepository } from "../../repositories/product-unit.repository";

const router = Router();

const productService: ProductService = new ProductService(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma)
);

router.post("/create-index", SearchHelper.createIndex);
router.post("/fill-index", productService.fillProductIndex);

router.post(
  "/sync-product-group",
  (req: Request, _, next: NextFunction) => {
    req.body.mode = syncMode.ProductNoSQL;
    next();
  },
  SearchHelper.syncMasterData
);
router.post(
  "/sync-product",
  (req: Request, _, next: NextFunction) => {
    req.body.mode = syncMode.Product;
    next();
  },
  SearchHelper.syncMasterData
);
router.post(
  "/sync-product-minimum-stock",
  (req: Request, _, next: NextFunction) => {
    req.body.mode = syncMode.ProductMinimumStock;
    next();
  },
  SearchHelper.syncMasterData
);
router.post(
  "/sync-package",
  (req: Request, _, next: NextFunction) => {
    req.body.mode = syncMode.Package;
    next();
  },
  SearchHelper.syncMasterData
);
router.post(
  "/sync-customer",
  (req: Request, _, next: NextFunction) => {
    req.body.mode = syncMode.Customer;
    next();
  },
  SearchHelper.syncMasterData
);
router.post("/sync-product-in", SearchHelper.syncProductIn);
router.post("/sync-product-out", SearchHelper.syncProductOut);
router.post(
  "/sync-product-out-calculation",
  SearchHelper.syncProductOutCalculation
);

router.post("/arrange-stock-card", SearchHelper.arrangeStockCard);
router.get("/tasks", SearchHelper.getTasks);

export default router;
