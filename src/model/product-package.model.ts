import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface ICreateProductPackageCode {
  name: string;
  description: string;
  price: number;
  created_by?: number;
  is_delete?: boolean;
  items?: IProductPackage[];
}

interface IProductPackage {
  item_id: number;
  item_unit_id: number;
  quantity: number;
  price: number;
  discount: number;
}

export class ProductPackageCodeModel {
  static create(data: ICreateProductPackageCode) {
    return prisma.package_code.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        created_by: data.created_by!,
        is_delete: data.is_delete,
        created_at: new Date(),
        package_content: {
          createMany: {
            data: data.items!.map((x) => {
              return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
              };
            }),
          },
        },
      },
      include: {
        package_content: {
          include: {
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
      },
    });
  }

  static fetch = (page: number = 1, keyword: string = "") => {
    return prisma.$transaction([
      prisma.package_code.findMany({
        where: {
          is_delete: false,
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
        include: {
          package_content: {
            include: {
              item: {
                select: {
                  reference: true,
                  description: true,
                  unit: true,
                },
              },
              item_unit: {
                select: {
                  unit: true,
                  conversion: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * 10,
        take: 10,
        orderBy: {
          name: "asc",
        },
      }),
      prisma.package_code.count({
        where: {
          is_delete: false,
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
      }),
    ]);
  };

  static fetchAll = () => {
    return prisma.package_code.findMany({
      where: {
        is_delete: false,
      },
      include: {
        package_content: {
          include: {
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  };

  static fetchByID = (id: number) => {
    return prisma.package_code.findUnique({
      where: {
        id: id,
      },
      include: {
        package_content: {
          include: {
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
      },
    });
  };

  static update = (
    name: string,
    description: string,
    price: number,
    id: number
  ) => {
    return prisma.package_code.update({
      where: {
        id: id,
      },
      data: {
        name: name,
        description: description,
        price: price,
      },
      include: {
        package_content: {
          include: {
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
          },
        },
      },
    });
  };

  static delete = (id: number, deletedBy: number) => {
    return prisma.package_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  };

  static updatePrice = (data: any[]) => {
    const transactions = data.map((x) => {
      return prisma.package_code.update({
        where: {
          id: x.id,
        },
        data: {
          price: x.price,
        },
      });
    });

    return prisma.$transaction(transactions);
  };
}
