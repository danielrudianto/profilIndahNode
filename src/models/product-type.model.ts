import {
  IProductType,
  IProductTypeView,
} from "../interfaces/product-type.interface";
import { UserViewModel } from "./user.model";

export class ProductTypeModel {
  id?: number;
  name: string;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
  updated_by?: number;
  is_delete?: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  can_delete?: boolean | string;
  user_item_type_created_byTouser?: UserViewModel;

  constructor(data: IProductType) {
    this.id = data.id;
    this.name = data.name;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.updated_by = data.updated_by;
    this.is_delete = data.is_delete;
    this.deleted_at = data.deleted_at;
    this.deleted_by = data.deleted_by;
    this.can_delete = data.can_delete;

    if (data.user_item_type_created_byTouser) {
      this.user_item_type_created_byTouser = UserViewModel.fromMap(
        data.user_item_type_created_byTouser
      );
    }

    // if can_delete is provided
    if (data.can_delete !== undefined) {
      if (typeof data.can_delete === "boolean") {
        this.can_delete = data.can_delete;
      } else if (typeof data.can_delete === "string") {
        this.can_delete = data.can_delete === "1";
      }
    }
  }

  static fromMap(data: any): ProductTypeModel {
    return new ProductTypeModel({
      id: data.id,
      name: data.name,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
      is_delete: data.is_delete,
      deleted_at: data.deleted_at,
      deleted_by: data.deleted_by,
      can_delete: data.can_delete,
      user_item_type_created_byTouser: data.user_item_type_created_byTouser
        ? UserViewModel.fromMap(data.user_item_type_created_byTouser)
        : undefined,
    });
  }

  // static fetchSales(start_date: Date, end_date: Date) {
  //   return prisma.$queryRawUnsafe(`
  //   SELECT item_type.id, item_type.name, SUM((bill.price - bill.discount) * bill.quantity) AS value
  //   FROM bill
  //   JOIN item ON bill.item_id = item.id
  //   JOIN item_type ON item.item_type_id = item_type.id
  //   JOIN bill_code ON bill.bill_code_id = bill_code.id
  //   WHERE bill_code.is_confirm = 1
  //   AND bill_code.is_delete = 0
  //   AND bill_code.date >= '${start_date.getFullYear()}-${(
  //     start_date.getMonth() + 1
  //   )
  //     .toString()
  //     .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}'
  //   AND bill_code.date <= '${end_date.getFullYear()}-${(end_date.getMonth() + 1)
  //     .toString()
  //     .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}'
  //   GROUP BY item.item_type_id
  //   ORDER BY value DESC
  //   `);
  // }

  // static fetchFrequent(
  //   type_id: number,
  //   start_date: Date,
  //   end_date: Date,
  //   limit: number
  // ) {
  //   const formatted_start_date = `${start_date.getFullYear()}-${(
  //     start_date.getMonth() + 1
  //   )
  //     .toString()
  //     .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}`;
  //   const formatted_end_date = `${end_date.getFullYear()}-${(
  //     end_date.getMonth() + 1
  //   )
  //     .toString()
  //     .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}`;
  //   return prisma.$queryRawUnsafe(`
  //     SELECT item.reference, item.description, item_brand.name AS brand_name, item_type.name AS type_name, SUM(bill.quantity * IF(bill.item_unit_id IS NULL, 1, item_unit.conversion)) AS ordered
  //     FROM bill
  //     JOIN item ON bill.item_id = item.id
  //     LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
  //     JOIN item_brand ON item.item_brand_id = item_brand.id
  //     JOIN item_type ON item.item_type_id = item_type.id
  //     JOIN bill_code ON bill.bill_code_id = bill_code.id
  //     WHERE bill_code.date >= '${formatted_start_date}'
  //     AND bill_code.date <= '${formatted_end_date}'
  //     AND bill_code.is_confirm = 1
  //     AND item_type.id = ${type_id}
  //     GROUP BY bill.item_id
  //     ORDER BY ordered DESC
  //     LIMIT ${limit}
  //   `);
  // }

  // static deleteById(id: number, user_id: number) {
  //   return prisma.item_type.update({
  //     where: {
  //       id: id,
  //     },
  //     data: {
  //       is_delete: true,
  //       deleted_at: new Date(),
  //       deleted_by: user_id,
  //     },
  //     include: {
  //       user_item_type_deleted_byTouser: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // static fetchByIds(id: number[]) {
  //   return prisma.item_type.findMany({
  //     where: {
  //       id: {
  //         in: id,
  //       },
  //     },
  //   });
  // }
}

export class ProductTypeViewModel {
  id?: number;
  name: string;

  constructor(data: IProductTypeView) {
    this.id = data.id;
    this.name = data.name;
  }

  static fromMap(data: any): ProductTypeViewModel {
    return new ProductTypeViewModel({
      id: data.id,
      name: data.name,
    });
  }
}
