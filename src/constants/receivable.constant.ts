/**
 * Toleransi pembulatan pelunasan piutang, dalam rupiah.
 *
 * Selisih tagihan yang tersisa <= nilai ini dianggap LUNAS. Tanpa
 * toleransi, pembayaran yang dibulatkan kasir meninggalkan sisa Rp 1-5
 * yang membuat faktur menggantung "belum lunas" selamanya — pelanggan
 * ikut menggantung di daftar piutang untuk utang yang tidak nyata.
 */
export const PAYMENT_ROUNDING_TOLERANCE = 5;
