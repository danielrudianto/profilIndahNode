import { compare, hash } from "bcrypt";
import { Request, Response } from "express";
import { sign, verify } from "jsonwebtoken";
import ErrorList from "../assets/error_list";
import { UserRepository } from "../repositories/user.repository";

class AuthController {
  userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  login = async (req: Request, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;
    try {
      const user = await this.userRepository.fetchByUsername(username);
      if (!user) {
        return res.status(400).send(ErrorList["Auth error"]);
      }

      if (!user.is_active) {
        return res.status(400).send(ErrorList["User not active"]);
      }

      const isPasswordValid = await compare(password, user.password!);
      if (!isPasswordValid) {
        return res.status(400).send(ErrorList["Auth error"]);
      }

      const token = sign({ id: user.id }, process.env.TOKEN_KEY!.toString(), {
        expiresIn: process.env.EXPIRATION,
      });

      const refreshToken = sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_KEY!.toString(),
        {
          expiresIn: process.env.REFRESH_EXPIRATION,
        }
      );

      return res.status(200).send({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          roleID: user.roleID,
        },
        user_avatar: user.user_avatar,
        token: token,
        exp:
          new Date().getTime() +
          parseInt(process.env.EXPIRATION!.toString().replace("d", "")) * 1000,
        refreshToken: refreshToken,
      });
    } catch (error) {
      console.error(`[error]: Error while login. ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  updatePassword = async (req: Request, res: Response) => {
    const userID = parseInt(req.body.userId);
    const password = req.body.password;

    const user = await this.userRepository.fetchByID(userID);
    if (!user) {
      return res.status(404).send(ErrorList["User not found"]);
    }

    if (!user.is_active) {
      return res.status(400).send(ErrorList["User not active"]);
    }

    // If password is not provided, generate random password
    // But if password is provided, hash it
    if (password == undefined || password == null || password == "") {
      const randomPassword = this.generateRandomPassword();
      const hashedPassword = await this.hashPassword(randomPassword);
      try {
        const result = await this.userRepository.updatePassword(
          userID,
          hashedPassword
        );

        return res.status(201).send({
          ...result,
          password: randomPassword,
        });
      } catch (error) {
        console.error(`[erroFr]: error on updating user ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      }
    } else {
      try {
        const hashedPassword = await this.hashPassword(password);
        const result = await this.userRepository.updatePassword(
          userID,
          hashedPassword
        );

        return res.status(201).send({
          ...result,
          password: password,
        });
      } catch (error) {
        console.error(`[error]: error on updating user ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      }
    }
  };

  private generateRandomPassword = (): string => {
    let password = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 8; i++) {
      password +=
        characters[Math.floor(Math.random() * (characters.length - 1))];
    }
    return password;
  };

  private hashPassword = async (password: string): Promise<string> => {
    try {
      return await hash(password, 12);
    } catch (error) {
      console.error(`[error]: Error on hashing password ${error}`);
      throw new Error(ErrorList["Internal server error"]);
    }
  };

  refreshToken = async (req: Request, res: Response) => {
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
          exp:
            new Date().getTime() +
            parseInt(process.env.EXPIRATION!.toString().replace("d", "")) *
              24 *
              60 *
              60 *
              1000,
        });
      }
    });
  };

  fetchProfile = async (req: Request, res: Response) => {
    const userID = Number(req.body.userId);
    try {
      const user = await this.userRepository.fetchByID(userID);
      if (!user) {
        return res.status(404).send(ErrorList["User not found"]);
      }

      if (!user.is_active) {
        return res.status(400).send(ErrorList["User not active"]);
      }

      return res.status(200).send(user);
    } catch (error) {
      console.error(`[error]: Error while fetching profile. ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default AuthController;
