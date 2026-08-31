import { IAdjustmentCaseCode } from "../interfaces/adjustment-case.interface";
import { PrismaClient } from "@prisma/client";
import AdjustmentCaseModel from "../models/adjustment-case.model";
import {
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";
import { rentangBulanUTC } from "../utils/date.helper";

export class AdjustmentCaseRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IAdjustmentCaseCode) {
    try {
      const result = await this.prisma.adjustment_case_code.create({
        data: {
          name: data.name,
          date: data.date,
          created_by: data.created_by!,
          created_at: data.created_at!,
          is_confirm: false,
          confirmed_at: null,
          confirmed_by: null,
          company_id: data.company_id,
          adjustment_case: {
            createMany: {
              data: data.adjustment_case.map((x) => {
                return {
                  product_id: x.product_id,
                  product_unit_id: x.product_unit_id,
                  quantity: x.quantity,
                };
              }),
            },
          },
        },
        include: {
          adjustment_case: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return AdjustmentCaseModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating adjustment case: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async updateProductStock() {
    const result = await this.prisma.adjustment_case.findMany({
      where: {
        adjustment_case_code: {
          is_confirm: true,
          is_delete: false,
        },
      },
      include: {
        product_unit: true,
      },
    });

    const response: any[] = [];
    result.forEach((x) => {
      const index = response.findIndex((r) => r.product_id === x.product_id);
      if (index < 0) {
        response.push({
          product_id: x.product_id,
          quantity:
            Number(x.quantity) *
            (x.product_unit == null ? 1 : Number(x.product_unit.conversion)),
        });
      } else {
        response[index].quantity +=
          Number(x.quantity) *
          (x.product_unit == null ? 1 : Number(x.product_unit.conversion));
      }
    });

    return response;
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          is_confirm: false,
          confirmed_at: new Date(),
          confirmed_by: userID,
        },
      });

      return AdjustmentCaseModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while deleting adjustment case: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.adjustment_case_code.findUnique({
        where: {
          id: id,
        },
        include: {
          adjustment_case: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          company: true,
          user_adjustment_case_code_created_byTouser: {
            include: {
              user_avatar: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return AdjustmentCaseModel.fromMap(result);
    } catch (error) {
      console.error(
        `[error]: Error while fetching adjustment case by ID: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  /*
    Laporan per perusahaan, sisi masuk dari penyesuaian (barang temuan,
    quantity > 0) — agregat per produk dalam satuan dasar; kasus hilang
    (quantity < 0) sudah terhitung di sisi keluar lewat stock_out.
  */
  async fetchCompanySummary(data: {
    companyID: number;
    mulai: Date;
    sebelum: Date;
  }) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT product.reference, product.description, product.unit,
        SUM(adjustment_case.quantity * COALESCE(product_unit.conversion, 1)) AS quantity,
        COUNT(DISTINCT adjustment_case_code.id) AS documents
      FROM adjustment_case
      JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
      JOIN product ON adjustment_case.product_id = product.id
      LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
      WHERE adjustment_case_code.company_id = ${data.companyID}
      AND adjustment_case_code.is_delete = 0
      AND adjustment_case.quantity > 0
      AND adjustment_case_code.date >= ${data.mulai}
      AND adjustment_case_code.date < ${data.sebelum}
      GROUP BY product.id, product.reference, product.description, product.unit
      ORDER BY quantity DESC
    `;

    return result.map((x) => {
      return {
        reference: x.reference,
        description: x.description,
        unit: x.unit,
        quantity: Number(x.quantity),
        documents: Number(x.documents),
      };
    });
  }

  /** Baris rinci penyesuaian masuk — bahan unduhan Excel laporan perusahaan. */
  async fetchCompanyDetail(data: {
    companyID: number;
    mulai: Date;
    sebelum: Date;
  }) {
    const result = await this.prisma.adjustment_case.findMany({
      where: {
        quantity: { gt: 0 },
        adjustment_case_code: {
          is_delete: false,
          company_id: data.companyID,
          date: {
            gte: data.mulai,
            lt: data.sebelum,
          },
        },
      },
      include: {
        product: true,
        product_unit: true,
        adjustment_case_code: {
          select: {
            date: true,
            name: true,
          },
        },
      },
      orderBy: [{ adjustment_case_code_id: "asc" }, { id: "asc" }],
    });

    return result.map((x) => {
      return {
        date: x.adjustment_case_code.date,
        reference: x.product.reference,
        description: x.product.description,
        unit: x.product.unit,
        quantity:
          Number(x.quantity) *
          (x.product_unit == null ? 1 : Number(x.product_unit.conversion)),
        document: x.adjustment_case_code.name,
        opponent: "Internal",
      };
    });
  }

  async fetchUnconfirmed(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<AdjustmentCaseModel>> {
    try {
      const [result, count] = await Promise.all([
        this.prisma.adjustment_case_code.findMany({
          where: {
            is_confirm: false,
            is_delete: false,
          },
          orderBy: {
            date: "asc",
          },
          include: {
            user_adjustment_case_code_created_byTouser: {
              include: {
                user_avatar: true,
              },
            },
            company: true,
          },
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
        }),
        this.prisma.adjustment_case_code.count({
          where: {
            is_confirm: false,
            is_delete: false,
          },
        }),
      ]);

      return {
        data: result.map((x) => AdjustmentCaseModel.fromMap(x)),
        count: count,
      };
    } catch (error) {
      console.error(
        `[error]: Error while fetching unconfirmed adjustment cases: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchAnnualArchives() {
    try {
      const result = await this.prisma.$queryRaw<
        { year: number; month: number; count: BigInt }[]
      >`
        SELECT 
          EXTRACT(YEAR FROM date) AS year,
          EXTRACT(MONTH FROM date) AS month,
          COUNT(id) AS count
        FROM adjustment_case_code
        GROUP BY month, year
        ORDER BY year DESC, month DESC;
      `;

      return result.map((x) => {
        return {
          year: Number(x.year),
          month: Number(x.month),
          count: Number(x.count),
        };
      });
    } catch (error) {
      console.error(`[error]: Error while fetching annual archives: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchArchives(data: {
    year: number;
    month: number;
    page: number;
    pageSize: number;
    keyword: string;
    startDate: Date;
    endDate: Date;
    isConfirm: boolean;
    isReject: boolean;
    isPending: boolean;
    isLost: boolean;
    isFound: boolean;
    sortBy: string;
    sortDirection: "asc" | "desc";
  }) {
    let statusFilter;

    if (
      (!data.isConfirm && !data.isReject && !data.isPending) ||
      (data.isConfirm && data.isReject && data.isPending)
    ) {
      // All selected or none selected
      statusFilter = {
        OR: [
          {
            AND: [
              {
                is_confirm: true,
              },
              {
                is_delete: false,
              },
            ],
          },
          {
            AND: [
              {
                is_confirm: false,
              },
              {
                is_delete: true,
              },
            ],
          },
          {
            AND: [
              {
                is_confirm: false,
              },
              {
                is_delete: false,
              },
            ],
          },
        ],
      };
    } else {
      // At least one of the flags is selected
      const filters = [];

      if (data.isConfirm) {
        filters.push({
          AND: [
            {
              is_confirm: true,
            },
            {
              is_delete: false,
            },
          ],
        });
      }

      if (data.isPending) {
        filters.push({
          AND: [
            {
              is_confirm: false,
            },
            {
              is_delete: false,
            },
          ],
        });
      }

      if (data.isReject) {
        filters.push({
          AND: [
            {
              is_confirm: false,
            },
            {
              is_delete: true,
            },
          ],
        });
      }

      // Combine filters with OR
      statusFilter = {
        OR: filters,
      };
    }

    let typeFilter: any = {};
    if ((!data.isLost && !data.isFound) || (data.isLost && data.isFound)) {
      typeFilter = {
        OR: [
          {
            company_id: null,
          },
          {
            company_id: {
              not: null,
            },
          },
        ],
      };
    } else if (data.isLost) {
      statusFilter = {
        company_id: null,
      };
    } else {
      statusFilter = {
        company_id: {
          not: null,
        },
      };
    }

    let orderBy;

    if (data.sortBy == "date") {
      orderBy = {
        date: data.sortDirection,
      };
    } else if (data.sortBy == "name") {
      orderBy = {
        name: data.sortDirection,
      };
    } else if (data.sortBy == "type") {
      orderBy = {
        company: {
          name: data.sortDirection,
        },
      };
    }

    const [result, count] = await this.prisma.$transaction([
      this.prisma.adjustment_case_code.findMany({
        where: {
          AND: [
            {
              name: {
                contains: data.keyword,
              },
            },
            {
              date: {
                gte: rentangBulanUTC(data.year, data.month).mulai,
              },
            },
            {
              date: {
                lt: rentangBulanUTC(data.year, data.month).sebelum,
              },
            },
            {
              date: {
                gte: data.startDate,
              },
            },
            {
              date: {
                lte: data.endDate,
              },
            },
            statusFilter,
            typeFilter,
          ],
        },
        include: {
          company: true,
          /* Kolom "Dibuat oleh" pada daftar arsip (12a) — cukup namanya. */
          user_adjustment_case_code_created_byTouser: {
            select: {
              name: true,
            },
          },
        },
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
        orderBy: orderBy,
      }),
      this.prisma.adjustment_case_code.count({
        where: {
          OR: [
            {
              name: {
                contains: data.keyword,
              },
            },
            {
              company: {
                name: {
                  contains: data.keyword,
                },
              },
            },
          ],
          AND: [
            {
              date: {
                gte: rentangBulanUTC(data.year, data.month).mulai,
              },
            },
            {
              date: {
                lt: rentangBulanUTC(data.year, data.month).sebelum,
              },
            },
            {
              date: {
                gte: data.startDate,
              },
            },
            {
              date: {
                lte: data.endDate,
              },
            },
          ],
        },
      }),
    ]);

    return {
      data: result,
      count: count,
    };
  }

  async approve(id: number, userID: number) {
    try {
      const result = await this.prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_confirm: true,
          confirmed_at: new Date(),
          confirmed_by: userID,
        },
        include: {
          adjustment_case: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return AdjustmentCaseModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while approving adjustment case: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async reject(id: number, userID: number) {
    try {
      const result = await this.prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          is_confirm: false,
          confirmed_at: null,
          confirmed_by: null,
        },
      });

      return AdjustmentCaseModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while rejecting adjustment case: ${error}`);
      throw new Error("Internal server error");
    }
  }
}
