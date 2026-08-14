import { ISupplier } from "../interfaces/supplier.interface";
import { UserViewModel } from "./user.model";

class SupplierModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  created_at: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean = false;
  updated_by?: number | null;
  updated_at?: Date | null;
  user?: UserViewModel;

  constructor(data: ISupplier) {
    this.id = data.id;
    this.name = data.name;
    this.address = data.address;
    this.npwp = data.npwp;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
    this.can_delete = data.can_delete;
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
  }

  static fromMap(data: any) {
    return new SupplierModel({
      id: data.id,
      name: data.name,
      address: data.address,
      npwp: data.npwp,
      created_by: data.created_by,
      created_at: data.created_at,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
      can_delete: data.can_delete == "1",
      updated_by: data.updated_by,
      updated_at: data.updated_at,
      user: data.user ? UserViewModel.fromMap(data.user) : undefined,
    });
  }
}

export default SupplierModel;
