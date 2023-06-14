import { hash } from "bcryptjs";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import ErrorList from "../assets/error_list";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import CustomerModel from "../model/customer.model";
import UserModel from "../model/user.model";
import UserRoleModel from "../model/user_role.model";

class UserController {
  static create = (req: Request, res: Response) => {
    const roleId = parseInt(req.body.role);
    const role = UserModel.roles.filter((x) => x.id == roleId && x.available);
    const username = req.body.username;
    const nik = req.body.nik;
    const name = req.body.name;

    if (role.length == 0 || role == null) {
      return res.status(500).send("Peran tidak ditemukan.");
    }

    UserModel.fetchByIdentifiers(username, nik).then((count) => {
      if (count > 0) {
        return res.status(400).send(ErrorList["Duplicate error"]);
      } else {
        let password = "";
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 8; i++) {
          password +=
            characters[Math.floor(Math.random() * (characters.length - 1))];
        }

        hash(password, 12)
          .then((hashedPassword) => {
            const user = new UserModel(
              name,
              nik,
              username,
              hashedPassword,
              req.body.userId
            );
            user
              .create()
              .then((user_create) => {
                const user_role = new UserRoleModel(user_create.id, roleId);
                user_role
                  .create()
                  .then((user_role_create) => {
                    const socket = new SocketHelper("createUser", {
                      id: user_create.id,
                      name: user_create.name,
                      nik: user_create.nik,
                      username: user_create.username,
                      password: password,
                      role_id: user_role_create.role,
                      role: UserModel.roles.filter(
                        (x) => x.id == user_role_create.role
                      )[0].name,
                      user: user_create.user,
                    });
                    socket.create();

                    return res.status(201).send({
                      id: user_create.id,
                      name: user_create.name,
                      nik: user_create.nik,
                      username: user_create.username,
                      password: password,
                      role_id: user_role_create.role,
                      role: UserModel.roles.filter(
                        (x) => x.id == user_role_create.role
                      )[0].name,
                    });
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    UserModel.fetchById(id)
      .then((user) => {
        if (user == null) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send({
          ...user,
          role: UserModel.roles.filter(
            (y) => y.id == user.user_department?.role
          )[0].name,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page?.toString()));
    const keyword = !req.query.keyword ? "" : req.query.keyword?.toString();
    const limit = parseInt(process.env.LIMIT!.toString());
    const offset = (page - 1) * limit;

    UserModel.fetch(keyword, offset, limit)
      .then((result) => {
        const response: any[] = [];
        result[0].forEach((x) => {
          response.push({
            id: x.id,
            nik: x.nik,
            name: x.name,
            username: x.username,
            user_department: x.user_department,
            role:
              x.user_department == null
                ? null
                : UserModel.roles.filter(
                    (y) => y.id == x.user_department?.role
                  )[0].name,
          });
        });
        return res.status(200).send({
          data: response,
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleId = req.body.role;
    const role = UserModel.roles.filter((x) => x.id == roleId && x.available);
    const userID = req.body.userId;

    if (role == null || role.length == 0) {
      return res.status(400).send(ErrorList["Parameter error"]);
    } else {
      UserModel.fetchById(id)
        .then((user) => {
          if (user == null || !user.is_active) {
            return res.status(404).send(ErrorList["Not found"]);
          } else {
            const userRoleModel = new UserRoleModel(id, role[0].id);
            Promise.all([
              UserModel.update(id, name, null, userID),
              userRoleModel.update(),
            ])
              .then((result) => {
                const user_object = {
                  id: result[0].id,
                  name: result[0].name,
                  nik: result[0].nik,
                  username: result[0].username,
                  password: null,
                  role: UserModel.roles.filter(
                    (x) => x.id == result[1].role
                  )[0],
                };

                const socket = new SocketHelper("updateUser", user_object);
                socket.create();

                return res.status(201).send(user_object);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          }
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static toggleActive = (req: Request, res: Response) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    }

    try {
      const id = parseInt(req.params.id);
      UserModel.fetchById(id)
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

  static changePassword = (req: Request, res: Response) => {
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

  static fetchStats = (req: Request, res: Response) => {
    const id = req.body.userId;
    Promise.all([
      BillModel.fetchBySales(id),
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
          value: totalSales,
          target: 10000000,
          achieved: totalSales > 10000000,
        },
        {
          name: "Extraordinary sales",
          shortName: "ExtraordinarySales",
          description: "Sales value is more than 100.000.000 IDR",
          value: totalSales,
          target: 100000000,
          achieved: totalSales > 100000000,
        },
        {
          name: "Super sales",
          shortName: "SuperSales",
          description: "Sales value is more than 1.000.000.000 IDR",
          value: totalSales,
          target: 1000000000,
          achieved: totalSales > 1000000000,
        },
        {
          name: "Mega sales",
          shortName: "MegaSales",
          description: "Sales value is more than 10.000.000.000 IDR",
          value: totalSales,
          target: 10000000000,
          achieved: totalSales > 10000000000,
        },
        {
          name: "Junior customer hunter",
          shortName: "JuniorCustomerHunter",
          description: "Acquired new customer",
          value: customers,
          target: 1,
          achieved: customers >= 1,
        },
        {
          name: "Customer hunter",
          shortName: "CustomerHunter",
          description: "Acquired more than 50 new customer",
          value: customers,
          target: 50,
          achieved: customers >= 50,
        },
        {
          name: "Senior customer hunter",
          shortName: "SeniorCustomerHunter",
          description: "Acquired more than 150 new customer",
          value: customers,
          target: 150,
          achieved: customers >= 250,
        },
        {
          name: "Master customer hunter",
          shortName: "MasterCustomerHunter",
          description: "Acquired more than 500 new customer",
          value: customers,
          target: 500,
          achieved: customers >= 500,
        },
      ];

      return res.status(200).send(achivements);
    });
  };
}

export default UserController;
