// ============================================================
// HBA Filipino Restaurant Management System – Mock Data
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "STAFF";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type OrderStatus = "PENDING" | "PREPARING" | "COMPLETED" | "CANCELLED";
export type MenuCategory = "Main Course" | "Appetizer" | "Dessert" | "Beverages";
export type MenuAvailability = "Available" | "Sold Out";
export type ActionType =
  | "Login successful"
  | "Updated menu item price"
  | "Created order"
  | "Deactivated user account"
  | "Backup automatic routine"
  | "Refund request"
  | "Added menu item"
  | "Deleted menu item"
  | "Staff account created"
  | "Password changed"
  | "Logout";

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

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: ActionType;
  details: string;
  ipAddress: string;
}

export interface StaffPerformance {
  name: string;
  actionsHandled: string;
  avgSpeed: string;
  csat: string;
}

export interface TopDish {
  rank: number;
  name: string;
  orders: number;
  revenue: string;
}

export interface RevenueDay {
  day: string;
  revenue: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

// ── Users ─────────────────────────────────────────────────────

export const mockUsers: User[] = [
  { id: "ID-209", fullName: "Maria Clara Santos",   email: "maria.sc@hba-bites.ph",     mobile: "09171234567", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-208", fullName: "Juan Dela Cruz",        email: "juan.dc@hba-bites.ph",      mobile: "09187654321", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-205", fullName: "Emilio Aguinaldo",      email: "emilio.ea@hba-bites.ph",    mobile: "09201112233", role: "ADMIN",  status: "ACTIVE"   },
  { id: "ID-202", fullName: "Gabriela Silang",       email: "gabriela.s@hba-bites.ph",   mobile: "09159998887", role: "STAFF",  status: "INACTIVE" },
  { id: "ID-198", fullName: "Jose Rizal",            email: "jose.rizal@hba-bites.ph",   mobile: "09177778888", role: "ADMIN",  status: "ACTIVE"   },
  { id: "ID-195", fullName: "Melchora Aquino",       email: "melchora.a@hba-bites.ph",   mobile: "09193334445", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-191", fullName: "Andres Bonifacio",      email: "andres.b@hba-bites.ph",     mobile: "09215556677", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-188", fullName: "Apolinario Mabini",     email: "apolinario.m@hba-bites.ph", mobile: "09154455556", role: "STAFF",  status: "INACTIVE" },
  { id: "ID-185", fullName: "Gregorio del Pilar",    email: "gregorio.p@hba-bites.ph",   mobile: "09162223334", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-182", fullName: "Teodora Alonso",        email: "teodora.a@hba-bites.ph",    mobile: "09181112223", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-180", fullName: "Marcelo del Pilar",     email: "marcelo.dp@hba-bites.ph",   mobile: "09174445556", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-177", fullName: "Regine Velasquez",      email: "regine.v@hba-bites.ph",     mobile: "09196667778", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-174", fullName: "Corazon Aquino",        email: "corazon.a@hba-bites.ph",    mobile: "09162345678", role: "ADMIN",  status: "ACTIVE"   },
  { id: "ID-171", fullName: "Antonio Luna",          email: "antonio.l@hba-bites.ph",    mobile: "09183456789", role: "STAFF",  status: "ACTIVE"   },
  { id: "ID-168", fullName: "Lapu-Lapu",             email: "lapu.lapu@hba-bites.ph",    mobile: "09204567890", role: "STAFF",  status: "ACTIVE"   },
];

// ── Menu Items ────────────────────────────────────────────────

export const mockMenuItems: MenuItem[] = [
  { id: "M-001", name: "Chicken Adobo",      category: "Main Course", price: 185, description: "Tender chicken braised in vinegar, soy sauce, garlic, and bay leaves — the quintessential Filipino comfort dish.", availability: "Available", image: "/images/chicken-adobo.jpg"      },
  { id: "M-002", name: "Sinigang na Baboy",  category: "Main Course", price: 210, description: "Hearty pork sour soup with tamarind broth, vegetables, and radish — a Filipino soul food staple.",              availability: "Available", image: "/images/sinigang.jpg"           },
  { id: "M-003", name: "Pancit Canton",      category: "Main Course", price: 150, description: "Stir-fried egg noodles with a medley of vegetables, shrimp, and pork — perfect for celebrations.",               availability: "Available", image: "/images/pancit.jpg"             },
  { id: "M-004", name: "Lumpiang Shanghai",  category: "Appetizer",   price: 95,  description: "Crispy deep-fried spring rolls filled with seasoned ground pork and vegetables — a timeless party favorite.",    availability: "Available", image: "/images/lumpia.jpg"             },
  { id: "M-005", name: "Halo-Halo Fiesta",   category: "Dessert",     price: 120, description: "Colorful Filipino shaved ice dessert with sweet beans, jellies, leche flan, and ube ice cream on top.",         availability: "Available", image: "/images/halohalo.jpg"           },
  { id: "M-006", name: "Lechon Kawali",      category: "Main Course", price: 230, description: "Crispy deep-fried pork belly with golden crackling skin, served with liver sauce — rich and indulgent.",         availability: "Available", image: "/images/lechon-kawali.jpg"      },
  { id: "M-007", name: "Kare-Kare Special",  category: "Main Course", price: 260, description: "Slow-cooked oxtail and vegetables in a rich peanut sauce, served with bagoong — a fiesta centrepiece.",          availability: "Sold Out",  image: "/images/kare-kare.jpg"          },
  { id: "M-008", name: "Buko Juice Fresh",   category: "Beverages",   price: 75,  description: "Refreshing fresh young coconut juice served chilled, with tender coconut strips inside the glass.",              availability: "Available", image: "/images/buko-juice.jpg"         },
  { id: "M-009", name: "Crispy Pata Special",category: "Main Course", price: 850, description: "Whole pork leg deep-fried to crispy perfection, served with special vinegar dipping sauce.",                     availability: "Available", image: "/images/crispy-pata.jpg"        },
  { id: "M-010", name: "Bistek Tagalog",     category: "Main Course", price: 195, description: "Tender beef slices marinated in soy sauce and kalamansi, pan-fried with caramelized onions on top.",             availability: "Available", image: "/images/bistek.jpg"             },
  { id: "M-011", name: "Leche Flan",         category: "Dessert",     price: 85,  description: "Rich caramel custard made with egg yolks and condensed milk — silky smooth and perfectly caramelized.",          availability: "Available", image: "/images/leche-flan.jpg"         },
  { id: "M-012", name: "Calamansi Juice",    category: "Beverages",   price: 65,  description: "Freshly squeezed Philippine lime juice, sweetened and served chilled — tangy, refreshing, and local.",           availability: "Available", image: "/images/calamansi.jpg"          },
  { id: "M-013", name: "Pork Sisig",         category: "Main Course", price: 175, description: "Sizzling chopped pork cheeks and ears with onions, chilis, and calamansi on a hot iron plate.",                  availability: "Available", image: "/images/sisig.jpg"              },
  { id: "M-014", name: "Tinolang Manok",     category: "Main Course", price: 165, description: "Ginger-based chicken soup with green papaya and chili leaves — light, healthy, and deeply comforting.",          availability: "Available", image: "/images/tinola.jpg"             },
  { id: "M-015", name: "Ube Ice Cream",      category: "Dessert",     price: 95,  description: "Creamy purple yam ice cream with a distinctive sweet and earthy ube flavour — a Filipino dessert icon.",         availability: "Available", image: "/images/ube-ice-cream.jpg"      },
  { id: "M-016", name: "Pitcher Iced Tea",   category: "Beverages",   price: 120, description: "Refreshing pitcher of brewed iced tea with a choice of lemon, peach, or classic flavour for the whole table.",   availability: "Available", image: "/images/iced-tea.jpg"           },
];

// ── Orders ────────────────────────────────────────────────────

export const mockOrders: Order[] = [
  { id: "#HBA-3204", customer: "Juan Dela Cruz",      table: "Table 4",  items: "1x Kare-Kare, 1x Sinigang na Baboy",        total: 740,   status: "PREPARING",  createdAt: "2026-04-12 11:45 AM" },
  { id: "#HBA-3203", customer: "Maria Santos",         table: "Table 12", items: "2x Chicken Adobo, 1x Halo-Halo",            total: 680,   status: "COMPLETED",  createdAt: "2026-04-12 11:32 AM" },
  { id: "#HBA-3202", customer: "Antonio Luna",         table: "Table 8",  items: "1x Crispy Pata, 4x Garlic Rice",             total: 1120,  status: "PENDING",    createdAt: "2026-04-12 11:20 AM" },
  { id: "#HBA-3201", customer: "Corazon Aquino",       table: "Table 3",  items: "1x Lumpiang Shanghai, 1x Pancit",            total: 245,   status: "COMPLETED",  createdAt: "2026-04-12 11:05 AM" },
  { id: "#HBA-3200", customer: "Jose Rizal",           table: "Table 1",  items: "1x Lechon Kawali, 2x Garlic Rice",           total: 270,   status: "PREPARING",  createdAt: "2026-04-12 10:58 AM" },
  { id: "#HBA-3199", customer: "Andres Bonifacio",     table: "Table 14", items: "2x Sinigang, 1x Pitcher Iced Tea",           total: 590,   status: "PENDING",    createdAt: "2026-04-12 10:44 AM" },
  { id: "#HBA-3198", customer: "Emilio Aguinaldo",     table: "Table 6",  items: "1x Kare-Kare, 1x Halo-Halo Fiesta",         total: 570,   status: "COMPLETED",  createdAt: "2026-04-12 10:30 AM" },
  { id: "#HBA-3197", customer: "Gabriela Silang",      table: "Table 9",  items: "1x Pancit Canton Family Pack",               total: 150,   status: "CANCELLED",  createdAt: "2026-04-12 10:15 AM" },
  { id: "#HBA-3196", customer: "Apolinario Mabini",    table: "Table 5",  items: "2x Bistek Tagalog, 1x Buko Juice",           total: 465,   status: "COMPLETED",  createdAt: "2026-04-12 10:00 AM" },
  { id: "#HBA-3195", customer: "Melchora Aquino",      table: "Table 2",  items: "1x Pork Sisig, 2x Calamansi Juice",          total: 305,   status: "COMPLETED",  createdAt: "2026-04-12 09:45 AM" },
  { id: "#HBA-3194", customer: "Teodora Alonso",       table: "Table 7",  items: "1x Chicken Adobo, 1x Leche Flan",            total: 270,   status: "PREPARING",  createdAt: "2026-04-12 09:30 AM" },
  { id: "#HBA-3193", customer: "Regine Velasquez",     table: "Table 10", items: "1x Tinolang Manok, 2x Ube Ice Cream",        total: 355,   status: "COMPLETED",  createdAt: "2026-04-12 09:15 AM" },
  { id: "#HBA-3192", customer: "Lapu-Lapu",            table: "Table 11", items: "1x Crispy Pata Special",                     total: 850,   status: "PENDING",    createdAt: "2026-04-12 09:00 AM" },
  { id: "#HBA-3191", customer: "Gregorio del Pilar",   table: "Table 13", items: "3x Lumpiang Shanghai, 1x Pitcher Iced Tea",  total: 405,   status: "CANCELLED",  createdAt: "2026-04-12 08:50 AM" },
  { id: "#HBA-3190", customer: "Marcelo del Pilar",    table: "Table 15", items: "2x Sinigang na Baboy, 1x Pancit Canton",     total: 570,   status: "COMPLETED",  createdAt: "2026-04-12 08:35 AM" },
];

// ── Conversations / Messages ──────────────────────────────────

export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    name: "Admin Announcements",
    role: "System Channel",
    lastMessage: "Reminder: Staff meeting at 3PM today.",
    lastTime: "09:00 AM",
    unread: 0,
    messages: [
      { id: "m1", senderId: "admin", senderName: "Admin User", content: "Good morning team! Reminder: Staff meeting at 3PM today in the main dining area.", timestamp: "09:00 AM", isAdmin: true },
      { id: "m2", senderId: "admin", senderName: "Admin User", content: "Please make sure all stations are properly cleaned before the meeting. Thank you!", timestamp: "09:01 AM", isAdmin: true },
    ],
  },
  {
    id: "conv-2",
    name: "Maria Santos",
    role: "Kitchen Staff",
    lastMessage: "Chef, we are running low on Kare-Kare peanut base.",
    lastTime: "11:42 AM",
    unread: 2,
    messages: [
      { id: "m1", senderId: "admin",  senderName: "Admin User",    content: "Hi Maria, can we check the stock of Chicken Adobo for tonight?",                          timestamp: "11:20 AM", isAdmin: true  },
      { id: "m2", senderId: "maria",  senderName: "Maria Santos",  content: "Yes Chef, we have 15 portions ready and raw ingredients for 40 more.",                    timestamp: "11:22 AM", isAdmin: false },
      { id: "m3", senderId: "admin",  senderName: "Admin User",    content: "Excellent, keep sinigang on high priority too. Heavy orders expected.",                   timestamp: "11:35 AM", isAdmin: true  },
      { id: "m4", senderId: "maria",  senderName: "Maria Santos",  content: "Chef, we are running low on Kare-Kare peanut base. Need admin to approve local purchase.", timestamp: "11:42 AM", isAdmin: false },
    ],
  },
  {
    id: "conv-3",
    name: "Juan Dela Cruz",
    role: "Rider",
    lastMessage: "Order #HBA-3201 delivered successfully!",
    lastTime: "10:58 AM",
    unread: 0,
    messages: [
      { id: "m1", senderId: "admin", senderName: "Admin User",   content: "Juan, order #HBA-3201 is ready for pickup. Please proceed to Table 3.",   timestamp: "10:45 AM", isAdmin: true  },
      { id: "m2", senderId: "juan",  senderName: "Juan Dela Cruz", content: "On my way, Chef!",                                                        timestamp: "10:46 AM", isAdmin: false },
      { id: "m3", senderId: "juan",  senderName: "Juan Dela Cruz", content: "Order #HBA-3201 delivered successfully!",                                 timestamp: "10:58 AM", isAdmin: false },
    ],
  },
  {
    id: "conv-4",
    name: "Lebron James",
    role: "Branch Staff",
    lastMessage: "Table 8 is ready for the next guests.",
    lastTime: "10:30 AM",
    unread: 1,
    messages: [
      { id: "m1", senderId: "admin",  senderName: "Admin User",  content: "Lebron, please assist Table 8 — they've been waiting for their order.",  timestamp: "10:15 AM", isAdmin: true  },
      { id: "m2", senderId: "lebron", senderName: "Lebron James", content: "On it, Admin.",                                                           timestamp: "10:17 AM", isAdmin: false },
      { id: "m3", senderId: "lebron", senderName: "Lebron James", content: "Table 8 is ready for the next guests.",                                   timestamp: "10:30 AM", isAdmin: false },
    ],
  },
  {
    id: "conv-5",
    name: "Regine Velasquez",
    role: "Front of House",
    lastMessage: "All good, cash register is balanced for the morning shift.",
    lastTime: "09:55 AM",
    unread: 0,
    messages: [
      { id: "m1", senderId: "admin",  senderName: "Admin User",     content: "Regine, can you please reconcile the morning shift cash register?",                   timestamp: "09:40 AM", isAdmin: true  },
      { id: "m2", senderId: "regine", senderName: "Regine Velasquez", content: "Of course, Admin. Checking now.",                                                      timestamp: "09:42 AM", isAdmin: false },
      { id: "m3", senderId: "regine", senderName: "Regine Velasquez", content: "All good, cash register is balanced for the morning shift.",                           timestamp: "09:55 AM", isAdmin: false },
    ],
  },
];

