import { hash } from "bcryptjs";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import CustomerModel from "../model/customer.model";
import UserModel from "../model/user.model";

class UserController {
  /**
   * Create a new user
   * @param req
   * @param res
   * @returns User
   */
  static create = (req: Request, res: Response) => {
    const roleID = parseInt(req.body.role);
    const role = UserModel.roles.filter((x) => x.id == roleID && x.available);
    const username = req.body.username;
    const nik = req.body.nik;
    const name = req.body.name;
    const userID = req.body.userId;
    const types = req.body.user_sales;

    if (role.length == 0 || role == null) {
      return res.status(400).send(ErrorList["Role not found"]);
    }

    UserModel.checkByCredential(username, nik).then((check) => {
      if (!check) {
        return res.status(404).send(ErrorList["User already exist"]);
      }

      let password = "";
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (var i = 0; i < 8; i++) {
        password +=
          characters[Math.floor(Math.random() * (characters.length - 1))];
      }

      hash(password, 12)
        .then((hashedPassword) => {
          if (roleID == 6) {
            UserModel.create({
              name: name,
              nik: nik,
              username: username,
              password: hashedPassword,
              created_by: userID,
              role: roleID,
              user_sales: types,
            })
              .then((result) => {
                const socket = new SocketHelper("createUser", {
                  id: result.id,
                  name: result.name,
                  nik: result.nik,
                  username: result.username,
                  password: password,
                  role_id: roleID,
                  role: UserModel.fetchRole(roleID)?.name || "",
                  user: result.user,
                });
                socket.create();

                return res.status(201).send({
                  id: result.id,
                  name: result.name,
                  nik: result.nik,
                  username: result.username,
                  password: password,
                  role_id: roleID,
                  role: UserModel.fetchRole(roleID)?.name || "",
                });
              })
              .catch((error) => {
                console.error(`[error]: Error on creating user. ${error}`);
                return res.status(500).send(ErrorList["Internal server error"]);
              });
          } else {
            UserModel.create({
              name: name,
              nik: nik,
              username: username,
              password: hashedPassword,
              created_by: userID,
              role: roleID,
            })
              .then((result) => {
                const socket = new SocketHelper("createUser", {
                  id: result.id,
                  name: result.name,
                  nik: result.nik,
                  username: result.username,
                  password: password,
                  role_id: roleID,
                  role: UserModel.fetchRole(roleID)?.name || "",
                  user: result.user,
                });
                socket.create();

                return res.status(201).send({
                  id: result.id,
                  name: result.name,
                  nik: result.nik,
                  username: result.username,
                  password: password,
                  role_id: roleID,
                  role: UserModel.fetchRole(roleID)?.name || "",
                });
              })
              .catch((error) => {
                console.error(`[error]: Error on creating user. ${error}`);
                return res.status(500).send(ErrorList["Internal server error"]);
              });
          }
        })
        .catch((error) => {
          console.error(`[error]: Error while hashing password. ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    });
  };

  /**
   * Fetch user by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    UserModel.fetchByID(id)
      .then((user) => {
        if (!user) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send({
          ...user,
          role_name: UserModel.roles.filter((y) => y.id == user.role)[0].name,
          user_sales: user.user_sales.length == 0 ? [] : user.user_sales,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch users using pagination
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page?.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const limit = parseInt(process.env.LIMIT!.toString());
    const offset = (page - 1) * limit;

    UserModel.fetch(keyword, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              id: x.id,
              nik: x.nik,
              name: x.name,
              username: x.username,
              role: UserModel.roles.filter((y) => y.id == x?.role)[0].name,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch user stats
   * @param req
   * @param res
   * @returns The achievement of the user
   */
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

  /**
   * Update user data
   * @param req
   * @param res
   */
  static update = (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleID = req.body.role;
    const role = UserModel.fetchRole(roleID);
    const userID = req.body.userId;
    const userSales = req.body.user_sales;

    if (!role) {
      return res.status(400).send(ErrorList["Role not found"]);
    }

    UserModel.fetchByID(id)
      .then(async (user) => {
        if (!user) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        if (!user.is_active) {
          return res.status(400).send(ErrorList["User not active"]);
        }

        UserModel.update({
          id: id,
          username: user.username,
          nik: user.nik,
          name: name,
          created_by: userID,
          password: null,
          role: roleID,
          user_sales: userSales,
        })
          .then((result) => {
            const socket = new SocketHelper("updateUser", {
              id: result.id,
              name: result.name,
              nik: result.nik,
              username: result.username,
              password: null,
              role: role.name,
            });
            socket.create();

            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on updating user ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static toggleActive = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    try {
      const id = parseInt(req.params.id);
      UserModel.fetchByID(id)
        .then((user) => {
          if (user == null) {
            return res.status(404).send("Pengguna tidak ditemukan.");
          }

          UserModel.delete(user.id, !user.is_active, req.body.userId)
            .then((user_delete) => {
              // If user was active and no longer active
              // Log him / her out from our system immidiately
              if (user.is_active) {
                const socket = new SocketHelper("deleteUser", user_delete);
                socket.create();
              }

              return res.status(201).send(user_delete);
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } catch (err: unknown) {
      if (err instanceof Error) {
        return res.status(500).send(err);
      } else {
        return res.status(500).send(ErrorList["Unknown error"]);
      }
    }
  };

  static updatePassword = (req: Request, res: Response) => {
    const password = req.body.password;
    hash(password, 12).then((hashed_password) => {
      UserModel.updatePassword(hashed_password, req.body.userId)
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    });
  };
}

export default UserController;
