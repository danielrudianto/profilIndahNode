export interface IAuditLog {
  id?: number;
  entity: string;
  entityID: number | null;
  action: string;
  userID: number | null;
  userName: string | null;
  changes: Record<string, unknown> | null;
  note: string | null;
  /** Alamat asal permintaan; null untuk jejak dari CLI atau worker. */
  ip: string | null;
  /** Avatar pemiliknya, bila ia pernah mengaturnya. */
  userAvatar: IAuditLogAvatar | null;
  createdAt: Date;
}

/** Bentuk avatar yang dibaca halaman aktivitas; cerminan tabel user_avatar. */
export interface IAuditLogAvatar {
  top: number | null;
  accessories: number | null;
  clothes: number | null;
  eyes: number | null;
  eyebrows: number | null;
  mouth: number | null;
  color: string;
  circle: boolean;
}

export interface IAuditLogFilter {
  page: number;
  pageSize: number;
  entity: string | null;
  /** Menyaring jejak SATU dokumen — dipakai riwayat perubahan di dialog view. */
  entityID: number | null;
  userID: number[] | null;
  /**
   * Hanya jejak yang punya pemilik.
   *
   * Pekerjaan latar menulis tanpa permintaan HTTP, sehingga user_id-nya null.
   * Penjadwal stok minimum sendiri menyentuh belasan ribu baris tiap pekan,
   * dan tanpa saringan ini yang dikerjakan orang tenggelam di antaranya.
   */
  userOnly: boolean;
  dateFrom: Date | null;
  dateTo: Date | null;
}
