export interface user {
    id?: number;
    name: string;
    nik: string;
    username: string;
    password?: string;
    created_by?: number;
    created_at?: Date;
    is_active: boolean;
}