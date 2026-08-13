// Shared TypeScript types mirroring the backend Pydantic schemas.

export interface Vendor {
  id: number;
  business_name: string;
  category?: string | null;
  subcategory?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  governorate?: string | null;
  city?: string | null;
  address?: string | null;
  instagram_username?: string | null;
  instagram_url?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  google_rating?: number | null;
  google_review_count?: number | null;
  description?: string | null;
  source?: string | null;
  source_url?: string | null;
  oman_verified: boolean;
  verification_status?: string | null;
  confidence_score: number;
  category_confidence: number;
  quality_score: number;
  status: VendorStatus;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type VendorStatus =
  | "New"
  | "Needs Verification"
  | "Verified"
  | "Rejected"
  | "Duplicate"
  | "Approved";

export interface VendorList {
  total: number;
  page: number;
  page_size: number;
  items: Vendor[];
}

export interface Stats {
  total_vendors: number;
  verified: number;
  needs_verification: number;
  approved: number;
  rejected: number;
  categories: number;
  governorates: number;
  instagram_accounts: number;
  google_maps_matches: number;
  by_category: Record<string, number>;
  by_governorate: Record<string, number>;
  by_status: Record<string, number>;
}

export interface Job {
  id: number;
  status: string;
  governorate?: string | null;
  depth: string;
  total_queries: number;
  completed_queries: number;
  results_found: number;
  new_vendors: number;
  duplicates: number;
  needs_verification: number;
  errors: number;
  current_category?: string | null;
  message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface DiscoveryMeta {
  categories: string[];
  governorates: string[];
  search_provider: string;
  google_maps_enabled: boolean;
  manual_mode: boolean;
}

export interface Filters {
  q?: string;
  category?: string;
  governorate?: string;
  status?: string;
  has_instagram?: boolean;
  has_google_maps?: boolean;
  has_phone?: boolean;
  has_website?: boolean;
  min_rating?: number;
  min_confidence?: number;
  sort?: string;
  page?: number;
  page_size?: number;
}
