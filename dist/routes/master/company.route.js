"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const company_controller_1 = __importDefault(require("../../controller/company.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const company_repository_1 = require("../../repositories/company.repository");
const database_helper_1 = require("../../helper/database.helper");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.default(new company_repository_1.CompanyRepository(database_helper_1.prisma));
// Route to create a new company
// Method: POST
// Body Parameters:
// - name (string): Name of the company (required)
// - address (string): Address of the company (required)
// Response:
// - 201 Created: Company successfully created
// - 400 Bad Request: Validation error
router.post("/", auth_helper_1.administratorMiddleware, (0, express_validator_1.body)("name").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("address").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, companyController.create);
// Route to fetch company autocomplete suggestions
// Method: GET
// Query Parameters:
// - keyword (string): Search keyword for autocomplete (optional)
// Response:
// - 200 OK: List of matching companies
router.get("/autocomplete", companyController.fetchAutocomplete);
// Route to fetch company details by ID
// Method: GET
// URL Parameters:
// - id (number): ID of the company (required)
// Response:
// - 200 OK: Company details
// - 400 Bad Request: Validation error
router.get("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, companyController.fetchByID);
// Route to fetch all companies
// Method: GET
// Response:
// - 200 OK: List of all companies
router.get("/", companyController.fetch);
// Route to delete a company by ID
// Method: DELETE
// URL Parameters:
// - id (number): ID of the company (required)
// Response:
// - 200 OK: Company successfully deleted
// - 400 Bad Request: Validation error
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, companyController.delete);
// Route to update a company
// Method: PUT
// Body Parameters:
// - name (string): Name of the company (required)
// - address (string): Address of the company (required)
// Response:
// - 200 OK: Company successfully updated
// - 400 Bad Request: Validation error
router.put("/", (0, express_validator_1.body)("name").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("address").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, companyController.update);
exports.default = router;
//# sourceMappingURL=company.route.js.map