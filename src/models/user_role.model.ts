import { IUserRole } from "../interfaces/user_role.interface";

export class UserRoleModel {
  id?: number;
  name: string;

  constructor(data: IUserRole) {
    this.id = data.id;
    this.name = data.name;
  }

  // list of available roles
  static roles: IUserRole[] = [
    { id: 1, name: "Pembelian", available: true },
    { id: 2, name: "Penjualan", available: true },
    { id: 3, name: "Penjualan & Pembelian", available: true },
    { id: 5, name: "Administrator", available: true },
    { id: 6, name: "Gudang", available: false },
    { id: 7, name: "Superadministrator", available: false },
  ];

  // from roleID to role name
  static fromRoleID(roleID: number): string | null {
    const role = this.roles.find((r) => r.id === roleID);
    return role ? role.name : null;
  }

  // check if role is available
  static isAvailable(roleID: number): boolean {
    const role = this.roles.find((r) => r.id === roleID);
    return role ? role.available : false;
  }
}
