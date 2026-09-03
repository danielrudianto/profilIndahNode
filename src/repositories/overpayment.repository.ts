import { PrismaClient } from "@prisma/client";
import { OverpaymentCodeModel } from "../models/overpayment.model";
import { IOverpaymentCode } from "../interfaces/overpayment.interface";

export class OverpaymentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IOverpaymentCode) {
    const result = await this.prisma.overpayment.create({
      data: {
        date: data.date,
        sales_deposit_code_id: data.sales_deposit_code_id,
        sales_return_code_id: data.sales_return_code_id ?? null,
        customer_id: data.customer_id,
        /*
          KAS MANA yang membayar. Diterima controller sejak lama, dideklarasikan
          antarmukanya, dan tidak pernah ditulis ke sini — sehingga SETIAP baris
          kelebihan bayar tersimpan tanpa metode dan jatuh ke keranjang Tunai.

          Akibatnya laporan uang terbelah: sisi retur mendarat di rekening yang
          benar karena sales_return_code menyimpannya, sisi kelebihan bayar
          mendarat di Tunai. Satu dokumen tergambar sebagai uang masuk tunai
          dan uang keluar bank sekaligus.
        */
        payment_method_id: data.payment_method_id ?? null,
        return_payment_date: data.return_payment_date,
        return_payment_method: data.return_payment_method,
        return_payment_number: data.return_payment_number,
        return_payment_bank: data.return_payment_bank,
        return_payment_name: data.return_payment_name,
        created_by: data.created_by,
        created_at: data.created_at,
        value: data.value,
      },
      include: {
        customer: true,
      },
    });

