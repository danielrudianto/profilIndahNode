import {
  IPaymentMethod,
  IPaymentMethodView,
} from "../interfaces/payment-method.interface";

export class PaymentMethodModel {
  id?: number;
  name: string;
  description: string;
  created_by?: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: boolean;

  constructor(data: IPaymentMethod) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
    this.can_delete = data.can_delete;
  }

  static fromMap(data: any) {
    return new PaymentMethodModel({
      id: data.id,
      name: data.name,
      description: data.description,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: new Date(data.deleted_at),
      can_delete: data.can_delete ?? false,
    });
  }
}

export class PaymentMethodViewModel {
  id: number | null;
  name: string;
  description: string;

  constructor(data: IPaymentMethodView) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
  }

  static fromMap(data: any): PaymentMethodViewModel {
    if (data == undefined) {
      return new PaymentMethodViewModel({
        id: null,
        name: "Cash",
        description: "Cash",
      });
    } else {
      return new PaymentMethodViewModel({
        id: data.id,
        name: data.name,
        description: data.description,
      });
    }
  }
}
