export interface IProductUnit {
  id?: number;
  product_id: number;
  unit: string;
  conversion: number;
  is_delete?: boolean;
  created_by?: number;
  created_at?: Date;
  sales_price: number;
  sales_discount: number;
  purchase_price: number;
  purchase_discount: number;
}

export interface IProductUnitView {
  id?: number;
  product_id: number;
  unit: string;
  conversion: number;
  sales_price?: number;
  sales_discount?: number;
  purchase_price?: number;
  purchase_discount?: number;
}
