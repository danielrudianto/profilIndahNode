/**
 * Pilihan format keluaran DateHelper.convertDate.
 *
 * Sebelumnya berada di utils/date.helper.ts. Dipindah mengikuti kesepakatan
 * bahwa konstanta punya berkasnya sendiri di constants/.
 */
export enum formatDate {
  DDMMYYYY,
  YYYYMMDD,
}

export default formatDate;
