export interface IAchivement {
  name: string;
  shortName: string;
  description: string;
  minimum: number;
  field: "customer" | "sales";
}
