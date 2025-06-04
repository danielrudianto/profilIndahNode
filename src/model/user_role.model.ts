export interface IUserRole {
  id?: number;
  name: string;
  available: boolean;
}

export class UserRoleModel {
  id?: number;
  name: string;

  constructor(data: IUserRole) {
    this.id = data.id;
    this.name = data.name;
  }

  // list of available roles
  static roles: IUserRole[] = [
    { id: 1, name: "Administrator", available: true },
    { id: 2, name: "Sales", available: true },
    { id: 3, name: "Warehouse", available: true },
    { id: 4, name: "Accounting", available: true },
    { id: 5, name: "Owner", available: true },
    { id: 6, name: "Guest", available: false },
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
