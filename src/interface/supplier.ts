import { purchase_order_code } from "./purchase_order";
import { user } from "./user"

export interface supplier {
    id?: number;
    name: string;
    npwp?: string;
    address?: string;
    created_by?: number;
    created_at?: Date;
    user?: user;
    purchase_order_code?: purchase_order_code[];
}