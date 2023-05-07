import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ExpenseTypeModel {
  id?: number;
  name: string;
  description: string;
  parent_id: number | null;
  created_by: number;
  created_at: Date;

  constructor(
    name: string,
    description: string,
    parent_id: number | null,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.description = description;
    this.parent_id = parent_id;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.expense_type.create({
      data: {
        name: this.name,
        description: this.description,
        created_by: this.created_by,
        created_at: this.created_at,
        parent_id: this.parent_id,
      },
    });
  }

  update() {
    return prisma.expense_type.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        description: this.description,
      },
    });
  }

  static delete(id: number, created_by: number) {
    return prisma.expense_type.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: created_by,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
      },
    });
  }

  static fetchAutocomplete(keyword: string, mode: string) {
    if (mode == "parent") {
      return prisma.expense_type.findMany({
        where: {
          is_delete: false,
          parent_id: null,
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              description: {
                contains: keyword,
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    } else {
      return prisma.expense_type.findMany({
        where: {
          is_delete: false,
          parent_id: {
            not: null,
          },
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              description: {
                contains: keyword,
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    }
  }

  static fetch(parent_id: number | null) {
    return prisma.expense_type.findMany({
      where: {
        is_delete: false,
        parent_id: parent_id,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  }

  static fetchChild() {
    return prisma.expense_type.findMany({
      where: {
        is_delete: false,
        parent_id: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
      },
    });
  }

  static fetchById(id: number) {
    return prisma.expense_type.findUnique({
      where: {
        id: id,
      },
    });
  }
}

export default ExpenseTypeModel;
