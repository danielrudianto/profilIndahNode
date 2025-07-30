import { PrismaClient } from "@prisma/client";
import AdjustmentCaseModel, {
  IAdjustmentCaseCode,
} from "../model/adjustment-case.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import { IFetchArchive } from "../interface/archive.interface";

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
        ORDER BY date DESC;
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
    isActive: boolean;
    isDelete: boolean;
    isLost: boolean;
    isFound: boolean;
    sortBy: string;
    sortDirection: "asc" | "desc";
  }) {
    let statusFilter: any = {};
    if (
      (!data.isActive && !data.isDelete) ||
      (data.isActive && data.isDelete)
    ) {
      statusFilter = {
        OR: [
          {
            is_delete: false,
          },
          {
            is_delete: true,
          },
        ],
      };
    } else if (data.isActive) {
      statusFilter = {
        is_delete: false,
      };
    } else {
      statusFilter = {
        is_delete: true,
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

    console.log(statusFilter);
    console.log(typeFilter);

    try {
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
                  gte: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lte: new Date(data.year, data.month, 0),
                },
              },
              statusFilter,
              typeFilter,
            ],
          },
          include: {
            company: true,
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
                  gte: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lte: new Date(data.year, data.month, 0),
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
    } catch (error) {
      throw error;
    }
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
