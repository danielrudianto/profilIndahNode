import { Prisma, PrismaClient } from "@prisma/client";
import { IAuditLogFilter } from "../interfaces/audit-log.interface";
import { AuditLogModel } from "../models/audit-log.model";

export class AuditLogRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Membaca jejak dengan penyaring dan penomoran halaman.
   *
   * Nama pengguna ikut diambil lewat relasi, bukan dicari terpisah per baris:
   * satu halaman berisi puluhan jejak, dan mengambil namanya satu per satu
   * menghasilkan puluhan kueri untuk satu layar.
   */
  async fetch(
    filter: IAuditLogFilter
  ): Promise<{ data: AuditLogModel[]; total: number }> {
    const where: Prisma.audit_logWhereInput = {};

    if (filter.entity) {
      where.entity = filter.entity;
    }

    if (filter.entityID) {
      where.entity_id = filter.entityID;
    }

    if (filter.userID?.length) {
      where.user_id = { in: filter.userID };
    } else if (filter.userOnly) {
      /* Jejak pekerjaan latar tidak punya pemilik; itulah pembedanya. */
      where.user_id = { not: null };
    }

    /*
      Tanggal dibandingkan sebagai rentang setengah terbuka: dateTo digeser ke
      awal hari berikutnya, bukan dipakai apa adanya. Kolomnya menyimpan jam,
      sehingga membandingkan `lte: dateTo` akan membuang seluruh kejadian pada
      hari itu selain yang tepat tengah malam.
    */
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        const besok = new Date(filter.dateTo);
        besok.setDate(besok.getDate() + 1);
        where.createdAt.lt = besok;
      }
    }

    const [baris, total] = await this.prisma.$transaction([
      this.prisma.audit_log.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              /* Avatar ikut supaya halaman aktivitas menampilkan wajahnya,
                 bukan hanya lingkaran inisial. */
              user_avatar: true,
            },
          },
        },
      }),
      this.prisma.audit_log.count({ where }),
    ]);

    return {
      data: baris.map((x) => AuditLogModel.fromMap(x)),
      total: total,
    };
  }
}
