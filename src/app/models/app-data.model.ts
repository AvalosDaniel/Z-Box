export interface CardItem {
  id: number;
  tag: string;
  tagColor?: string;
  tagBg?: string;
  title: string;
  description: string;
  detail: string;
}

export interface ListItem {
  id: number;
  icon: string;
  title: string;
  date: string;
  badgeText: string;
  badgeClass: 'badge-success' | 'badge-pending';
  detail: string;
}
