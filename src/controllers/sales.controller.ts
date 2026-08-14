import { NextFunction, Request, Response } from "express";
import { RedisClientType } from "redis";
import { translateKeyword } from "../utils/escape.helper";

export class SalesmanController {
  redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  createSalesman = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const salesName = req.body.sales;
      if (salesName != null) {
        await this.redisClient.sAdd("salesmanList", salesName);
      }
      next();
    } catch (error) {
      console.error(`[error]: Error during adding a salesman`);
      return res.status(500).send(error);
    }
  };

  deleteSalesman = async (req: Request, res: Response) => {
    const salesName = req.body.name;
    await this.redisClient.sRem("salesmanList", salesName);
    return res.status(200).send({ message: "Salesman deleted successfully" });
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const salesman = await this.redisClient.sMembers("salesmanList");
    const filtered = salesman
      .filter((x) => x.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 5)
      .sort((a, b) => {
        return a.localeCompare(b);
      });
    return res.status(200).send(filtered);
  };

  fetchAll = async (req: Request, res: Response) => {
    const salesman = await this.redisClient.sMembers("salesmanList");
    return res.status(200).send(
      salesman.sort((a, b) => {
        return a.localeCompare(b);
      })
    );
  };
}
