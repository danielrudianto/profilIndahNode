"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const customer_controller_1 = __importDefault(require("../controller/customer.controller"));
const router = (0, express_1.Router)();
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage("Nama wajib diisi."), (0, express_validator_1.body)("address").not().isEmpty().withMessage("Alamat wajib diisi."), (0, express_validator_1.body)("pic").not().isEmpty().withMessage("PIC wajib diisi."), customer_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage("ID wajib diisi."), (0, express_validator_1.body)("name").not().isEmpty().withMessage("Nama wajib diisi."), (0, express_validator_1.body)("address").not().isEmpty().withMessage("Alamat wajib diisi."), (0, express_validator_1.body)("pic").not().isEmpty().withMessage("PIC wajib diisi."), customer_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").not().isEmpty().withMessage("Data tidak ditemukan."), customer_controller_1.default.delete);
router.get('/detail/:id', (0, express_validator_1.param)("id").not().isEmpty().withMessage("ID konsumen wajib diisi."), customer_controller_1.default.fetchDetailById);
router.get("/autocomplete", customer_controller_1.default.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").not().isEmpty().withMessage("ID konsumen wajib diisi."), customer_controller_1.default.fetchById);
router.get("/", customer_controller_1.default.fetch);
exports.default = router;
