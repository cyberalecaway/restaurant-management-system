export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type MenuCategory = 'Main Course' | 'Appetizer' | 'Dessert' | 'Beverages';
export type MenuAvailability = 'Available' | 'Sold Out';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string;
  availability: MenuAvailability;
  image: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  table: string;
  items: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}
