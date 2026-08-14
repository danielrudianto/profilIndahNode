import { UserViewModel } from "../models/user.model";

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
  updated_by?: number | null;
  updated_at?: Date | null;
  can_delete?: boolean;

  user?: UserViewModel;
}