// ── Activity Logs ─────────────────────────────────────────────

export const mockActivityLogs: ActivityLog[] = [
  { id: "LOG-001", timestamp: "2026-04-12 11:42 AM", user: "Maria Santos",     userRole: "Kitchen Staff",  action: "Login successful",        details: "Device: Kitchen Terminal 01",        ipAddress: "192.168.1.104"  },
  { id: "LOG-002", timestamp: "2026-04-12 11:30 AM", user: "Admin User",       userRole: "Branch Admin",   action: "Updated menu item price",  details: "Chicken Adobo: ₱180 → ₱210",        ipAddress: "112.198.115.42" },
  { id: "LOG-003", timestamp: "2026-04-12 11:15 AM", user: "Juan Dela Cruz",   userRole: "Rider",          action: "Created order",            details: "ORD-2024-087 total: ₱740",           ipAddress: "192.168.1.112"  },
  { id: "LOG-004", timestamp: "2026-04-12 10:50 AM", user: "Admin User",       userRole: "Branch Admin",   action: "Deactivated user account", details: "User ID: FO-9082",                   ipAddress: "112.198.115.42" },
  { id: "LOG-005", timestamp: "2026-04-12 10:42 AM", user: "System Agent",     userRole: "System",         action: "Backup automatic routine", details: "S3 Sync completed",                  ipAddress: "localhost"      },
  { id: "LOG-006", timestamp: "2026-04-12 09:14 AM", user: "Regine Velasquez", userRole: "Front of House", action: "Refund request",           details: "Table 4 Sinigang void",              ipAddress: "192.168.1.101"  },
  { id: "LOG-007", timestamp: "2026-04-12 08:55 AM", user: "Admin User",       userRole: "Branch Admin",   action: "Added menu item",          details: "Buko Pandan Dessert — ₱110",         ipAddress: "112.198.115.42" },
  { id: "LOG-008", timestamp: "2026-04-12 08:30 AM", user: "Maria Santos",     userRole: "Kitchen Staff",  action: "Login successful",         details: "Device: Kitchen Terminal 01",        ipAddress: "192.168.1.104"  },
  { id: "LOG-009", timestamp: "2026-04-11 06:00 PM", user: "Admin User",       userRole: "Branch Admin",   action: "Password changed",         details: "Account security updated",           ipAddress: "112.198.115.42" },
  { id: "LOG-010", timestamp: "2026-04-11 05:45 PM", user: "Juan Dela Cruz",   userRole: "Rider",          action: "Logout",                   details: "Session ended",                      ipAddress: "192.168.1.112"  },
  { id: "LOG-011", timestamp: "2026-04-11 05:30 PM", user: "Regine Velasquez", userRole: "Front of House", action: "Created order",            details: "ORD-2024-086 total: ₱245",           ipAddress: "192.168.1.101"  },
  { id: "LOG-012", timestamp: "2026-04-11 04:15 PM", user: "Admin User",       userRole: "Branch Admin",   action: "Staff account created",    details: "New Staff: Lapu-Lapu ID-168",        ipAddress: "112.198.115.42" },
  { id: "LOG-013", timestamp: "2026-04-11 03:00 PM", user: "Maria Santos",     userRole: "Kitchen Staff",  action: "Updated menu item price",  details: "Sinigang na Baboy: ₱195 → ₱210",    ipAddress: "192.168.1.104"  },
  { id: "LOG-014", timestamp: "2026-04-11 02:00 PM", user: "System Agent",     userRole: "System",         action: "Backup automatic routine", details: "Daily database backup completed",    ipAddress: "localhost"      },
  { id: "LOG-015", timestamp: "2026-04-11 01:30 PM", user: "Apolinario Mabini",userRole: "Staff",          action: "Login successful",         details: "Device: FOH Terminal 02",            ipAddress: "192.168.1.108"  },
];