    return OverpaymentCodeModel.fromMap(result);
  }

  /**
   * Mengubah catatan yang BELUM dikembalikan. Yang sudah is_resolved
   * dibiarkan — uangnya sudah keluar; mengubah angkanya setelah itu
   * berarti catatan kas berhenti cocok dengan kenyataan.
   *
   * Kembaliannya tiga keadaan supaya controller bisa membedakan 404
   * dari 409, sama seperti pola resolve().
   */
  async update(
    id: number,
    data: {
      date: Date;
      customer_id: number | null;
      payment_method_id: number | null;
      value: number;
      return_payment_date: Date;
      return_payment_method: string;
      return_payment_name: string;
      return_payment_bank: string | null;
      return_payment_number: string | null;
    }
  ): Promise<"ok" | "tidak-ada" | "sudah-dikembalikan"> {
    const ada = await this.prisma.overpayment.findUnique({
      where: { id: id },
      select: { is_resolved: true },
    });

    if (ada == null) {
      return "tidak-ada";
    }
    if (ada.is_resolved) {
      return "sudah-dikembalikan";
    }

    await this.prisma.overpayment.update({
      where: { id: id },
      data: {
        date: data.date,
        customer_id: data.customer_id,
        payment_method_id: data.payment_method_id,
        value: data.value,
        return_payment_date: data.return_payment_date,
        return_payment_method: data.return_payment_method,
        return_payment_name: data.return_payment_name,
        return_payment_bank: data.return_payment_bank,
        return_payment_number: data.return_payment_number,
      },
    });

    return "ok";
  }

  /**
   * Kelebihan bayar yang lahir dari satu retur, kalau ada.
   *
   * Dipakai jalur hapus retur: barisnya harus ikut dibereskan, karena
   * laporan uang membaca overpayment tanpa menyaring keadaan returnya —
   * sisi retur menyaring is_delete, sisi kelebihan bayar tidak. Baris yang
   * ditinggalkan membuat uang dari dokumen yang sudah dibatalkan mengambang
   * di laporan selamanya.
   */
  async fetchBySalesReturnCodeID(salesReturnCodeID: number) {
    return this.prisma.overpayment.findFirst({
      where: { sales_return_code_id: salesReturnCodeID },
    });
  }

  /**
   * Membuang kelebihan bayar milik satu retur.
   *
   * Tabelnya tidak punya penanda terhapus, jadi barisnya benar-benar
   * dibuang. Yang uangnya SUDAH keluar tidak pernah sampai ke sini —
   * controller menolak penghapusan returnya lebih dulu, karena membuang
   * catatan uang yang terlanjur ditransfer membuat buku kas berhenti cocok
   * dengan rekening.
   */
  async deleteBySalesReturnCodeID(salesReturnCodeID: number) {
    return this.prisma.overpayment.deleteMany({
      where: { sales_return_code_id: salesReturnCodeID, is_resolved: false },
    });
  }

  async createMany(data: IOverpaymentCode[]) {
    const insertQuery = data.map((x) => {
      return this.prisma.overpayment.create({
        data: {
          date: x.date,
          sales_deposit_code_id: x.sales_deposit_code_id,
          sales_return_code_id: x.sales_return_code_id ?? null,
          customer_id: x.customer_id,
          payment_method_id: x.payment_method_id ?? null,
          return_payment_date: x.return_payment_date,
          return_payment_method: x.return_payment_method,
          return_payment_number: x.return_payment_number,
          return_payment_bank: x.return_payment_bank,
          return_payment_name: x.return_payment_name,
          created_by: x.created_by,
          created_at: x.created_at,
          value: x.value,
        },
      });
    });

    await this.prisma.$transaction(insertQuery);
  }

  async fetch(data: {
    page: number;
    pageSize: number;
    sortBy: String;
    sortDirection: string;
    /** Kosong berarti seluruhnya; lihat penyaringnya di bawah. */
    status?: string;
    /** Dicocokkan ke nama pelanggan. Kosong berarti tidak menyaring. */
    keyword?: string;
  }) {
    let orderBy: any = {};

    switch (data.sortBy) {
      case "date":
        orderBy = {
          date: data.sortDirection,
        };
        break;
      case "value":
        orderBy = {
          value: data.sortDirection,
        };
        break;
      case "return":
        orderBy = {
          return_payment_date: data.sortDirection,
        };
        break;
    }

    /*
      Batas "lewat jatuh tempo" adalah awal hari ini, bukan saat ini juga:
      pengembalian yang dijanjikan hari ini belum terlambat sampai harinya
      habis. Memakai waktu berjalan akan menandai janji hari ini sebagai
      terlambat sejak pukul satu pagi.
    */
    const awalHariIni = new Date();
    awalHariIni.setHours(0, 0, 0, 0);

    const menunggu = {
      is_resolved: false,
      return_payment_date: { gte: awalHariIni },
    };
    const lewatTempo = {
      is_resolved: false,
      return_payment_date: { lt: awalHariIni },
    };

    let where: any = {};
    if (data.status === "waiting") {
      where = menunggu;
    } else if (data.status === "overdue") {
      where = lewatTempo;
    } else if (data.status === "resolved") {
      where = { is_resolved: true };
    }

    /*
      Pencarian dicocokkan ke nama pelanggan saja. Nomor dokumennya diturunkan
      frontend dari id dan tidak tersimpan sebagai kolom, jadi tidak ada yang
      bisa dicocokkan di sini — mencocokkan id sebagai teks akan membuat "12"
      ikut menemukan 112 dan 121.
    */
    const kata = (data.keyword ?? "").trim();
    if (kata !== "") {
      where = {
        ...where,
        customer: {
          name: {
            contains: kata,
          },
        },
      };
    }

    /*
      Kedua penghitung sengaja TIDAK dihitung dari halaman yang sedang tampil.
      Halaman berisi sepuluh baris, sementara chip-nya menyatakan keadaan
      seluruh daftar — dihitung dari halaman, angkanya berubah setiap kali
      pengguna berpindah halaman, dan itu terbaca seperti data yang berubah
      sendiri. Penghitungnya juga tidak ikut tersaring: chip harus tetap
      menunjukkan berapa yang ada ketika saringannya sedang menyala.
    */
    const [result, count, ringkasMenunggu, ringkasLewatTempo, ringkasSelesai] =
      await this.prisma.$transaction([
        this.prisma.overpayment.findMany({
          where: where,
          include: {
            customer: true,
            payment_method: true,
            /*
              Dokumen asalnya, hanya nomornya. Sumber kelebihan bayar tidak
              pernah disimpan sebagai keterangan — ia TERBACA dari kolom mana
              yang terisi: retur mengisi sales_return_code_id, penghapusan
              deposit mengisi sales_deposit_code_id, dan yang dicatat tangan
              tidak mengisi keduanya.

              Diturunkan begitu, bukan diketik, karena keterangan yang
              diketik bisa berbohong: baris bertuliskan "dari retur" yang
              tidak menunjuk retur mana pun tidak bisa ditelusuri siapa pun.
            */
            sales_return_code: { select: { name: true } },
            sales_deposit_code: { select: { name: true } },
            user_overpayment_created_byTouser: {
              include: {
                user_avatar: true,
              },
            },
          },
          orderBy: orderBy,
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
        }),
        this.prisma.overpayment.count({ where: where }),
        /*
          Nilai ikut dijumlahkan, bukan hanya dihitung barisnya: banner di
          atas daftar menyebut berapa RUPIAH yang masih menunggu, dan
          angka itu harus milik seluruh tabel, bukan halaman yang tampil.
        */
        this.prisma.overpayment.aggregate({
          where: menunggu,
          _count: true,
          _sum: { value: true },
        }),
        this.prisma.overpayment.aggregate({
          where: lewatTempo,
          _count: true,
          _sum: { value: true },
        }),
        this.prisma.overpayment.aggregate({
          where: { is_resolved: true },
          _count: true,
          _sum: { value: true },
        }),
      ]);

    return {
      data: result.map((x) => {
        return OverpaymentCodeModel.fromMap(x);
      }),
      count: count,
      summary: {
        waiting: ringkasMenunggu._count,
        overdue: ringkasLewatTempo._count,
        waitingValue: Number(ringkasMenunggu._sum.value ?? 0),
        overdueValue: Number(ringkasLewatTempo._sum.value ?? 0),
        resolved: ringkasSelesai._count,
        resolvedValue: Number(ringkasSelesai._sum.value ?? 0),
      },
    };
  }

  /**
   * Menandai sebuah kelebihan bayar sudah dikembalikan.
   *
   * Mengembalikan false bila catatannya tidak ada ATAU sudah ditandai
   * sebelumnya — keduanya berarti tidak ada yang berubah, dan pemanggilnya
   * berhak tahu itu. Diperiksa lewat updateMany dengan syarat is_resolved
   * masih false, jadi dua penekanan yang datang bersamaan tidak sama-sama
   * berhasil.
   */
  async resolve(id: number): Promise<boolean> {
    const hasil = await this.prisma.overpayment.updateMany({
      where: {
        id: id,
        is_resolved: false,
      },
      data: {
        is_resolved: true,
      },
    });

    return hasil.count > 0;
  }

  async fetchReportByDate(date: Date) {
    const result = await this.prisma.overpayment.findMany({
      where: {
        return_payment_date: date,
      },
    });

    return result.map((x) => {
      return OverpaymentCodeModel.fromMap(x);
    });
  }

  /*
    Kelebihan bayar per hari untuk grafik laporan uang masuk — dua arah:
    diterima (date) dan dikembalikan (return_payment_date).
  */
  async sumHarianMasuk(
    mulai: Date,
    sebelum: Date
  ): Promise<{ date: Date; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT date AS tanggal, SUM(value) AS nilai
        FROM overpayment
        WHERE date >= ${mulai} AND date < ${sebelum}
        GROUP BY date
      `;
    return result.map((x) => {
      return { date: x.tanggal, value: Number(x.nilai) };
    });
  }

  async sumHarianKeluar(
    mulai: Date,
    sebelum: Date
  ): Promise<{ date: Date; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT return_payment_date AS tanggal, SUM(value) AS nilai
        FROM overpayment
        WHERE return_payment_date >= ${mulai} AND return_payment_date < ${sebelum}
        GROUP BY return_payment_date
      `;
    return result.map((x) => {
      return { date: x.tanggal, value: Number(x.nilai) };
    });
  }

  async fetchReportByReceiveDate(date: Date): Promise<
    {
      payment_method_id: number | null;
      value: number;
    }[]
  > {
    const result = await this.prisma.overpayment.groupBy({
      by: ["payment_method_id"],
      _sum: {
        value: true,
      },
      where: {
        date: date,
      },
    });

    return result.map((x) => {
      return {
        payment_method_id: x.payment_method_id,
        value: Number(x._sum.value),
      };
    });
  }

  async fetchReportByReturnDate(date: Date): Promise<
    {
      payment_method_id: number | null;
      value: number;
    }[]
  > {
    const result = await this.prisma.overpayment.groupBy({
      by: ["payment_method_id"],
      _sum: {
        value: true,
      },
      where: {
        return_payment_date: date,
      },
    });

    return result.map((x) => {
      return {
        payment_method_id: x.payment_method_id,
        value: Number(x._sum.value),
      };
    });
  }

  async fetchByID(id: number) {
    const result = await this.prisma.overpayment.findUnique({
      where: {
        id: id,
      },
      include: {
        customer: true,
        sales_return_code: { select: { name: true } },
        sales_deposit_code: { select: { name: true } },
        user_overpayment_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        payment_method: true,
      },
    });

    if (!result) {
      return null;
    }

    return OverpaymentCodeModel.fromMap(result);
  }
}
