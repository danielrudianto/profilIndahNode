/**
 * Mode pengelompokan pada perhitungan total pembelian.
 *
 * Sebelumnya berada di models/purchase-invoice.model.ts. Dipindah mengikuti
 * kesepakatan bahwa konstanta punya berkasnya sendiri di constants/.
 */
export enum CalculatePurchaseMode {
  Plain,
  Supplier,
  Type,
  Brand,
  Sum,
  V2,
}

export default CalculatePurchaseMode;
