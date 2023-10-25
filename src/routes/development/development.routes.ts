import { NextFunction, Request, Response, Router } from "express";
import SearchHelper, { syncMode } from "../../helper/search.helper";

const router = Router();

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

export default router;
