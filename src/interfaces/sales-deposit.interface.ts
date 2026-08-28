import { CustomerModel } from "../models/customer.model";
import { ProductUnitModel } from "../models/product-unit.model";
import { ProductModel } from "../models/product.model";
import { UserViewModel } from "../models/user.model";
import { SalesDepositPaymentModel } from "../models/sales-deposit-payment.model";
import { ServiceType } from "../constants/service-type.constant";

export interface ISalesDepositCode {
  id?: number;
  name: string;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  discount: number;
  delivery: number;
  service: number;
  adminFee: number;
  serviceType: ServiceType | null;
  date: Date;
  uuid: string;
  sales_deposit: ISalesDeposit[];
  sales_deposit_payment: SalesDepositPaymentModel[];
  isPaid: boolean;
  isConfirm: boolean;
  isDelete: boolean;
  sales: string | null;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;
  type: string;

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;
}

export interface ISalesDeposit {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  product?: ProductModel;
  product_unit?: ProductUnitModel | null;
}
