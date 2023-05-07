import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

class ErrorHelper {
  static intercept = (req: Request, res: Response, next: NextFunction) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    } else {
      next();
    }
  };
}

export default ErrorHelper;
