import { IUserSales } from "../interfaces/user-sales.interface";
import { ProductTypeModel } from "./product-type.model";

export class UserSalesModel {
  id?: number;
  product_type_id: number;
  product_type: ProductTypeModel;

  constructor(data: IUserSales) {
    this.id = data.id;
    this.product_type_id = data.product_type_id;
    this.product_type = data.product_type;
  }

  static fromMap(data: any): UserSalesModel {
    return new UserSalesModel({
      id: data.id,
      product_type_id: data.product_type_id,
      product_type: ProductTypeModel.fromMap(data.product_type),
    });
  }
}
