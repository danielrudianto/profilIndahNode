import { CustomerModel } from "../model/customer.model";
import { ProductUnitModel } from "../model/product-unit.model";
import { ProductModel } from "../model/product.model";
import { UserViewModel } from "../model/user.model";
import { SalesDepositPaymentModel } from "./sales-deposit-payment.model";

export interface ISalesDepositCode {
  id?: number;
  name: string;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  discount: number;
  delivery: number;
  service: number;
  date: Date;
  uuid: string;
  deposit: ISalesDeposit[];
  deposit_payment: SalesDepositPaymentModel[];
  paymentTerm: number | null;
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

export class SalesDepositModel {
  id?: number;
  name: string;
  date: Date;
  discount: number;
  delivery: number;
  service: number;
  sales: string | null;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  is_confirm: boolean;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;
  isPaid: boolean;
  isDelete: boolean;
  uuid: string;
  payment_term: number | null = null;
  type: string;

  deposit?: ISalesDeposit[] = [];
  deposit_payment?: SalesDepositPaymentModel[] = [];

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
    this.date = data.date;
    this.is_confirm = data.isConfirm;
    this.confirmedBy = data.confirmedBy;
    this.confirmedAt = data.confirmedAt;
    this.uuid = data.uuid;
    this.isPaid = data.isPaid;
    this.sales = data.sales || null;
    this.isDelete = data.isDelete;
    this.type = data.type;
    this.deposit = data.deposit.map((item) => {
      return {
        id: item.id,
        product_id: item.product_id,
        product_unit_id: item.product_unit_id,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,

        product:
          item.product == undefined
            ? undefined
            : ProductModel.fromMap(item.product),
        product_unit:
          item.product_unit == undefined
            ? undefined
            : item.product_unit == null
            ? null
            : ProductUnitModel.fromMap(item.product_unit),
      };
    });
    this.deposit_payment = data.deposit_payment.map((payment) => {
      return {
        id: payment.id,
        sales_deposit_code_id: payment.sales_deposit_code_id,
        payment_method_id: payment.payment_method_id,
        value: payment.value,
        date: payment.date,
      };
    });
    this.payment_term = data.paymentTerm;
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
      deposit:
        data.deposit == undefined
          ? []
          : (data.deposit as any[]).map((item) => {
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
      deposit_payment: [],
      paymentTerm: data.payment_term,
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
