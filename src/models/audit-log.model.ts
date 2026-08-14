import { IAuditLog } from "../interfaces/audit-log.interface";

export class AuditLogModel {
  id?: number;
  entity: string;
  entityID: number | null;
  action: string;
  userID: number | null;
  userName: string | null;
  changes: Record<string, unknown> | null;
  note: string | null;
  createdAt: Date;

  constructor(data: IAuditLog) {
    this.id = data.id;
    this.entity = data.entity;
    this.entityID = data.entityID;
    this.action = data.action;
    this.userID = data.userID;
    this.userName = data.userName;
    this.changes = data.changes;
    this.note = data.note;
    this.createdAt = data.createdAt;
  }

  /*
    Bentuk keluarannya memakai camelCase karena itulah yang dibaca halaman
    aktivitas, sedangkan kolomnya di basis data memakai snake_case. Pemetaan
    dikerjakan di sini supaya controller tidak perlu tahu bentuk barisnya.
  */
  static fromMap(baris: {
    id: number;
    entity: string;
    entity_id: number | null;
    action: string;
    user_id: number | null;
    changes: unknown;
    note: string | null;
    createdAt: Date;
    user?: { id: number; name: string } | null;
  }): AuditLogModel {
    return new AuditLogModel({
      id: baris.id,
      entity: baris.entity,
      entityID: baris.entity_id,
      action: baris.action,
      userID: baris.user_id,
      userName: baris.user?.name ?? null,
      changes: (baris.changes as Record<string, unknown> | null) ?? null,
      note: baris.note,
      createdAt: baris.createdAt,
    });
  }
}
