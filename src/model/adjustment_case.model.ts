import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AdjustmentCaseModel {
  id?: number | null;
  item_id: number;
  item_unit_id: number | null;
  quantity: number;
  adjustment_case_code_id: number;

  constructor(
    item_id: number,
    item_unit_id: number | null,
    quantity: number,
    adjustment_case_code_id: number,
    id: number | null = null
  ) {
    this.item_id = item_id;
    this.item_unit_id = item_unit_id;
    this.quantity = quantity;
    this.adjustment_case_code_id = adjustment_case_code_id;
    if (this.id != null) {
      this.id = id;
    }
  }
  
  static createMany(items: AdjustmentCaseModel[]) {
    return prisma.adjustment_case.createMany({
      data: items.map((x) => {
        return {
          ...x,
          id: undefined,
        };
      }),
    });
  }

  static fetchById(id: number) {
    return prisma.adjustment_case.findUnique({
      where: {
        id: id,
      },
      select: {
        adjustment_case_code: {
          select: {
            name: true,
            id: true,
            is_confirm: true,
            is_delete: true,
            user_adjustment_case_code_created_byTouser: {
              select: {
                name: true,
              },
            },
            created_at: true,
            adjustment_case: {
              select: {
                id: true,
                item: {
                  select: {
                    reference: true,
                    description: true,
                  },
                },
                quantity: true,
              },
            },
          },
        },
      },
    });
  }
}

export default AdjustmentCaseModel;
