import { CustomerModel } from "../models/customer.model";
import { PaymentMethodModel } from "../models/payment-method.model";
import { SalesInvoiceModel } from "../models/sales-invoice.model";
import { UserViewModel } from "../models/user.model";

export interface IOverpaymentCode {
  id?: number;
  customer_id: number;
  date: Date;
  sales_deposit_code_id: number | null;
  /** Retur penjualan yang melahirkannya, bila memang dari sana. */
  sales_return_code_id?: number | null;
  payment_method_id: number | null;
  return_payment_method: string;
  return_payment_number: string | null;
  return_payment_date: Date;
  return_payment_bank: string | null;
  return_payment_name: string;
  created_by: number;
  created_at: Date;
  value: number;

  /**
   * Benar bila uangnya sudah dikembalikan ke pelanggan.
   *
   * Kolomnya sudah lama ada di basis data tetapi tidak pernah ikut dikirim,
   * sehingga antarmuka mustahil membedakan yang masih menunggu dari yang sudah
   * selesai — dan daftar kelebihan bayar tidak punya arti tanpa pembedaan itu.
   *
   * OPSIONAL karena antarmuka ini dipakai untuk membaca sekaligus membuat, dan
   * catatan yang baru dibuat belum punya keadaan itu — basis datanya sendiri
   * yang memberi nilai bawaan false.
   */
  is_resolved?: boolean;

  /**
   * Nomor dokumen asalnya, bila lahir dari sebuah dokumen.
   *
   * Sumber kelebihan bayar tidak pernah disimpan sebagai keterangan — ia
   * TERBACA dari kolom mana yang terisi. Nomornya ikut supaya layar bisa
   * menyebut retur atau deposit yang mana, bukan sekadar "dari retur".
   */
  sales_return_code?: { name: string } | null;
  sales_deposit_code?: { name: string } | null;

  customer?: CustomerModel | null;
  sales_invoice?: SalesInvoiceModel;
  user_overpayment_created_byTouser?: UserViewModel;
  payment_method?: PaymentMethodModel | null;
}

export interface IOverpayment {
  id?: number;
  payment_method_id: number | null;
  value: number;
  overpayment_code_id: number;

  payment_method?: PaymentMethodModel | null;
}
