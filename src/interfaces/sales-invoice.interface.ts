import { ProductModel } from "../models/product.model";
import { CustomerModel } from "../models/customer.model";
import { SalesInvoicePaymentModel } from "../models/sales-invoice-payment.model";
import { ProductUnitModel } from "../models/product-unit.model";
import { UserViewModel } from "../models/user.model";

export interface ISalesInvoiceCode {
  id?: number;
  name: string;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  discount: number;
  delivery: number;
  service: number;
  date: Date;
  uuid: string;
  sales_invoice: ISalesInvoice[];
  sales_invoice_payment: SalesInvoicePaymentModel[];
  isPaid: boolean;
  isConfirm: boolean;
  isDelete: boolean;
  sales: string | null;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;

  /**
   * Nilai akhir faktur. Sengaja opsional: hanya terisi bila baris fakturnya
   * ikut diambil, sebab totalnya dihitung dari baris itu dan tidak disimpan di
   * basis data. Membiarkannya undefined lebih jujur daripada mengirim nol
   * untuk faktur yang barisnya memang tidak diminta.
   */
  total?: number;

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;
}

export interface ISalesInvoice {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  product?: ProductModel;
  product_unit?: ProductUnitModel | null;
}
