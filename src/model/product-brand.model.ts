import { prisma } from "../helper/database.helper";
import { UserViewModel } from "./user.model";

export interface IProductBrand {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  can_delete?: boolean | string;

  user?: UserViewModel;
}

export interface IProductBrandView {
  id?: number;
  name: string;
}

export class ProductBrandModel {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean;

  user?: UserViewModel;

  constructor(data: IProductBrand) {
    this.id = data.id;
    this.name = data.name;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by || null;
    this.deleted_at = data.deleted_at || null;
    this.user = data.user; // user information if available

    // if can_delete is provided
    if (data.can_delete !== undefined) {
      if (typeof data.can_delete === "boolean") {
        this.can_delete = data.can_delete;
      } else if (typeof data.can_delete === "string") {
        this.can_delete = data.can_delete.toLowerCase() === "1";
      }
    }
  }

  static fromMap(data: any): ProductBrandModel {
    return new ProductBrandModel({
      id: data.id,
      name: data.name,
      created_by: data.created_by,
      created_at: data.created_at,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
      can_delete: data.can_delete,
      user:
        data.user == undefined ? undefined : UserViewModel.fromMap(data.user),
    });
  }
}

export class ProductBrandViewModel {
  id?: number;
  name: string;

  constructor(data: IProductBrandView) {
    this.id = data.id;
    this.name = data.name;
  }

  static fromMap(data: any): ProductBrandViewModel {
    return new ProductBrandViewModel({
      id: data.id,
      name: data.name,
    });
  }
}
