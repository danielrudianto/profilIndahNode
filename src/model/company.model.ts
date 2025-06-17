import { UserViewModel } from "./user.model";

export interface ICompany {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  created_at: Date;
  is_delete?: boolean;
  can_delete?: boolean;
  updated_by?: number;
  updated_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;

  user_company_deleted_byTouser?: UserViewModel;
}

export interface ICompanyUpdate extends ICompany {
  id: number;
}

export class CompanyModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  is_delete?: boolean = false;
  can_delete?: boolean;
  created_at?: Date;
  updated_by?: number;
  updated_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;

  user_company_deleted_byTouser?: UserViewModel;

  constructor(data: ICompany) {
    this.name = data.name;
    this.address = data.address;
    this.npwp = data.npwp;
    this.created_by = data.created_by;
    this.is_delete = data.is_delete || false;
    this.can_delete = data.can_delete;
    this.created_at = new Date();
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;

    this.user_company_deleted_byTouser = data.user_company_deleted_byTouser;

    if (data.id) {
      this.id = data.id;
    }
  }
}
