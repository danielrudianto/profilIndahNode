import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";
import CompanyController from "../../controller/company.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import { CompanyRepository } from "../../repositories/company.repository";
import { prisma } from "../../app";

const router = Router();

const companyController = new CompanyController(new CompanyRepository(prisma));

// Route to create a new company
// Method: POST
// Body Parameters:
// - name (string): Name of the company (required)
// - address (string): Address of the company (required)
// Response:
// - 201 Created: Company successfully created
// - 400 Bad Request: Validation error
router.post(
  "/",
  administratorMiddleware,
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.create
);

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
router.get(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.fetchByID
);

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
router.delete(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.delete
);

// Route to update a company
// Method: PUT
// Body Parameters:
// - name (string): Name of the company (required)
// - address (string): Address of the company (required)
// Response:
// - 200 OK: Company successfully updated
// - 400 Bad Request: Validation error
router.put(
  "/",
  body("name").exists().withMessage(ErrorList["Parameter error"]),
  body("address").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  companyController.update
);

export default router;
