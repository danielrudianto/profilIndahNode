// Memakai bcryptjs, bukan bcrypt. Keduanya menghasilkan dan memverifikasi hash
// bcrypt standar yang sama — hash $2b$ lama tetap terverifikasi di sini.
// Alasan pindah: bcrypt menarik @mapbox/node-pre-gyp -> tar, satu-satunya
// kerentanan berkategori critical di proyek ini, dan ia butuh kompilasi native
// saat install. Berkas lain (user.controller.ts) sudah memakai bcryptjs, jadi
// ini sekaligus menghapus keadaan dua pustaka hash yang berjalan berdampingan.
import { compare } from "bcryptjs";
import { Request, Response } from "express";
import { sign, verify, SignOptions } from "jsonwebtoken";
import ErrorList from "../constants/error-list.constant";
import { UserRepository } from "../repositories/user.repository";

/*
  @types/jsonwebtoken 9 mengetik expiresIn sebagai templat pustaka `ms`
  ("1h", "7d", ...), bukan string bebas. Nilai kita datang dari .env yang
  bertipe string — fungsi ini hanya menuangkan tipenya.

  Env-nya DIBACA SAAT DIPANGGIL, bukan saat modul dimuat. Versi yang
  menuang sekali di puncak modul terbukti rapuh: siapa pun yang mengimpor
  modul ini sebelum dotenv.config() — pengujian melakukannya — mendapat
  undefined yang membeku selamanya.
*/
const masaBerlaku = (nilai: string | undefined) =>
  nilai as SignOptions["expiresIn"];

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

      console.info(`[info]: User found for username ${username}`);

      if (!user.is_active) {
        return res.status(400).send(ErrorList["User not active"]);
      }

      console.info(`[info]: User ${username} is active`);

      const isPasswordValid = await compare(password, user.password!);
      if (!isPasswordValid) {
        return res.status(400).send(ErrorList["Auth error"]);
      }

      const token = sign({ id: user.id }, process.env.TOKEN_KEY!.toString(), {
        expiresIn: masaBerlaku(process.env.EXPIRATION),
      });

      const refreshToken = sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_KEY!.toString(),
        {
          expiresIn: masaBerlaku(process.env.REFRESH_EXPIRATION),
        }
      );

      return res.status(200).send({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          roleText: user.roleText,
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
            expiresIn: masaBerlaku(process.env.EXPIRATION),
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
