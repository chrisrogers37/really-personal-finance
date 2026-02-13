export interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  accountName: string | null;
  accountType: string | null;
}

export interface CategoryData {
  category: string;
  total: number;
  count: number;
}

export interface MerchantData {
  merchant: string;
  total: number;
  count: number;
  avgAmount: number;
  isRecurring: boolean;
}
