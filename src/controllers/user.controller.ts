import { compare, hash } from "bcryptjs";
import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import SocketHelper from "../utils/socket.helper";
import { redisClient } from "../utils/redis.helper";
import { UserRepository } from "../repositories/user.repository";
import { UserRoleModel } from "../models/user_role.model";
import { translateKeyword, translatePage } from "../utils/escape.helper";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { AchievementModel } from "../models/achievement.model";

class UserController {
  userRepository: UserRepository;
  salesInvoiceRepository: SalesInvoiceRepository;
  customerRepository: CustomerRepository;

  constructor(
    userRepository: UserRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    customerRepository: CustomerRepository
  ) {
    this.userRepository = userRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.customerRepository = customerRepository;
  }

  create = async (req: Request, res: Response) => {
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
        role: Number(req.body.role),
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

      /*
        Sandi awal hanya boleh keluar lewat balasan HTTP kepada administrator
        yang membuat akunnya — dialah yang perlu membacakannya sekali kepada
        pengguna baru.

        Dua jalur lain di bawah ini sebelumnya ikut membawanya:

        SIARAN SOCKET. SocketHelper memakai getIO().emit(), yang mengirim ke
        SELURUH klien tersambung tanpa penyaringan peran. Setiap kali akun
        dibuat, username beserta sandi awalnya muncul di peramban staf gudang,
        sales, dan siapa pun yang sedang membuka aplikasi.

        CACHE REDIS. Maksudnya membuang sandi sebelum disimpan, tetapi kuncinya
        salah ketik — `pasword`, kurang satu huruf s. Akibatnya `password` yang
        asli tetap ikut tersimpan di Redis, tanpa masa berlaku.

        Keduanya kini memakai `tanpaSandi`, dan bidang `password` dibuang lewat
        pemisahan destructuring supaya tidak bisa lolos lagi hanya karena salah
        ketik nama kunci.
      */
      const { password: _sandiAwal, ...tanpaSandi } = result;

      const socket = new SocketHelper("createUser", tanpaSandi);
      socket.create();

      await redisClient.set(`user:${user.id}`, JSON.stringify(tanpaSandi));

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating user ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
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
  };

  fetch = async (req: Request, res: Response) => {
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
  };

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

  fetchStatistics = async (req: Request, res: Response) => {
    const userID = req.body.userId;
    try {
      const customersCreated =
        await this.customerRepository.fetchSalesStatistics(userID);
      const salesInvoices =
        await this.salesInvoiceRepository.fetchSalesStatistics(userID);

      const achievements = new AchievementModel({
        customer: customersCreated,
        sales: salesInvoices,
      }).getAchievements();

      return res.status(200).send(achievements);
    } catch (error) {
      console.error(`[error]: Error on fetching user statistics ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const role = req.body.role;
    const userID = req.body.userId;
    const userSales = req.body.user_sales;

    const roleText = UserRoleModel.fromRoleID(role);

    if (roleText == null) {
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
        role: role,
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
      const currentPassword = req.body.currentPassword;
      const password = req.body.password;
      const userID = req.body.userId;

      /*
        Sandi lama wajib terbukti benar dulu — token yang tertinggal di
        komputer terbuka tidak boleh cukup untuk merebut akun.
      */
      const hashTersimpan = await this.userRepository.fetchPasswordByID(userID);
      if (hashTersimpan === null) {
        return res.status(404).send(ErrorList["Not found"]);
      }
      const cocok = await compare(currentPassword, hashTersimpan);
      if (!cocok) {
        return res.status(400).send(ErrorList["Current password incorrect"]);
      }

      const hashedPassword = await hash(password, 12);
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
