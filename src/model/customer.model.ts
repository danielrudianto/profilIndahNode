import { PrismaClient } from "@prisma/client";
import ErrorList from "../assets/error_list";
import { fetchMode } from "../interface/fetch.interface";
import { UserViewModel } from "./user.model";

const prisma = new PrismaClient();

export interface ICustomer {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by?: number;
  created_at?: Date;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;

  user?: UserViewModel;

  is_delete?: boolean | string;
  can_delete?: boolean | string;
}

class CustomerModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by?: number;
  is_delete?: boolean = false;
  can_delete?: boolean;
  created_at?: Date;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  user?: UserViewModel;

  constructor(data: ICustomer) {
    this.id = data.id;
    this.name = data.name;
    this.address = data.address;
    this.npwp = data.npwp;
    this.pic = data.pic;
    this.phone_number = data.phone_number;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;
    this.user = data.user;

    // if can_delete is boolean, use it directly
    if (typeof data.can_delete === "boolean") {
      this.can_delete = data.can_delete;
    } else if (typeof data.can_delete === "string") {
      this.can_delete = data.can_delete === "1";
    }

    if (typeof data.is_delete === "boolean") {
      this.is_delete = data.is_delete;
    } else if (typeof data.is_delete === "string") {
      this.is_delete = data.is_delete === "1";
    }
  }

  static fromMap(data: any): CustomerModel {
    return new CustomerModel({
      id: data.id,
      name: data.name,
      address: data.address,
      npwp: data.npwp,
      pic: data.pic,
      phone_number: data.phone_number,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      is_delete: data.is_delete,
    });
  }

  update() {
    return prisma.customer.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        pic: this.pic,
        phone_number: this.phone_number,
        updated_by: this.updated_by,
        updated_at: new Date(),
      },
      include: {
        user_customer_updated_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static delete(id: number, created_by: number) {
    return prisma.customer.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
        user_customer_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Fetch customer by IDs
   * @param id
   * @returns
   */
  static async fetchByIDs(ids: number[]) {
    if (ids.length == 0) return Promise.resolve([]);

    return prisma.$queryRawUnsafe(`
      SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, '1', '0') AS can_delete
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE customer.id IN (${ids.join(",")})
    `);
  }

  static fetchBySales(id: number) {
    return prisma.customer.count({
      where: {
        is_delete: false,
        created_by: id,
      },
    });
  }
}

export default CustomerModel;
