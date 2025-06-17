import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface IPackageCode {
  id?: number;
  name: string;
  description: string;
  price: number;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  package_content?: IPackageContent[];
}

export interface IPackageContent {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  
  package_code_id?: number;
}

export class PackageCodeModel {
  id?: number;
  name: string;
  description: string;
  price: number;
  created_by?: number;
  created_at?: Date;
  package_content?: IPackageContent[];
  is_delete?: boolean;

  constructor(data: IPackageCode) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.package_content = data.package_content;
    this.is_delete = data.is_delete;
  }

  static fromMap(data: any): PackageCodeModel {
    return new PackageCodeModel({
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      created_by: data.created_by,
      created_at: data.created_at,
      is_delete: data.is_delete,
      package_content: data.package_content.map((content: any) => ({
        id: content.id,
        item_id: content.item_id,
        item_unit_id: content.item_unit_id,
        quantity: Number(content.quantity),
        price: Number(content.price),
        discount: Number(content.discount),
        package_code_id: content.package_code_id,
        // item can be undefined
        item: content.item
          ? {
              id: content.item.id,
              reference: content.item.reference,
              description: content.item.description,
              unit: content.item.unit,
            }
          : undefined,
        item_unit: content.item_unit
          ? {
              id: content.item_unit.id,
              conversion: Number(content.item_unit.conversion),
              unit: content.item_unit.unit,
            }
          : undefined,
      })),
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
              product: true,
              product_unit: true,
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
            product: true,
            product_unit: true,
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
            product: true,
            product_unit: true,
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
            product: true,
            product_unit: true,
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
