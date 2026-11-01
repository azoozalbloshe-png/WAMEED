// User Types
export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  created_at: string
}

// Auth Types
export interface AuthResponse {
  access_token: string
  token_type: string
  user_id: number
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
}

export interface ErrorResponse {
  detail: string
}

// Property Types
export interface Property {
  id: number
  name: string
  description: string | null
  property_type: string
  address: string | null
  city: string | null
  area: string | null
  floor: number | null
  total_units: number
  occupied_units: number
  monthly_rent: number
  status: string
  created_at: string
  updated_at: string | null
}

export interface PropertyCreate {
  name: string
  description?: string
  property_type: string
  address?: string
  city?: string
  area?: string
  floor?: number
  total_units: number
  monthly_rent: number
}

export interface PropertyUpdate {
  name?: string
  description?: string
  property_type?: string
  address?: string
  city?: string
  area?: string
  floor?: number
  total_units?: number
  monthly_rent?: number
}

export interface PropertyResponse extends PropertyCreate {
  id: number
  occupied_units: number
  status: string
  created_at: string
  updated_at: string | null
}

// Tenant Types
export interface Tenant {
  id: number
  name: string
  phone: string | null
  email: string | null
  national_id: string | null
  property_id: number
  contract_start_date: string
  contract_end_date: string
  monthly_rent: number
  deposit_amount: number
  status: string
  created_at: string
  updated_at: string | null
  property?: PropertyResponse
}

export interface TenantCreate {
  name: string
  phone?: string
  email?: string
  national_id?: string
  property_id: number
  contract_start_date: string
  contract_end_date: string
  monthly_rent?: number
  deposit_amount?: number
}

export interface TenantUpdate {
  name?: string
  phone?: string
  email?: string
  national_id?: string
  monthly_rent?: number
  deposit_amount?: number
}

export interface TenantResponse extends TenantCreate {
  id: number
  status: string
  created_at: string
  updated_at: string | null
  property: PropertyResponse
}

// Meter Types
export interface Meter {
  id: number
  property_id: number
  meter_type: string
  meter_number: string
  current_reading: number
  previous_reading: number
  is_locked: boolean
  lock_until: string | null
  subscription_tier: string
  total_calculations: number
  created_at: string
  updated_at: string | null
}

export interface MeterCreate {
  property_id: number
  meter_type: string
  meter_number: string
}

export interface MeterUpdate {
  meter_type?: string
  current_reading?: number
  subscription_tier?: string
}

export interface MeterResponse extends MeterCreate {
  id: number
  property: PropertyResponse
  current_reading: number
  previous_reading: number
  is_locked: boolean
  lock_until: string | null
  subscription_tier: string
  total_calculations: number
  created_at: string
  updated_at: string | null
}

// Meter Reading Types
export interface MeterReading {
  id: number
  meter_id: number
  reading_date: string
  current_reading: number
  previous_reading: number
  units_consumed: number
  cost_before_tax: number
  tax_amount: number
  total_cost: number
  calculated_by: string | null
  notes: string | null
  created_at: string
}

export interface MeterReadingCreate {
  meter_id: number
  current_reading: number
  previous_reading: number
  notes?: string
}

export interface MeterReadingResponse extends MeterReadingCreate {
  id: number
  meter_id: number
  reading_date: string
  cost_before_tax: number
  tax_amount: number
  total_cost: number
  calculated_by: string | null
  notes: string | undefined
  created_at: string
  meter?: MeterResponse
}

// Subscription Types
export interface SubscriptionTierInfo {
  tier: string
  name: string
  price_multiplier: number
  description: string
}

export interface SubscriptionInfo {
  property_id: number
  property_name: string
  meter_count: number
  tier: string
  base_cost: number
  service_fee: number
  tax_amount: number
  total_cost: number
}

// Tier Breakdown
export interface TierBreakdown {
  tier_name: string
  price_per_unit: number
  units: number
  cost: number
  is_primary: boolean
}

// Calculation Result Type
export interface CalculationResult {
  meter_number: string
  meter_type: string
  previous_reading: number
  current_reading: number
  units_consumed: number
  cost_before_tax: number
  tax_amount: number
  total_cost: number
  tier_breakdown: TierBreakdown[]
  is_locked: boolean
  lock_expiry_date: string | null
  remaining_attempts: number | undefined
}
