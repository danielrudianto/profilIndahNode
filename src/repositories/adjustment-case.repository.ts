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
                  item_id: x.item_id,
                  item_unit_id: x.item_unit_id,
                  quantity: x.quantity,
                };
              }),
            },
          },
        },
        include: {
          adjustment_case: {
            include: {
              item: true,
              item_unit: true,
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
              item: true,
              item_unit: true,
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
              item: true,
              item_unit: true,
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
