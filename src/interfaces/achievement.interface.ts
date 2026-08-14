export interface IAchievement {
  name: string;
  shortName: string;
  description: string;
  minimum: number;
  field: "customer" | "sales";
}
