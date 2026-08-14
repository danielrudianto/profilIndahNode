import {
  ISalesInvoiceCode,
  ISalesInvoice,
} from "../interfaces/sales-invoice.interface";
import { ProductModel } from "./product.model";
import { CustomerModel } from "./customer.model";
import { SalesInvoicePaymentModel } from "./sales-invoice-payment.model";
import { ProductUnitModel } from "./product-unit.model";
import { UserViewModel } from "./user.model";
import { PaymentMethodViewModel } from "./payment-method.model";

export class SalesInvoiceModel {
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

  sales_invoice?: ISalesInvoice[] = [];
  sales_invoice_payment?: SalesInvoicePaymentModel[] = [];

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;

  constructor(data: ISalesInvoiceCode) {
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
    this.sales = data.sales;
    this.isDelete = data.isDelete;
    this.sales_invoice = data.sales_invoice;
    this.sales_invoice_payment = data.sales_invoice_payment;
    this.customer = data.customer;
    this.user_bill_code_created_byTouser = data.user_bill_code_created_byTouser;
    this.user_bill_code_confirmed_byTouser =
      data.user_bill_code_confirmed_byTouser;
  }

  static fromMap(data: any) {
    return new SalesInvoiceModel({
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
      sales_invoice:
        data.sales_invoice == undefined
          ? []
          : (data.sales_invoice as any[]).map((item) => {
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
      sales_invoice_payment:
        data.sales_invoice_payment == undefined
          ? undefined
          : data.sales_invoice_payment!.map((x: any) => {
              return new SalesInvoicePaymentModel({
                id: x.id,
                date: new Date(x.date),
                payment_method_id: x.payment_method_id,
                value: Number(x.value),
                payment_method:
                  x.payment_method_id == null
                    ? null
                    : new PaymentMethodViewModel({
                        id: x.payment_method_id,
                        name: x.payment_method.name,
                        description: x.payment_method.description,
                      }),
                sales_invoice_code_id: data.id,
              });
            }),
      customer:
        data.customer == undefined
          ? undefined
          : data.customer == null
          ? null
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

  //   conditionalQueries += ` WHERE 1 = 1`;

  // static fetchGeneralByIDs(ids: number[]) {
}

export class SalesInvoiceItemModel {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  product?: ProductModel;
  product_unit?: ProductUnitModel | null;

  constructor(data: ISalesInvoice) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.product_unit_id = data.product_unit_id;
    this.quantity = data.quantity;
    this.price = data.price;
    this.discount = data.discount;

    this.product = data.product;
    this.product_unit = data.product_unit;
  }

  static fromMap(data: any) {
    const result = new SalesInvoiceItemModel({
      id: data.id,
      product_id: data.product_id,
      product_unit_id: data.product_unit_id,
      quantity: Number(data.quantity),
      price: Number(data.price),
      discount: Number(data.discount),
      product:
        data.product == undefined
          ? undefined
          : ProductModel.fromMap(data.product),
      product_unit:
        data.product_unit == null
          ? null
          : data.product_unit == undefined
          ? undefined
          : ProductUnitModel.fromMap(data.product_unit),
    });

    return result;
  }
}
