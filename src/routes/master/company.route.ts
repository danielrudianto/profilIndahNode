import { Router } from "express";
import CompanyController from "../../controllers/company.controller";
import { administratorMiddleware } from "../../utils/auth.helper";
import { CompanyRepository } from "../../repositories/company.repository";
import { prisma } from "../../utils/database.helper";
import { validate } from "../../utils/validate.helper";
import {
  buatPerusahaanSchema,
  paramPerusahaanSchema,
  ubahPerusahaanSchema,
} from "../../schemas/master.schema";

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
  validate(buatPerusahaanSchema),
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
  validate(paramPerusahaanSchema, "params"),
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
  validate(paramPerusahaanSchema, "params"),
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
router.put("/", validate(ubahPerusahaanSchema), companyController.update);

export default router;
