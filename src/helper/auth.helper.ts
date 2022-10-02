import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
        })
        .then((user) => {
          // If user is still active, then proceed
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          }

          req.body.userId = decodedData.id;
          next();
        })
        .catch(() => {
          return res.status(401).send("User not authorized");
        });
    } else {
      return res.status(401).send("User not authorized");
    }
  });
};

export const administratorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
          select: {
            user_department: {
              select: {
                role: true,
              },
            },
            id: true,
            is_active: true,
          },
        })
        .then((user) => {
          // If user is still active, then proceed
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          } else if (user.user_department?.role == 5) {
            next();
          } else {
            return res.status(400).send("Non-administrator user");
          }
        })
        .catch(() => {
          return res.status(400).send("Non-administrator user");
        });
    } else {
      return res.status(400).send("Non-administrator user");
    }
  });
};
