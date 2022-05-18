import { bill } from "./bill";
import { item_brand } from "./brand";
import { purchase_order } from "./purchase_order";
import { user } from "./user";

export interface item {
    id?: number;
    reference: string;
    description: string;
    item_brand_id?: number;
    created_by?: number;
    created_at?: Date;

    item_brand?: item_brand;
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