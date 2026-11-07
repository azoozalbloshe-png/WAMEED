import apiClient from "./api";
export interface PropertyRecord {
  id: number;
  archived_at?: string | null;
  name: string;
  description?: string | null;
  property_type: string;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  floor?: number | null;
  total_units: number;
  occupied_units: number;
  monthly_rent: number;
  status: string;
}
export interface TenantRecord {
  id: number;
  archived_at?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  national_id?: string | null;
  property_id: number;
  property?: PropertyRecord;
  contract_start_date: string;
  contract_end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
}
export interface ContractRecord {
  id: number;
  property_id: number;
  property_name: string;
  tenant_id: number;
  tenant_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_rent: number;
  deposit_amount: number;
  notes?: string | null;
}
export interface MeterRecord {
  id: number;
  property_id: number;
  property?: PropertyRecord;
  meter_type: string;
  meter_number: string;
  current_reading: number;
  previous_reading: number;
  is_locked: boolean;
  lock_until?: string | null;
}
export interface ReadingRecord {
  id: number;
  meter_id: number;
  reading_date: string;
  current_reading: number;
  previous_reading: number;
  units_consumed: number;
  cost_before_tax: number;
  tax_amount: number;
  total_cost: number;
  notes?: string | null;
}
export interface MeterCreateRecord {
  property_id: number;
  meter_type: "electricity" | "water" | "gas";
  meter_number: string;
}
export interface RentPaymentRecord {
  id: number;
  contract_id: number;
  tenant_name: string;
  property_name: string;
  amount: number;
  paid_at: string;
  method?: string | null;
  transaction_code?: string | null;
  notes?: string | null;
}
export interface PropertyExpenseRecord {
  id: number;
  property_id: number;
  property_name: string;
  amount: number;
  category: string;
  spent_at: string;
  description?: string | null;
  invoice_reference?: string | null;
}
export interface DashboardSummary {
  properties: number;
  tenants: number;
  contracts: number;
  active_contracts: number;
  monthly_rent_due: number;
  units: number;
  occupied_units: number;
  meters: number;
  upcoming_contracts: {
    id: number;
    tenant: string;
    property: string;
    end_date: string;
  }[];
  collections_recorded: boolean;
  expenses_recorded: boolean;
  collected_this_month: number;
  expenses_this_month: number;
}
const base = "/api/real-estate";
async function allPages<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  for (let skip = 0; ; skip += 100) {
    const rows = await apiClient.get<T[]>(
      `${base}/${path}${path.includes("?") ? "&" : "?"}skip=${skip}&limit=100`,
    );
    result.push(...rows);
    if (rows.length < 100) return result;
  }
}
export const realEstateService = {
  getProperties: (skip?: number, limit?: number) =>
    skip === undefined
      ? allPages<PropertyRecord>("properties")
      : apiClient.get<PropertyRecord[]>(
          `${base}/properties?skip=${skip}&limit=${limit || 100}`,
        ),
  getArchivedProperties: () => allPages<PropertyRecord>("properties?archived_only=true"),
  getHistoricalProperties: () => allPages<PropertyRecord>("properties?include_archived=true"),
  createProperty: (data: unknown) =>
    apiClient.post<PropertyRecord>(`${base}/properties`, data),
  getTenants: () => allPages<TenantRecord>("tenants"),
  createTenant: (data: unknown) =>
    apiClient.post<TenantRecord>(`${base}/tenants`, data),
  getContracts: () => apiClient.get<ContractRecord[]>(`${base}/contracts`),
  createContract: (data: unknown) =>
    apiClient.post<ContractRecord>(`${base}/contracts`, data),
  getPayments: () => apiClient.get<RentPaymentRecord[]>(`${base}/payments`),
  createPayment: (data: unknown) =>
    apiClient.post<RentPaymentRecord>(`${base}/payments`, data),
  getExpenses: () => apiClient.get<PropertyExpenseRecord[]>(`${base}/expenses`),
  createExpense: (data: unknown) =>
    apiClient.post<PropertyExpenseRecord>(`${base}/expenses`, data),
  getMeters: () => allPages<MeterRecord>("meters"),
  createMeter: (data: MeterCreateRecord) =>
    apiClient.post<MeterRecord>(`${base}/meters`, data),
  getMeterReadings: (id: number) =>
    apiClient.get<ReadingRecord[]>(`${base}/meters/${id}/readings`),
  calculateMeter: (id: number, currentReading: number, notes = "") =>
    apiClient.post<ReadingRecord>(
      `${base}/meters/${id}/calculate?current_reading=${encodeURIComponent(currentReading)}&notes=${encodeURIComponent(notes)}`,
    ),
  getDashboardSummary: () =>
    apiClient.get<DashboardSummary>(`${base}/dashboard/summary`),
};
