export interface IFetchCommon {
  page: number;
  keyword: string;
  pageSize: number;
}

export interface IFetchCommonResult<T> {
  data: T[];
  count: number;
}

export interface IFetchPagination {
  page: number;
  pageSize: number;
  month: number;
  year: number;
}

export interface IFetchAnnualArchives {
  year: number;
  count: number;
}

export interface IFetchMonthlyArchives {
  year: number;
  month: number;
  count: number;
}

export interface IFetchArchives<T> {
  data: T[];
  count: number;
}
