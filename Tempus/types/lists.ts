export interface BaseList {
    list_name: string;
    list_color: string;
    list_icon: string;
}
export interface List extends BaseList {
    list_id: number;
    user_id?: string;
    list_creation_date?: string; // or Date if it's parsed
}

