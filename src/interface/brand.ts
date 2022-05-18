import { item } from "./item";
import { user } from "./user";

export interface item_brand {
    id?: number;
    name: string;
    created_by?: number;
    created_at?: Date;
    user?: user;
    item?: item[]
}