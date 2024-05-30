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

export interface IFetchSalesInvoiceArchive extends IFetchArchive {
  status: number;
  paymentStatus: number;
  startDate: string;
  endDate: string;
}

export interface IFetchPurchaseInvoiceArchive extends IFetchArchive {
  status: number;
  startDate: string;
  endDate: string;
}

export interface IFetchAdjustmentCaseArchive extends IFetchArchive {
  status: number;
  startDate: string;
  endDate: string;
}

export interface IFetchAdjustmentCaseArchiveV2 extends IFetchArchive {
  status: number;
  startDate: string;
  endDate: string;
  type: number;
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

export interface AdjustmentCaseArchiveV2 extends IArchive {
  is_delete: number;
  company_id: number | null;
  company_name: string | null;
  is_confirm: number;
  type: number;
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

export interface BillArchiveV2 extends IArchive {
  is_delete: number;
  customer_id: number | null;
  customer_name: string;
  is_confirm: number;
  sales: string;
  is_paid: number;
}

export interface PurchaseInvoiceArchive extends IArchive {
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
}

export interface PurchaseInvoiceArchiveV2 extends IArchive {
  is_delete: number;
  company_id: number;
  company_name: string;
  supplier_id: number;
  supplier_name: string;
  is_confirm: number;
  gr_name: string;
  faktur: string | null;
}
