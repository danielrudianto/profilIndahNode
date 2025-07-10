import { PrismaClient } from "@prisma/client";
import AdjustmentCaseModel, {
  IAdjustmentCaseCode,
} from "../model/adjustment-case.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";

export class AdjustmentCaseRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
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

  async delete(id: number) {
    try {
      const result = await this.prisma.adjustment_case_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
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
    const result = await this.prisma.$queryRaw<
      { year: number; count: number }[]
    >`
      SELECT YEAR(date) AS year, COUNT(*) AS count
      FROM adjustment_case_code
      GROUP BY YEAR(date)
      ORDER BY YEAR(date) DESC
    `;

    return result.map((x) => ({
      year: x.year,
      count: x.count,
    }));
  }

  async fetchMonthlyArchives(year: number) {
    const result = await this.prisma.$queryRaw<
      { month: number; count: number }[]
    >`
      SELECT MONTH(date) AS month, COUNT(*) AS count
      FROM adjustment_case_code
      WHERE YEAR(date) = ${year}
      GROUP BY MONTH(date)
      ORDER BY MONTH(date) DESC
    `;

    return result.map((x) => ({
      month: x.month,
      count: x.count,
    }));
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
