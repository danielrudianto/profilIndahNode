import { user } from "./user";

export interface company {
  id?: number;
  code_name: string;
  name: string;
  address: string;
  npwp?: string;
  created_by?: number;
  created_at?: Date;
  user?: user;
}
