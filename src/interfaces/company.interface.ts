import { UserViewModel } from "../models/user.model";

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
