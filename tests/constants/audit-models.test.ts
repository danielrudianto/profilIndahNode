import { readFileSync } from "fs";
import { join } from "path";
import { AUDITED_MODELS } from "../../src/constants/audit.constant";

/**
 * Penjaga: setiap nama di AUDITED_MODELS harus benar-benar ada sebagai model
 * Prisma.
 *
 * Middleware-nya membandingkan `params.model` apa adanya, jadi nama yang
 * salah ketik atau yang modelnya tidak pernah ada TIDAK menghasilkan galat
 * apa pun — ia hanya tidak pernah cocok. Daftarnya lalu tampak menjaga
 * sesuatu yang sebenarnya tidak dijaga.
 *
 * Itu benar-benar terjadi: "receivable" berdiri di daftar ini padahal tidak
 * ada model bernama itu. Pembayaran piutang menulis ke sales_invoice_payment,
 * yang tidak terdaftar — sehingga selama itu tidak satu pun baris uang punya
 * jejak siapa pembuatnya.
 */
describe("AUDITED_MODELS menyebut model yang benar-benar ada", () => {
  const skema = readFileSync(
    join(__dirname, "..", "..", "prisma", "schema.prisma"),
    "utf8"
  );

  const modelPrisma = new Set(
    [...skema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1])
  );

  it("prisma/schema.prisma terbaca dan berisi model", () => {
    expect(modelPrisma.size).toBeGreaterThan(10);
  });

  it.each(AUDITED_MODELS)("model %s ada di skema", (nama) => {
    expect(modelPrisma.has(nama)).toBe(true);
  });

  /*
    Baris uang wajib berjejak. Ketiganya bisa dibuat siapa pun yang boleh
    membuka fakturnya, dan tidak satu pun menyimpan pembuatnya di barisnya
    sendiri.
  */
  it.each([
    "sales_invoice_payment",
    "sales_deposit_payment",
    "sales_invoice_rebate",
  ])("baris uang %s ikut dicatat jejaknya", (nama) => {
    expect(AUDITED_MODELS).toContain(nama);
  });
});
