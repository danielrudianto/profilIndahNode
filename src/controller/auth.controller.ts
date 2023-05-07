import { compare, hash } from "bcrypt";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import ErrorList from "../assets/error_list";
import UserModel from "../model/user.model";

class AuthController {
  static login = (req: Request, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;

    UserModel.fetchByUsername(username)
      .then((user) => {
        if (!user || !user.is_active) {
          return res.status(400).send(ErrorList["Auth error"]);
        }

        compare(password, user.password).then((result) => {
          if (!result) {
            return res.status(400).send(ErrorList["Auth error"]);
          }

          return res.status(200).send({
            user: {
              id: user.id,
              name: user.name,
              role: user.user_department,
            },
            token: sign(
              {
                id: user.id,
              },
              process.env.TOKEN_KEY!.toString(),
              {
                expiresIn: process.env.EXPIRATION,
              }
            ),
            refreshToken: sign(
              {
                id: user.id,
              },
              process.env.REFRESH_TOKEN_KEY!.toString(),
              {
                expiresIn: process.env.REFRESH_EXPIRATION,
              }
            ),
          });
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchProfile = (req: Request, res: Response) => {
    UserModel.fetchById(req.body.userId)
      .then((result) => {
        if (result == null || !result.is_active) {
          return res.status(404).send(ErrorList["Auth error"]);
        } else {
          return res.status(200).send({
            name: result?.name,
            username: result?.username,
            nik: result?.nik,
            role: UserModel.roles.filter(
              (x) => x.id == result?.user_department?.role
            )[0],
            is_active: result?.is_active,
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static updatePassword = (req: Request, res: Response) => {
    const password = req.body.password;
    const userId = req.body.userId;
    hash(password, 12)
      .then((hashed_password) => {
        UserModel.updatePassword(hashed_password, userId)
          .then((result) => {
            return res.status(200).send(result);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static resetPassword = (req: Request, res: Response) => {
    const user_id = parseInt(req.body.user_id);
    UserModel.fetchById(user_id)
      .then((user) => {
        if (user == null || !user.is_active) {
          return res.status(404).send("Pengguna tidak ditemukan.");
        } else {
          // User is found and it's password will be reseted.
          let password = "";
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          for (var i = 0; i < 8; i++) {
            password +=
              characters[Math.floor(Math.random() * (characters.length - 1))];
          }
          hash(password, 12)
            .then((hashedPassword) => {
              UserModel.update(
                user?.id,
                user?.name,
                hashedPassword,
                req.body.userId
              )
                .then((result) => {
                  return res.status(201).send({
                    ...result,
                    password: password,
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
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static refreshToken = (req: Request, res: Response) => {
    let tokenHeader = req.headers["x-access-token"]?.toString();
    if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
      return res.status(400).json({
        auth: false,
        message: "Format token tidak sesuai. Mohon coba login ulang.",
      });
    }

    let token = tokenHeader.split(" ")[1];
    if (!token) {
      return res.status(400).json({
        auth: false,
        message: "Token tidak tersedia. Mohon coba login ulang.",
      });
    }

    verify(token, process.env.REFRESH_TOKEN_KEY!, (err, decoded) => {
      if (err) {
        return res.status(400).send(err);
      } else {
        const id = parseInt((decoded as any).id);
        const jwtToken = sign(
          {
            id: id,
          },
          process.env.TOKEN_KEY!.toString(),
          {
            expiresIn: process.env.EXPIRATION,
          }
        );

        return res.status(200).send({
          token: jwtToken,
        });
      }
    });
  };
}

export default AuthController;
