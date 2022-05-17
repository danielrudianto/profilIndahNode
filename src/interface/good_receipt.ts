import { purchase_order } from "./purchase_order";
import { user } from "./user";

export interface good_receipt {
    id?: number;
    purchase_order_id?: number;
    quantity: number;
    good_receipt_code_id?: number;
    good_receipt_code?: good_receipt_code;
    purchase_order?: purchase_order;
}

export interface good_receipt_code {
    id?: number;
    name: string;
    date: Date;
    created_by?: number;
    created_at?: Date;
    is_confirm?: boolean;
    is_delete?: boolean;
    confirmed_by?: number;
    confirmed_at?: Date;
    user_good_receipt_code_confimed_byTouser?: user;
    user_good_receipt_code_created_byTouser?: user;
    good_receipt?: good_receipt[]
}