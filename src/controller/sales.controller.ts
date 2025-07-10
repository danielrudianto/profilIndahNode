import { NextFunction, Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { RedisClientType } from "redis";

export class SalesmanController {
  redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  createSalesman = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const salesName = req.body.sales;
      await this.redisClient.sAdd("salesmanList", salesName);
      next();
    } catch (error) {
      console.error(`[error]: Error during adding a salesman`)
      return res.status(500).send(error);
    }
  };

  deleteSalesman = async (req: Request, res: Response) => {
    const salesName = req.body.name;
    await this.redisClient.sRem("salesmanList", salesName);
    return res.status(200).send({ message: "Salesman deleted successfully" });
  };

  fetch = async (req: Request, res: Response) => {
    const salesman = await this.redisClient.sMembers("salesmanList");
    return salesman;
  };
}
