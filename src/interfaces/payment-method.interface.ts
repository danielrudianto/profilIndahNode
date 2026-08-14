export interface IPaymentMethod {
  id?: number;
  name: string;
  description: string;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean;
}

export interface IPaymentMethodView {
  id: number | null;
  name: string;
  description: string;
}
