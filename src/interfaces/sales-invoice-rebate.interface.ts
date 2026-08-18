export interface ISalesInvoiceRebate {
  id?: number;
  sales_invoice_code_id: number;
  value: number;
  /** Cash atau transfer; null bila metodenya belum ditentukan. */
  payment_method_id: number | null;
  /** Tanggal uangnya keluar — menentukan laporan kas hari mana ia masuk. */
  date: Date;
  /** Siapa yang menerima uangnya; ini yang membuat selisih kas bisa ditelusuri. */
  receiver_name: string;
  /** Keduanya hanya terisi bila dikembalikan lewat transfer. */
  bank_name: string | null;
  account_number: string | null;
  created_by: number;
  created_at?: Date;

  /** Bentuk tampilnya; PaymentMethodViewModel, bukan model penuhnya. */
  payment_method?: any;
}
