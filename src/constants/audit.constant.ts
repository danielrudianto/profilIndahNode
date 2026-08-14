/**
 * Model yang jejaknya dicatat, dan bidang yang tidak boleh ikut tercatat.
 *
 * Daftarnya sengaja berupa izin, bukan larangan. Mencatat SETIAP model akan
 * menenggelamkan halaman aktivitas dengan baris kartu stok dan stok keluar
 * yang lahir puluhan sekaligus dari satu faktur — dan justru fakturnya, yang
 * berarti bagi manusia, jadi tidak terlihat.
 *
 * Nilainya harus sama persis dengan nama model Prisma, karena middleware
 * membandingkannya dengan params.model apa adanya.
 */
export const AUDITED_MODELS: string[] = [
  "user",
  "customer",
  "supplier",
  "company",
  "product",
  "product_brand",
  "product_type",
  "product_unit",
  "payment_method",
  "expense",
  "expense_type",
  "promotion_code",
  "sales_invoice_code",
  "sales_deposit_code",
  "sales_return_code",
  "good_receipt_code",
  "adjustment_case_code",
  "package_code",
  "overpayment",
  "receivable",
];

/**
 * Bidang yang dibuang sebelum perubahan disimpan.
 *
 * password jelas tidak boleh tercatat. Yang lain dibuang karena hanya
 * mengulang informasi yang sudah ada pada baris jejaknya sendiri — user_id dan
 * created_at pada audit_log sudah menyebutkan siapa dan kapan, sehingga
 * mencatatnya lagi di dalam `changes` hanya membuat isinya sulit dibaca.
 */
export const AUDIT_REDACTED_FIELDS: string[] = [
  "password",
  "created_by",
  "created_at",
  "updated_by",
  "updated_at",
  "deleted_by",
  "deleted_at",
];

/** Operasi Prisma yang dianggap perubahan data. */
export const AUDITED_ACTIONS: Record<string, string> = {
  create: "create",
  createMany: "create",
  update: "update",
  updateMany: "update",
  upsert: "update",
  delete: "delete",
  deleteMany: "delete",
};
