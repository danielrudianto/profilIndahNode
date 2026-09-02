import { SalesReturnModel } from "../models/sales-return.model";
import { SalesReturnCodeModel } from "../models/sales-return.model";
import { PaymentMethodModel } from "../models/payment-method.model";
import {
  SalesInvoiceItemModel,
  SalesInvoiceModel,
} from "../models/sales-invoice.model";
import { UserViewModel } from "../models/user.model";

export interface ISalesReturnCode {
  id?: number;
  name: string;
  date: Date;
  payment_method_id: number | null;
  created_by: number;
  created_at: Date;
  is_confirm: boolean;
  is_delete: boolean;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  sales_invoice_code_id: number;

  sales_return?: SalesReturnModel[];
  sales_invoice_code?: SalesInvoiceModel;

  user_sales_return_code_created_byTouser?: UserViewModel;
  payment_method?: PaymentMethodModel | null;

  /** Berapa dari nilai retur yang memotong tagihan fakturnya. */
  receivable_value?: number;
  /** Sisanya, yang menjadi kelebihan bayar untuk dijadwalkan. */
  overpayment_value?: number;

  /**
   * Jadwal pengembaliannya — ke mana uangnya dikirim.
   *
   * Tersimpan pada baris kelebihan bayar, bukan pada dokumen retur, sehingga
   * layar retur tidak punya apa pun untuk digambar tanpa ini: bank, nomor
   * rekening, nama penerima, dan tanggal rencana semuanya diketik petugas di
   * formulir retur lalu menghilang dari dokumennya sendiri.
   */
  overpayment?: ISalesReturnRefund[];
}

/** Satu jadwal pengembalian uang milik sebuah retur. */
export interface ISalesReturnRefund {
  id: number;
  value: number;
  return_payment_method: string;
  return_payment_bank: string | null;
  return_payment_number: string | null;
  return_payment_name: string;
  return_payment_date: Date;
  is_resolved: boolean;
}

export interface ISalesReturn {
  id?: number;
  quantity: number;
  sales_return_code_id?: number;
  sales_invoice_id: number;

  sales_invoice?: SalesInvoiceItemModel;
  sales_return_code?: SalesReturnCodeModel;
}
