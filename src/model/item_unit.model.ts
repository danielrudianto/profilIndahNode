class ItemUnitModel {
    id: number | null;
    item_id: number;
    unit: string;
    conversion: number;
    created_by?: number;
    created_at?: Date;
    is_delete: boolean;
    deleted_by: number | null;
    deleted_at: number | null;

    constructor(item_id: number, unit: string, conversion: number, created_by: number, id: number | null = null){
        if(id != null){
            this.id = id
        }

        this.item_id = item_id;
        this.unit = unit;
        this.conversion = conversion;
        this.created_by = created_by;
        this.created_at = new Date();
        this.is_delete = false;
        this.deleted_by = null;
        this.deleted_at = null;
    }
}