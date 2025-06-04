export enum fetchMode {
  All,
  Pagination,
  Autocomplete,
  Child,
  ChildByParentID,
  ParentAutocomplete,
  ChildAutocomplete,
  Unconfirmed,
  AllV2,
}

export enum fetchType {
  Complete,
  Simple,
}

export interface IFetchCommon {
  page: number;
  keyword: string;
  pageSize: number;
}

export interface IFetchCommonResult<T> {
  data: T[];
  count: number;
}