// ── Reports ────────────────────────────────────────────────────

export const revenueData: RevenueDay[] = [
  { day: "Mon", revenue: 35000 },
  { day: "Tue", revenue: 48000 },
  { day: "Wed", revenue: 42000 },
  { day: "Thu", revenue: 55000 },
  { day: "Fri", revenue: 78000 },
  { day: "Sat", revenue: 112000 },
  { day: "Sun", revenue: 98000 },
];

export const categoryData: CategoryData[] = [
  { name: "Main Courses", value: 45, color: "#D92F2F" },
  { name: "Appetizers",   value: 20, color: "#F59E0B" },
  { name: "Desserts",     value: 15, color: "#8B5CF6" },
  { name: "Beverages",    value: 20, color: "#10B981" },
];

export const topDishes: TopDish[] = [
  { rank: 1, name: "Chicken Adobo Classico",  orders: 234, revenue: "₱35,100"  },
  { rank: 2, name: "Sinigang na Baboy",       orders: 198, revenue: "₱75,240"  },
  { rank: 3, name: "Crispy Pata Special",     orders: 176, revenue: "₱149,600" },
  { rank: 4, name: "Halo-Halo Fiesta",        orders: 112, revenue: "₱16,800"  },
];

export const staffPerformance: StaffPerformance[] = [
  { name: "Maria Santos",     actionsHandled: "412 orders",     avgSpeed: "12 mins", csat: "4.9 ★" },
  { name: "Juan Dela Cruz",   actionsHandled: "280 deliveries", avgSpeed: "24 mins", csat: "4.8 ★" },
  { name: "Regine Velasquez", actionsHandled: "320 payments",   avgSpeed: "15 mins", csat: "4.7 ★" },
  { name: "FOH Trainee",      actionsHandled: "144 table orders",avgSpeed: "18 mins", csat: "4.3 ★" },
];

// ── Dashboard Popular Items ────────────────────────────────────

export const popularItems = [
  { name: "Kare-Kare Classico",  orders: 48, price: "₱450", emoji: "🥘" },
  { name: "Crispy Pata Special", orders: 36, price: "₱850", emoji: "🍖" },
  { name: "Sinigang na Baboy",   orders: 29, price: "₱380", emoji: "🍲" },
  { name: "Halo-Halo Fiesta",    orders: 25, price: "₱150", emoji: "🍨" },
];

// ── Dashboard Recent Orders ────────────────────────────────────

export const recentOrders = mockOrders.slice(0, 6);

// ── Demo credentials ──────────────────────────────────────────

export const DEMO_CREDENTIALS = {
  email: "harvey@gmail.com",
  password: "harvey123",
};

export const DEMO_OTP = "842000";
