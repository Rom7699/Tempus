export interface BaseList {
    id: number;
    name: string;
    color: string;
    icon: string;
}
export interface List extends BaseList {
    user_id?: string;
    createdDate?: string; // or Date if it's parsed
}
