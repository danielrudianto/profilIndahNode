import { PrismaClient } from "@prisma/client";
import { IFetchPagination } from "../interfaces/fetch.interface";
import { CompanyModel } from "../models/company.model";
import { ExpenseModel } from "../models/expense.model";
import { IExpense } from "../interfaces/expense.interface";
import ExpenseTypeModel from "../models/expense-type.model";
import {
  DateHelper,
  formatDate,
  rentangBulanUTC,
  rentangTahunUTC,
} from "../utils/date.helper";

export class ExpenseRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IExpense) {
    try {
      const result = await this.prisma.expense.create({
        data: {
          description: data.description,
          date: data.date,
          company_id: data.company_id,
          value: data.value,
          created_by: data.created_by,
          created_at: data.created_at,
          expense_type_id: data.expense_type_id,
        },
      });

      return new ExpenseModel({
        id: result.id,
        description: result.description,
        date: result.date,
        company_id: result.company_id,
        value: Number(result.value),
        created_by: result.created_by,
        created_at: result.created_at,
        expense_type_id: result.expense_type_id,
      });
    } catch (error) {
      console.error(`[error]: Error on creating expense ${error}`);
      throw error;
    }
  }

  async update(data: IExpense) {
    try {
      const id = data.id!;
      const result = await this.prisma.expense.update({
        where: { id },
        data: {
          description: data.description,
          date: data.date,
          company_id: data.company_id,
          value: data.value,
          created_by: data.created_by,
          created_at: data.created_at,
          expense_type_id: data.expense_type_id,
        },
      });

      return new ExpenseModel({
        id: result.id,
        description: result.description,
        date: result.date,
        company_id: result.company_id,
        value: Number(result.value),
        created_by: result.created_by,
        created_at: result.created_at,
        expense_type_id: result.expense_type_id,
      });
    } catch (error) {
      console.error(`[error]: Error on updating expense ${error}`);
      throw error;
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.expense.update({
        where: { id },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return ExpenseModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on deleting expense ${error}`);
      throw error;
    }
  }

  async fetch(data: IFetchPagination) {
    try {
      const where: any = {
        date: {
          gte: rentangBulanUTC(data.year, data.month).mulai,
          lt: rentangBulanUTC(data.year, data.month).sebelum,
        },
        is_delete: false,
      };

      const [result, count] = await Promise.all([
        this.prisma.expense.findMany({
          where,
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          orderBy: { date: "desc" },
          include: {
            expense_type: true,
            company: true,
          },
        }),
        this.prisma.expense.count({ where }),
      ]);

      return {
        data: result.map(
          (item) =>
            new ExpenseModel({
              id: item.id,
              description: item.description,
              date: item.date,
              company_id: item.company_id,
              value: Number(item.value),
              created_by: item.created_by,
              created_at: item.created_at,
              expense_type_id: item.expense_type_id,
              expense_type: ExpenseTypeModel.fromMap(item.expense_type),
              company: CompanyModel.fromMap(item.company),
            })
        ),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching expenses ${error}`);
      throw error;
    }
  }

  async fetchSum(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await this.prisma.expense.aggregate({
        _sum: {
          value: true,
        },
        where: {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      return Number(result._sum.value) || 0;
    } catch (error) {
      console.error(`[error]: Error on fetching expense sum ${error}`);
      throw error;
    }
  }

  /*
    Beban satu perusahaan sebulan, dikelompokkan per jenis.

    Dikelompokkan di basis data, bukan di frontend: laporan perusahaan cuma
    butuh ringkasannya, dan mengirim seluruh baris beban sebulan hanya untuk
    dijumlahkan di peramban memindahkan pekerjaan ke tempat yang paling jauh
    dari datanya.

    Beban tanpa jenis tetap terhitung — namanya null, dan pemanggilnya yang
    memberi label. Membuangnya di sini membuat jumlah rinciannya tidak cocok
    dengan totalnya.
  */
  async fetchCompanyExpenses(data: {
    companyID: number;
    mulai: Date;
    sebelum: Date;
  }): Promise<{ name: string | null; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT expense_type.name AS name, SUM(expense.value) AS value
      FROM expense
      LEFT JOIN expense_type ON expense.expense_type_id = expense_type.id
      WHERE expense.company_id = ${data.companyID}
      AND expense.is_delete = false
      AND expense.date >= ${data.mulai}
      AND expense.date < ${data.sebelum}
      GROUP BY expense_type.id, expense_type.name
      ORDER BY value DESC
    `;

    return result.map((x) => ({
      name: x.name ?? null,
      value: Number(x.value ?? 0),
    }));
  }

  async fetchReport(month: number, year: number) {
    try {
      if (month == 0) {
        const result = await this.prisma.expense.findMany({
          where: {
            /*
              Dulu batas atasnya `new Date(year + 1, 0, 0)` — hari ke-0 Januari
              tahun berikutnya, yang berarti 31 Desember tahun INI. Dengan
              operator "lebih kecil", 31 Desember terbuang dari laporan
              tahunan setiap tahun.
            */
            date: {
              gte: rentangTahunUTC(year).mulai,
              lt: rentangTahunUTC(year).sebelum,
            },
            is_delete: false,
          },
          orderBy: { date: "desc" },
          /* Nama jenisnya ikut supaya laporan bisa menyebut "Listrik", bukan
             nomor jenis. Tanpa ini sorotan pengeluaran terbesar mustahil
             ditulis dalam kalimat yang bisa dibaca pemilik. */
          include: { expense_type: true },
        });

        return result.map((x) => {
          return ExpenseModel.fromMap(x);
        });
      } else {
        const result = await this.prisma.expense.findMany({
          where: {
            date: {
              gte: rentangBulanUTC(year, month).mulai,
              lt: rentangBulanUTC(year, month).sebelum,
            },
            is_delete: false,
          },
          orderBy: { date: "desc" },
          /* Nama jenisnya ikut supaya laporan bisa menyebut "Listrik", bukan
             nomor jenis. Tanpa ini sorotan pengeluaran terbesar mustahil
             ditulis dalam kalimat yang bisa dibaca pemilik. */
          include: { expense_type: true },
        });

        return result.map((x) => {
          return ExpenseModel.fromMap(x);
        });
      }
    } catch (error) {
      console.error(`[error]: Error on fetching expense report ${error}`);
      throw error;
    }
  }

  /*
    Total beban per bulan pada satu jendela tanggal — pasangan
    StockOutRepository.trendBulanan untuk grafik laporan keuangan.
    Bulan tanpa beban tidak menghasilkan baris; pengisi nolnya di
    controller.
  */
  async trendBulanan(
    mulai: Date,
    sebelum: Date
  ): Promise<{ year: number; month: number; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT
          YEAR(expense.date) AS tahun,
          MONTH(expense.date) AS bulan,
          SUM(expense.value) AS nilai
        FROM expense
        WHERE expense.date >= ${DateHelper.convertDate(
          mulai,
          formatDate.YYYYMMDD
        )}
        AND expense.date < ${DateHelper.convertDate(
          sebelum,
          formatDate.YYYYMMDD
        )}
        AND expense.is_delete = 0
        GROUP BY tahun, bulan
      `;

    return result.map((x) => {
      return {
        year: Number(x.tahun),
        month: Number(x.bulan),
        value: Number(x.nilai ?? 0),
      };
    });
  }

  async fetchByID(id: number) {
    const result = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        expense_type: true,
        user_expense_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        user_expense_deleted_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        company: true,
      },
    });

    if (!result) {
      return null;
    }

    return ExpenseModel.fromMap(result);
  }
}
