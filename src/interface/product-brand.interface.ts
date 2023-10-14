export interface ProductBrand {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  can_delete?: boolean;

  user_name?: string;
}
