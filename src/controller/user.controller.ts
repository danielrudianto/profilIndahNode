import { hash } from "bcryptjs";
import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import CustomerModel from "../model/customer.model";
import { UserModel } from "../model/user.model";
import { redisClient } from "../app";
import { UserRepository } from "../repositories/user.repository";
import { UserRoleModel } from "../model/user_role.model";
import { translateKeyword, translatePage } from "../helper/escape.helper";

class UserController {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async create(req: Request, res: Response) {
    try {
      const username = req.body.username;
      const name = req.body.name;
      const nik = req.body.nik;
      const roleID = Number(req.body.role);

      const checkResult = await this.userRepository.check(username, nik);

      if (checkResult == 1) {
        return res.status(404).send(ErrorList["User already exist"]);
      }

      const generated_password = await this.generatePassword();
      const hashedPassword = await this.hashPassword(generated_password);

      const data = {
        name: name,
        username: username,
        nik: nik,
        created_by: req.body.userId,
        roleID: Number(req.body.role),
        user_sales: req.body.user_sales,
        is_active: true,
        password: hashedPassword,
      };

      const validationErrors = this.userRepository.validateCreate(data);
      if (this.userRepository.validateCreate(data).length > 0) {
        return res.status(400).send(validationErrors[0]);
      }

      const user = await this.userRepository.create(data);

      const result = {
        id: user.id,
        name: user.name,
        nik: user.nik,
        username: user.username,
        password: generated_password,
        role_id: roleID,
        role: UserRoleModel.fromRoleID(roleID),
        // user: user.user,
      };

      const socket = new SocketHelper("createUser", result);
      socket.create();

      await redisClient.set(
        `user:${user.id}`,
        JSON.stringify({
          ...result,
          pasword: undefined,
        })
      );

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating user ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  }

  async fetchByID(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const user = await this.userRepository.fetchByID(id);
      if (!user) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(user);
    } catch (error) {
      console.error(`[error]: Error on fetching user by ID ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  }

  async fetch(req: Request, res: Response) {
    try {
      const page = translatePage(req.query.page);
      const keyword = translateKeyword(req.query.keyword);
      const pageSize = Number(process.env.LIMIT!);

      const result = await this.userRepository.fetch({
        page: page,
        keyword: keyword,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching users ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  }

  private async generatePassword(): Promise<string> {
    let password = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 8; i++) {
      password +=
        characters[Math.floor(Math.random() * (characters.length - 1))];
    }

    return password;
  }

  private async hashPassword(password: string): Promise<string> {
    return await hash(password, 12);
  }

  static fetchStats = (req: Request, res: Response) => {
    const id = req.body.userId;
    Promise.all([
      BillModel.fetchSalesByUserID(id),
      CustomerModel.fetchBySales(id),
    ]).then((result) => {
      const customers = result[1];

      const value =
        result[0] == null || result[0].length == 0 ? 0 : result[0][0].value;
      const discount =
        result[0] == null || result[0].length == 0 ? 0 : result[0][0].discount;
      const delivery =
        result[0] == null || result[0].length == 0 ? 0 : result[0][0].delivery;
      const service =
        result[0] == null || result[0].length == 0 ? 0 : result[0][0].service;

      var totalSales = value + delivery + service - discount;

      const achivements = [
        {
          name: "Ordinary sales",
          shortName: "OrdinarySales",
          description: "Sales value is more than 10.000.000 IDR",
          value: totalSales > 10000000 ? 10000000 : totalSales,
          target: 10000000,
          achieved: totalSales > 10000000,
        },
        {
          name: "Extraordinary sales",
          shortName: "ExtraordinarySales",
          description: "Sales value is more than 100.000.000 IDR",
          value: totalSales > 100000000 ? 100000000 : totalSales,
          target: 100000000,
          achieved: totalSales > 100000000,
        },
        {
          name: "Super sales",
          shortName: "SuperSales",
          description: "Sales value is more than 1.000.000.000 IDR",
          value: totalSales >= 1000000000 ? 1000000000 : totalSales,
          target: 1000000000,
          achieved: totalSales > 1000000000,
        },
        {
          name: "Mega sales",
          shortName: "MegaSales",
          description: "Sales value is more than 10.000.000.000 IDR",
          value: totalSales >= 10000000000 ? 10000000000 : totalSales,
          target: 10000000000,
          achieved: totalSales > 10000000000,
        },
        {
          name: "Junior customer hunter",
          shortName: "JuniorCustomerHunter",
          description: "Acquired new customer",
          value: customers >= 1 ? 1 : customers,
          target: 1,
          achieved: customers >= 1,
        },
        {
          name: "Customer hunter",
          shortName: "CustomerHunter",
          description: "Acquired more than 50 new customer",
          value: customers >= 50 ? 50 : customers,
          target: 50,
          achieved: customers >= 50,
        },
        {
          name: "Senior customer hunter",
          shortName: "SeniorCustomerHunter",
          description: "Acquired more than 150 new customer",
          value: customers >= 150 ? 150 : customers,
          target: 150,
          achieved: customers >= 250,
        },
        {
          name: "Master customer hunter",
          shortName: "MasterCustomerHunter",
          description: "Acquired more than 500 new customer",
          value: customers >= 500 ? 500 : customers,
          target: 500,
          achieved: customers >= 500,
        },
      ];

      return res.status(200).send(achivements);
    });
  };

  update = async (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleID = req.body.role;
    const userID = req.body.userId;
    const userSales = req.body.user_sales;

    const role = UserRoleModel.fromRoleID(roleID);

    if (role == null) {
      return res.status(400).send(ErrorList["Role not found"]);
    }

    try {
      const user = await this.userRepository.fetchByID(id);
      if (!user) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!user.is_active) {
        return res.status(400).send(ErrorList["User not active"]);
      }

      const result = await this.userRepository.update({
        id: user.id,
        nik: user.nik,
        username: user.username,
        name: name,
        roleID: roleID,
        user_sales: userSales,
        created_by: userID,
        created_at: new Date(),
        is_active: user.is_active,
      });

      const socket = new SocketHelper("updateUser", result);
      socket.create();

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating user ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  toggleActive = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!id || isNaN(id)) {
        return res.status(400).send(ErrorList["Parameter error"]);
      }

      const user = await this.userRepository.fetchByID(id);
      if (!user) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const result = await this.userRepository.toggleActive(
        user.id!,
        !user.is_active!
      );
      if (user.is_active) {
        const socket = new SocketHelper("deleteUser", result);
        socket.create();

        redisClient.del(`user:${id}`);
      } else {
        redisClient.set(`user:${id}`, JSON.stringify(result));
      }

      return res.status(201).send(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

  updatePassword = async (req: Request, res: Response) => {
    try {
      const password = req.body.password;
      const hashedPassword = await hash(password, 12);
      const userID = req.body.userId;
      const result = await this.userRepository.updatePassword(
        userID,
        hashedPassword
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating password ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const userID = req.body.userId;
      if (!id || isNaN(id)) {
        return res.status(400).send(ErrorList["Parameter error"]);
      }

      const user = await this.userRepository.fetchByID(id);
      if (!user) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (!user.is_active) {
        return res.status(400).send(ErrorList["User not active"]);
      }

      const result = await this.userRepository.delete(id, userID);

      await redisClient.del(`user:${id}`);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting user ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default UserController;
