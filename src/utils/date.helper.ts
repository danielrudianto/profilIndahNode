import { formatDate } from "../constants/format-tanggal";
export { formatDate };

export class DateHelper {
  // convert from Date object to DD-MM-YYYY
  static convertDate(date: Date, format: formatDate) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (format) {
      case formatDate.DDMMYYYY:
        return `${day.toString().padStart(2, "0")}-${(month + 1)
          .toString()
          .padStart(2, "0")}-${year}`;
      case formatDate.YYYYMMDD:
        return `${year}-${(month + 1).toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`;
      default:
        break;
    }
  }
}
