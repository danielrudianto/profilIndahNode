import { PrismaClient } from "@prisma/client";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

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

export interface IPaymentMethodManual {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  can_delete: string;
}

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
}

export interface IPaymentMethodView {
  id: number | null;
  name: string;
  description: string;
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
