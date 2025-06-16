import { Request, Response } from "express";
import ErrorList from "../assets/error_list";

export class SalesmanController {
  redisClient: any;

  constructor(redisClient: any) {
    this.redisClient = redisClient;
  }

  createSalesman = async (req: Request, res: Response) => {
    const salesName = req.body.name;
    const exists = await this.redisClient.sismember("salesmanList", salesName);
    if (!exists) {
      await this.redisClient.sadd("salesmanList", salesName);
    } else {
      return res.status(400).send(ErrorList["Salesman already exists"]);
    }
  };

  deleteSalesman = async (req: Request, res: Response) => {
    const salesName = req.body.name;
    const exists = await this.redisClient.sismember("salesmanList", salesName);
    if (exists) {
      await this.redisClient.srem("salesmanList", salesName);
      return res.status(200).send({ message: "Salesman deleted successfully" });
    } else {
      return res.status(400).send(ErrorList["Salesman not found"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const salesman = await this.redisClient.smembers("salesmanList");
    return salesman;
  };
}
