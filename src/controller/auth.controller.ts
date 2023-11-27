import { compare, hash } from "bcrypt";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import ErrorList from "../assets/error_list";
import UserModel from "../model/user.model";

class AuthController {
  /**
   * Login
   * @param req
   * @param res
   */
  static login = (req: Request, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;

    UserModel.fetchByUsername(username)
      .then((user) => {
        if (!user) {
          return res.status(400).send(ErrorList["Auth error"]);
        }

        if (!user.is_active) {
          return res.status(400).send(ErrorList["User not active"]);
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
            exp: new Date().getTime() + parseInt(process.env.EXPIRATION!),
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
        console.error(`[error]: Error while login. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Refresh token
   * @param req
   * @param res
   */
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
          exp: new Date().getTime() + parseInt(process.env.EXPIRATION!),
        });
      }
    });
  };

  /**
   * Fetch profile
   * @param req
   * @param res
   */
  static fetchProfile = (req: Request, res: Response) => {
    UserModel.fetchByID(req.body.userId)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Auth error"]);
        }

        if (!result.is_active) {
          return res.status(400).send(ErrorList["User not active"]);
        }

        return res.status(200).send({
          name: result?.name,
          username: result?.username,
          nik: result?.nik,
          role: UserModel.roles.filter(
            (x) => x.id == result?.user_department?.role
          )[0],
          is_active: result?.is_active,
        });
      })
      .catch((error) => {
        console.error(`[error]: Error while fetching profile. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Reset password
   * @param req
   * @param res
   */
  static updatePassword = (req: Request, res: Response) => {
    const user_id = parseInt(req.body.user_id);
    const password = req.body.password;

    UserModel.fetchByID(user_id)
      .then((user) => {
        if (!user) {
          return res.status(404).send(ErrorList["User not found"]);
        }

        if (!user.is_active) {
          return res.status(400).send(ErrorList["User not active"]);
        }

        // If password is not provided, generate random password
        // But if password is provided, hash it
        if (password == undefined || password == null) {
          let password = "";
          const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          for (var i = 0; i < 8; i++) {
            password +=
              characters[Math.floor(Math.random() * (characters.length - 1))];
          }
          hash(password, 12)
            .then((hashedPassword) => {
              UserModel.update({
                id: user.id,
                username: user.username,
                nik: user.nik,
                name: user.name,
                password: hashedPassword,
                created_by: user.id,
                role:
                  user.user_department == null ? 0 : user.user_department.role,
              })
                .then((result) => {
                  return res.status(201).send({
                    ...result,
                    password: password,
                  });
                })
                .catch((error) => {
                  console.error(`[error]: error on updating user ${error}`);
                  return res
                    .status(500)
                    .send(ErrorList["Internal server error"]);
                });
            })
            .catch((error) => {
              console.error(`[error]: Error on hashing password ${error}}`);
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        } else {
          hash(password, 12)
            .then((hashedPassword) => {
              UserModel.update({
                id: user.id,
                username: user.username,
                nik: user.nik,
                name: user.name,
                password: hashedPassword,
                created_by: user.id,
                role:
                  user.user_department == null ? 0 : user.user_department.role,
              })
                .then((result) => {
                  return res.status(201).send(result);
                })
                .catch((error) => {
                  console.error(`[error]: error on updating user ${error}`);
                  return res
                    .status(500)
                    .send(ErrorList["Internal server error"]);
                });
            })
            .catch((error) => {
              console.error(`[error]: Error on hashing password ${error}}`);
              return res.status(500).send(ErrorList["Internal server error"]);
            });
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching user ${error}}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default AuthController;
