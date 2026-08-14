export interface IPackageCode {
  id?: number;
  name: string;
  description: string;
  price: number;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  package_content?: IPackageContent[];
}

export interface IPackageContent {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;

  package_code_id?: number;
}

export interface IPackagePrice {
  package_code_id: number;
  price: number;
}
