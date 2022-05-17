import { user } from "./user";
import { customer } from './customer';
import { item } from './item';

export interface bill_code {
    id?: number;
    name: string;
    customer_id?: number;
    created_by?: number;
    created_at?: Date;
    payment_method_id?: number;
    is_delete?: boolean;
    is_confirm?: boolean;
    confirmed_by?: number;
    confirmed_at?: Date;
    discount: number;
    delivery: number;
    user_bill_code_confirmed_byTouser?: user;
    user_bill_code_created_byTouser?: user;
    customer?: customer;
    payment_method?: payment_method;
    bill?: bill[];
}

export interface bill {
    id?: number;
    item_id?: number;
    price: number;
    discount: number;
    quantity: number;
    bill_code_id?: number;
    bill_code?: bill_code;
    item?: item;
}

export interface payment_method {
    id?: number;
    name: string;
    description: string;
    created_by?: number;
    created_at?: Date;
    is_delete?: boolean;
    deleted_by?: number;
    deleted_at?: Date;
    user_payment_method_created_byTouser?: user;
    user_payment_method_deleted_byTouser?: user;
    bill_code?: bill_code[];
}