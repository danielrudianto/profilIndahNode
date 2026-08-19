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
  product_count?: number;
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
    this.product_count = data.product_count;

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
