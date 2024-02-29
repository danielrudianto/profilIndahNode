export interface AnnualArchive {
  year: number;
  count: number;
}

export interface MonthlyArchive {
  year: number;
  month: number;
  count: number;
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

export interface IArchive {
  id: number;
  date: string;
  name: string;
}

// General archive interface //

export interface GoodReceiptArchive extends IArchive {
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
}

export interface AdjustmentCaseArchive extends IArchive {
  is_delete: number;
  company_id: number;
  company_name: string;
  is_confirm: number;
}

export interface SalesReturnArchive extends IArchive {
  is_delete: number;
  customer_id: number | null;
  customer_name: string;
  is_confirm: number;
}

export interface BillArchive extends IArchive {
  is_delete: number;
  customer_id: number | null;
  customer_name: string;
  is_confirm: number;
  sales: string;
}

export interface PurchaseInvoiceArchive extends IArchive {
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
}
