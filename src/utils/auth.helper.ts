import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
// Memakai klien bersama dari database.helper. Sebelumnya berkas ini membuat
// PrismaClient sendiri, sehingga aplikasi berjalan dengan dua connection pool
// terpisah ke database yang sama — jatah koneksi terpakai dua kali lipat, dan
// tiap permintaan yang lewat middleware memakai pool yang berbeda dari
// permintaan itu sendiri.
import { prisma } from "./database.helper";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
        })
        .then((user) => {
          // If user is still active, then proceed
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          }

          req.body.userId = decodedData.id;
          next();
        })
        .catch(() => {
          return res.status(401).send("User not authorized");
        });
    } else {
      return res.status(401).send("User not authorized");
    }
  });
};

export const authMiddlewareRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
          include: {
            user_sales: true,
          },
        })
        .then((user) => {
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          }

          req.body.userId = decodedData.id;
          req.body.role = user.role;
          req.body.user_sales = user.user_sales.map((x) => {
            return {
              product_type_id: x.product_type_id,
            };
          });

          next();
        })
        .catch(() => {
          return res.status(401).send("User not authorized");
        });
    } else {
      return res.status(401).send("User not authorized");
    }
  });
};

export const administratorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
          select: {
            role: true,
            id: true,
            is_active: true,
          },
        })
        .then((user) => {
          // If user is still active, then proceed
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          } else if (user?.role == 5 || user?.role == 7) {
            next();
          } else {
            return res.status(400).send("Non-administrator user");
          }
        })
        .catch(() => {
          return res.status(400).send("Non-administrator user");
        });
    } else {
      return res.status(400).send("Non-administrator user");
    }
  });
};

export const superadministratorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let tokenHeader = req.headers["authorization"]?.toString();
  if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
    return res.status(401).json({
      auth: false,
      message: "Incorrect token format",
    });
  }

  let token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      auth: false,
      message: "No token provided",
    });
  }

  verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
    if (!error) {
      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
          select: {
            role: true,
            id: true,
            is_active: true,
          },
        })
        .then((user) => {
          // If user is still active, then proceed
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          } else if (user?.role == 7) {
            next();
          } else {
            return res.status(400).send("Non-administrator user");
          }
        })
        .catch(() => {
          return res.status(400).send("Non-administrator user");
        });
    } else {
      return res.status(400).send("Non-administrator user");
    }
  });
};

/**
 * Membatasi akses ke daftar role tertentu.
 *
 * Dipakai pada endpoint yang datanya sensitif per-divisi. authMiddleware hanya
 * menjawab "sudah login?" — ia tidak menjawab "boleh lihat ini?". Sebelum ini
 * pembatasan divisi hanya ada di guard frontend, padahal guard itu membaca role
 * dari localStorage yang dienkripsi memakai kunci yang ikut ter-commit ke repo
 * publik. Artinya user mana pun yang login sah bisa mengubah role-nya sendiri
 * di browser, atau melewati frontend sama sekali dengan memanggil API langsung.
 *
 * Kalau daftar role di sini dilonggarkan atau middleware ini dilepas, laporan
 * penjualan/pembelian/keuangan kembali bisa dibaca lintas divisi tanpa jejak.
 */
export const requireRole = (allowedRoles: number[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const tokenHeader = req.headers["authorization"]?.toString();
    if (!tokenHeader || tokenHeader.split(" ")[0] !== "Bearer") {
      return res.status(401).json({
        auth: false,
        message: "Incorrect token format",
      });
    }

    const token = tokenHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        auth: false,
        message: "No token provided",
      });
    }

    verify(token, process.env.TOKEN_KEY!, (error, decoded) => {
      if (error) {
        return res.status(401).send("User not authorized");
      }

      const decodedData = decoded as any;
      prisma.user
        .findFirst({
          where: {
            id: decodedData.id,
            is_active: true,
          },
          select: {
            id: true,
            role: true,
            is_active: true,
          },
        })
        .then((user) => {
          if (user == null || !user.is_active) {
            return res.status(401).send("User not authorized");
          }

          if (!allowedRoles.includes(user.role)) {
            return res.status(403).send("Forbidden");
          }

          // Ditulis dari hasil verifikasi token, bukan dari kiriman client.
          // Sebagian controller membaca req.body.role; kalau nilainya dibiarkan
          // datang dari body, client bisa mengaku punya role apa pun.
          req.body.userId = user.id;
          req.body.role = user.role;
          next();
        })
        .catch(() => {
          return res.status(401).send("User not authorized");
        });
    });
  };
};

export const putriForbiddenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userID = req.body.userId;
  if (userID == 3) {
    return res.status(403).send("Forbidden");
  } else {
    next();
  }
};
