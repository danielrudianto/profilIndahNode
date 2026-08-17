export interface IAuditLog {
  id?: number;
  entity: string;
  entityID: number | null;
  action: string;
  userID: number | null;
  userName: string | null;
  changes: Record<string, unknown> | null;
  note: string | null;
  createdAt: Date;
}

export interface IAuditLogFilter {
  page: number;
  pageSize: number;
  entity: string | null;
  /** Menyaring jejak SATU dokumen — dipakai riwayat perubahan di dialog view. */
  entityID: number | null;
  userID: number[] | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}
