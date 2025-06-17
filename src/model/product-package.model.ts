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
}
