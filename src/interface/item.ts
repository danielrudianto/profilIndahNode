import { bill } from "./bill";
import { purchase_order } from "./purchase_order";
import { user } from "./user";

export interface item {
    id?: number;
    reference: string;
    description: string;
    created_by?: number;
    created_at?: Date;
    user?: user;
    bill?: bill[];
    user_item_deleted_byTouser?: user;
    item_price?: item_price[]
    purchase_order?: purchase_order[];
}

export interface item_price {
    id?: number;
    item_id?: number;
    price: number;
    discount: number;
    discount_project?: number;
    is_delete?: boolean;
    item?: item;
}