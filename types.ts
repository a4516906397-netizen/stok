export interface Warehouse {
  id: string;
  name: string;
  location: string;
  type: string;
}

export interface StockItem {
  id: string;
  warehouseId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  minThreshold: number;
  lastUpdated: string;
  description?: string;
  source?: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT' | 'DAMAGE';
  quantity: number;
  price: number; // Selling Price for OUT, Cost Price for IN
  costPrice?: number; // Added: To track the original cost during a sale for profit calc
  taxPercent?: number;
  date: string;
  partyName: string;
  userEmail: string;
}

export interface ChatMessage {
  id?: string;
  sender?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export type ViewMode = 'warehouses' | 'dashboard' | 'recent' | 'inventory' | 'add' | 'bulk_add' | 'bulk_sell' | 'ai' | 'team_chat';

export interface BulkAddItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  minThreshold: number;
  description?: string;
  source?: string;
  isNew: boolean;
}

export interface BulkSellItem {
  id: string;
  existingItemId?: string;
  name: string;
  category: string;
  quantity: number;
  sellPrice: number;
  taxPercent: number;
}

export interface InvoiceData {
  sellerName: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  items: BulkSellItem[];
  date: string;
  invoiceNumber: string;
}

export interface AIResponse {
  choices: {
    message: {
      content: string;
      tool_calls?: any[];
    };
  }[];
}