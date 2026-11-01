/* Real Estate Management Frontend */
import { API_BASE_URL, API_ENDPOINTS } from './config.js';

class APIClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        this.timeout = 10000;
    }
    async get(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, { method: 'GET', headers: { "Content-Type": "application/json" }, signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("HTTP error!");
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    async post(endpoint, data = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(this.baseURL + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("");
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}

const api = new APIClient();

async function getProperties() {
    try { return (await api.get(API_ENDPOINTS.properties)).properties || []; }
    catch { return []; }
}

async function getUnits() {
    try { return (await api.get(API_ENDPOINTS.units)).units || []; }
    catch { return []; }
}

async function createProperty(name, address) {
    try { return await api.post(API_ENDPOINTS.properties, { name, address }); }
    catch { return null; }
}

async function createUnit(propertyId, unitNumber, meterNumber = null) {
    try {
        const data = { property_id: propertyId, unit_number: unitNumber };
        if (meterNumber) data.meter_number = meterNumber;
        return await api.post(API_ENDPOINTS.units, data);
    } catch { return null; }
}

async function getTenants() {
    try { return (await api.get(API_ENDPOINTS.tenants)).tenants || []; }
    catch { return []; }
}

async function getContracts() {
    try { return (await api.get(API_ENDPOINTS.contracts)).contracts || []; }
    catch { return []; }
}

async function getMeters() {
    try { return (await api.get(API_ENDPOINTS.meters)).meters || []; }
    catch { return []; }
}

async function getMeterBills() {
    try { return (await api.get(API_ENDPOINTS.bills)).bills || []; }
    catch { return []; }
}

async function calculateMeterBill(meterId, consumption) {
    try { return await api.post("/bills/calculate", { meter_id: meterId, consumption }); }
    catch { return { success: false, message: "فشل في حساب الفاتورة" }; }
}

let toastTimeout;
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    const container = document.getElementById("toast-container");
    if (!container) {
        const div = document.createElement("div");
        div.id = "toast-container";
        div.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000;";
        document.body.appendChild(div);
    }
    document.getElementById("toast-container").appendChild(toast);
    toastTimeout = setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 300); }, 3000);
}

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove("hidden");
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount);
}

function getStatusColor(status) {
    const colors = { active: "bg-green-100 text-green-800", paid: "bg-blue-100 text-blue-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800", electricity: "bg-yellow-100 text-yellow-800", water: "bg-cyan-100 text-cyan-800" };
    return colors[status] || "bg-gray-100 text-gray-800";
}

export {
    getProperties, getUnits, createProperty, createUnit,
    getTenants, getContracts, getMeters, getMeterBills, calculateMeterBill,
    showToast, showSection, formatDate, formatCurrency, getStatusColor
};
