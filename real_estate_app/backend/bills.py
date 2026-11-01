"""
Meter Billing System
نظام فواتير العدادات - الكهرباء والماء (البريميوم)
"""

from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from models import Meter, MeterBill, MeterType


# ==================== Configuration Constants ====================
# قيم الثوابت للفوترة
TIER1_PRICE = Decimal("0.18")  # سعر الشريحة الأولى: 18 هللة
TIER2_PRICE = Decimal("0.30")  # سعر الشريحة الثانية: 30 هللة
SERVICE_FEE = Decimal("10.00")  # رسوم الخدمة: 10 ريال
VAT_RATE = Decimal("0.15")  # نسبة الضريبة: 15%
MAX_ATTEMPTS = 2  # الحد الأقصى لمحاولات الحساب: 2 محاولة
BLOCK_DAYS = 30  # الأيام المسموح بها بعد 2 محاولة: 30 يوماً


class BillingError(Exception):
    """Custom exception for billing errors"""
    pass


class CalculationResult:
    """Result object for billing calculation"""
    def __init__(self, success, total_amount, tier1_amount, tier2_amount, service_fee, vat, consumption, calculation_date, message=""):
        self.success = success
        self.total_amount = total_amount
        self.tier1_amount = tier1_amount
        self.tier2_amount = tier2_amount
        self.service_fee = service_fee
        self.vat = vat
        self.consumption = consumption
        self.calculation_date = calculation_date
        self.message = message

    def to_dict(self):
        return {
            "success": self.success,
            "total_amount": float(self.total_amount),
            "tier1_amount": float(self.tier1_amount),
            "tier2_amount": float(self.tier2_amount),
            "service_fee": float(self.service_fee),
            "vat": float(self.vat),
            "consumption": self.consumption,
            "calculation_date": self.calculation_date.isoformat() if self.calculation_date else None,
            "message": self.message,
        }


def get_subscription_fee(meter_count):
    if meter_count < 2:
        return Decimal("0.00")
    elif meter_count == 2:
        return Decimal("175.00")
    else:
        base_fee = Decimal("175.00")
        additional_fee = Decimal(str(meter_count - 2)) * Decimal("35.00")
        total_fee = base_fee + additional_fee
        return min(total_fee, Decimal("50.00"))


def calculate_meter_bill(db, meter_id, consumption, calculation_date=None):
    if calculation_date is None:
        calculation_date = datetime.now()

    if consumption < 0:
        return CalculationResult(False, Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), consumption, calculation_date, "Consumption cannot be negative")

    if consumption == 0:
        return CalculationResult(False, Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), consumption, calculation_date, "Consumption must be greater than zero")

    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        return CalculationResult(False, Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), consumption, calculation_date, "Meter not found")

    check_result = check_calculation_allowed(db, meter, calculation_date)
    if not check_result["allowed"]:
        return CalculationResult(False, Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), consumption, calculation_date, check_result["message"])

    tier1_limit = 100
    tier1_consumption = min(consumption, tier1_limit)
    tier2_consumption = max(0, consumption - tier1_limit)

    tier1_amount = tier1_consumption * TIER1_PRICE
    tier2_amount = tier2_consumption * TIER2_PRICE

    subtotal = tier1_amount + tier2_amount + SERVICE_FEE
    vat = subtotal * VAT_RATE
    total_amount = subtotal + vat

    tier1_amount = tier1_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tier2_amount = tier2_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    service_fee = SERVICE_FEE.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    vat = vat.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_amount = total_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return CalculationResult(True, total_amount, tier1_amount, tier2_amount, service_fee, vat, consumption, calculation_date, "Calculation completed successfully")


def check_calculation_allowed(db, meter, calculation_date):
    current_attempts = meter.last_attempt_count

    if current_attempts >= MAX_ATTEMPTS:
        days_since_last_reading = (calculation_date - meter.last_reading_date).days

        if days_since_last_reading < BLOCK_DAYS:
            remaining_days = BLOCK_DAYS - days_since_last_reading
            return {"allowed": False, "message": f"Calculation blocked for {remaining_days} more days. Please try again after {remaining_days} days."}

        return {"allowed": True, "message": "Calculation allowed after 30 days from last attempt"}

    hours_since_last_reading = (calculation_date - meter.last_reading_date).total_seconds() / 3600
    if hours_since_last_reading < 24:
        return {"allowed": False, "message": f"Calculation too soon. Please try again after 24 hours."}

    return {"allowed": True, "message": "Calculation allowed"}


def create_meter_bill_record(db, meter_id, consumption, calculation_date=None):
    if calculation_date is None:
        calculation_date = datetime.now()

    meter = db.query(Meter).filter(Meter.id == meter_id).first()
    if not meter:
        return None

    check_result = check_calculation_allowed(db, meter, calculation_date)
    if not check_result["allowed"]:
        return None

    calc_result = calculate_meter_bill(db, meter_id, consumption, calculation_date)
    if not calc_result.success:
        return None

    meter_bill = MeterBill(
        meter_id=meter_id,
        consumption=consumption,
        tier1_amount=calc_result.tier1_amount,
        tier2_amount=calc_result.tier2_amount,
        service_fee=calc_result.service_fee,
        vat=calc_result.vat,
        total_amount=calc_result.total_amount,
        calculation_date=calculation_date
    )

    db.add(meter_bill)
    meter.last_reading_date = calculation_date
    meter.last_attempt_count += 1

    db.commit()
    db.refresh(meter_bill)

    return meter_bill
