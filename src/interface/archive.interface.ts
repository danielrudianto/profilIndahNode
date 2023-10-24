export interface AnnualArchive {
  year: number;
  count: number;
}

export interface MonthlyArchive {
  year: number;
  month: number;
  count: number;
}

export interface GoodReceiptArchive {
  id: number;
  date: string;
  name: string;
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
}

export interface AdjustmentCaseArchive {
  id: number;
  date: string;
  name: string;
  is_delete: number;
  company_id: number;
  company_name: string;
  is_confirm: number;
}

export interface SalesReturnArchive {
  id: number;
  date: string;
  name: string;
  is_delete: number;
  customer_id: number | null;
  customer_name: string;
  is_confirm: number;
}

export interface BillArchive {
  id: number;
  date: string;
  name: string;
  is_delete: number;
  customer_id: number | null;
  customer_name: string;
  is_confirm: number;
}

export interface PurchaseInvoiceArchive {
  id: number;
  date: string;
  name: string;
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
}

export interface ArchiveCount {
  count: number;
}

export interface IFetchArchive {
  year: number;
  month: number;
  limit: number;
  offset: number;
  mode: number;
  keyword: string;
}
