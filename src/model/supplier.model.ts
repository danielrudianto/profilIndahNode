import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ISupplier {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  created_at: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean;
}

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

  constructor(data: ISupplier) {
    this.id = data.id;
    this.name = data.name;
    this.address = data.address;
    this.npwp = data.npwp || null;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by || null;
    this.deleted_at = data.deleted_at || null;
    this.can_delete = data.can_delete || false;
  }

  static fromMap(data: any) {
    return new SupplierModel({
      id: data.id,
      name: data.name,
      address: data.address,
      npwp: data.npwp || null,
      created_by: data.created_by,
      created_at: data.created_at || new Date(),
      is_delete: data.is_delete || false,
      deleted_by: data.deleted_by || null,
      deleted_at: data.deleted_at || null,
      can_delete: (data.count || 0) == 0,
    });
  }
}

export default SupplierModel;
