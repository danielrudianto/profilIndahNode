import { ProductTypeModel } from "../models/product-type.model";

export interface IUserSales {
  id?: number;
  product_type_id: number;
  product_type: ProductTypeModel;
}
