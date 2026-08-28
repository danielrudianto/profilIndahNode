import {
  ISalesDepositCode,
  ISalesDeposit,
} from "../interfaces/sales-deposit.interface";
import { CustomerModel } from "../models/customer.model";
import { ProductUnitModel } from "../models/product-unit.model";
import { ProductModel } from "../models/product.model";
import { UserViewModel } from "../models/user.model";
import { PaymentMethodViewModel } from "./payment-method.model";
import { SalesDepositPaymentModel } from "./sales-deposit-payment.model";
import { ServiceType } from "../constants/service-type.constant";

export class SalesDepositModel {
  id?: number;
  name: string;
  date: Date;
  discount: number;
  delivery: number;
  service: number;
  serviceType: ServiceType | null;
  sales: string | null;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  isConfirm: boolean;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;
  isPaid: boolean;
  isDelete: boolean;
  uuid: string;
  type: string;

  sales_deposit?: ISalesDeposit[] = [];
  sales_deposit_payment?: SalesDepositPaymentModel[] = [];

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;

  constructor(data: ISalesDepositCode) {
    this.id = data.id;
    this.name = data.name;
    this.customerID = data.customerID;
    this.customer = data.customer;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.discount = data.discount;
    this.delivery = data.delivery;
    this.service = data.service;
    this.serviceType = data.serviceType;
    this.date = data.date;
    this.isConfirm = data.isConfirm;
    this.confirmedBy = data.confirmedBy;
    this.confirmedAt = data.confirmedAt;
    this.uuid = data.uuid;
    this.isPaid = data.isPaid;
    this.sales = data.sales || null;
    this.isDelete = data.isDelete;
    this.type = data.type;
    this.sales_deposit = data.sales_deposit;
    this.sales_deposit_payment = data.sales_deposit_payment;
    this.customer = data.customer;
    this.user_bill_code_created_byTouser = data.user_bill_code_created_byTouser;
    this.user_bill_code_confirmed_byTouser =
      data.user_bill_code_confirmed_byTouser;
  }

  static fromMap(data: any) {
    return new SalesDepositModel({
      id: data.id,
      name: data.name,
      date: data.date,
      discount: Number(data.discount),
      delivery: Number(data.delivery),
      service: Number(data.service),
      serviceType: data.service_type ?? null,
      sales: data.sales,
      customerID: data.customer_id,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      isConfirm: data.is_confirm,
      confirmedBy: data.confirmed_by,
      confirmedAt: data.confirmed_at,
      isPaid: data.is_paid,
      isDelete: data.is_delete,
      uuid: data.uuid,
      type: data.type,
      sales_deposit:
        data.sales_deposit == undefined
          ? []
          : (data.sales_deposit as any[]).map((item) => {
              return {
                id: item.id,
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                quantity: Number(item.quantity),
                price: Number(item.price),
                discount: Number(item.discount),

                product:
                  item.product == undefined
                    ? undefined
                    : ProductModel.fromMap(item.product),
                product_unit:
                  item.product_unit == null
                    ? null
                    : item.product_unit == undefined
                      ? undefined
                      : ProductUnitModel.fromMap(item.product_unit),
              };
            }),
      sales_deposit_payment:
        data.sales_deposit_payment == undefined
          ? undefined
          : data.sales_deposit_payment.map((x: any) => {
              return new SalesDepositPaymentModel({
                id: x.id,
                date: new Date(x.date),
                value: Number(x.value),
                payment_method_id: x.payment_method_id,
                payment_method:
                  x.payment_method == undefined
                    ? undefined
                    : x.payment_method == null
                      ? null
                      : new PaymentMethodViewModel({
                          id: x.payment_method_id,
                          name: x.payment_method.name,
                          description: x.payment_method.description,
                        }),
                sales_deposit_code_id: data.id,
              });
            }),
      customer:
        data.customer == null
          ? null
          : data.customer == undefined
            ? undefined
            : CustomerModel.fromMap(data.customer),

      user_bill_code_created_byTouser:
        data.user_bill_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_bill_code_created_byTouser),
      user_bill_code_confirmed_byTouser:
        data.user_bill_code_confirmed_byTouser == undefined
          ? undefined
          : data.user_bill_code_confirmed_byTouser == null
            ? null
            : UserViewModel.fromMap(data.user_bill_code_confirmed_byTouser),
    });
  }
}
