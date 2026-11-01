from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from app.models.real_estate import (
    Property,
    Tenant,
    Meter,
    MeterReading,
    PropertyType,
    ContractStatus,
    SubscriptionTier,
    MeterReadingType
)
from app.schemas.real_estate import (
    PropertyCreate,
    PropertyUpdate,
    TenantCreate,
    TenantUpdate,
    MeterCreate,
    MeterUpdate,
    MeterReadingCreate,
    CalculationResult,
    TierBreakdown,
    SubscriptionTierInfo,
    SubscriptionInfo
)


class RealEstateService:
    """Service layer for real estate operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== Property Methods ====================
    
    def create_property(self, property_data: PropertyCreate) -> Property:
        """Create a new property."""
        property_obj = Property(
            name=property_data.name,
            description=property_data.description,
            property_type=property_data.property_type,
            address=property_data.address,
            city=property_data.city,
            area=property_data.area,
            floor=property_data.floor,
            total_units=property_data.total_units,
            monthly_rent=property_data.monthly_rent
        )
        self.db.add(property_obj)
        self.db.commit()
        self.db.refresh(property_obj)
        return property_obj
    
    def get_property(self, property_id: int) -> Optional[Property]:
        """Get a property by ID."""
        return self.db.query(Property).filter(Property.id == property_id).first()
    
    def get_all_properties(self, skip: int = 0, limit: int = 100) -> List[Property]:
        """Get all properties with pagination."""
        return self.db.query(Property).offset(skip).limit(limit).all()
    
    def update_property(self, property_id: int, property_data: PropertyUpdate) -> Optional[Property]:
        """Update a property."""
        property_obj = self.get_property(property_id)
        if not property_obj:
            return None
        update_data = property_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(property_obj, field, value)
        property_obj.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(property_obj)
        return property_obj
    
    def delete_property(self, property_id: int) -> bool:
        """Delete a property."""
        property_obj = self.get_property(property_id)
        if not property_obj:
            return False
        self.db.delete(property_obj)
        self.db.commit()
        return True
    
    def get_property_stats(self, property_id: int) -> dict:
        """Get property statistics."""
        property_obj = self.get_property(property_id)
        if not property_obj:
            return {}
        tenants = self.db.query(Tenant).filter(Tenant.property_id == property_id).all()
        occupied_units = len(tenants)
        return {
            "property_id": property_id,
            "property_name": property_obj.name,
            "total_units": property_obj.total_units,
            "occupied_units": occupied_units,
            "vacant_units": property_obj.total_units - occupied_units,
            "tenants": [t.id for t in tenants],
            "contract_status": [t.status for t in tenants]
        }
    
    # ==================== Tenant Methods ====================
    
    def create_tenant(self, tenant_data: TenantCreate) -> Tenant:
        """Create a new tenant."""
        tenant_obj = Tenant(
            name=tenant_data.name,
            phone=tenant_data.phone,
            email=tenant_data.email,
            national_id=tenant_data.national_id,
            property_id=tenant_data.property_id,
            contract_start_date=tenant_data.contract_start_date,
            contract_end_date=tenant_data.contract_end_date,
            monthly_rent=tenant_data.monthly_rent,
            deposit_amount=tenant_data.deposit_amount
        )
        self.db.add(tenant_obj)
        self.db.commit()
        self.db.refresh(tenant_obj)
        return tenant_obj
    
    def get_tenant(self, tenant_id: int) -> Optional[Tenant]:
        """Get a tenant by ID."""
        return self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    def get_all_tenants(self, skip: int = 0, limit: int = 100) -> List[Tenant]:
        """Get all tenants with pagination."""
        return self.db.query(Tenant).offset(skip).limit(limit).all()
    
    def get_tenants_by_property(self, property_id: int) -> List[Tenant]:
        """Get all tenants for a property."""
        return self.db.query(Tenant).filter(Tenant.property_id == property_id).all()
    
    def update_tenant(self, tenant_id: int, tenant_data: TenantUpdate) -> Optional[Tenant]:
        """Update a tenant."""
        tenant_obj = self.get_tenant(tenant_id)
        if not tenant_obj:
            return None
        update_data = tenant_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tenant_obj, field, value)
        tenant_obj.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(tenant_obj)
        return tenant_obj
    
    def delete_tenant(self, tenant_id: int) -> bool:
        """Delete a tenant."""
        tenant_obj = self.get_tenant(tenant_id)
        if not tenant_obj:
            return False
        self.db.delete(tenant_obj)
        self.db.commit()
        return True
    
    # ==================== Meter Methods ====================
    
    def create_meter(self, meter_data: MeterCreate) -> Meter:
        """Create a new meter."""
        property_obj = self.get_property(meter_data.property_id)
        if not property_obj:
            raise ValueError("Property not found")
        existing_meters = self.db.query(Meter).filter(
            Meter.property_id == meter_data.property_id
        ).count()
        if existing_meters >= 2:
            raise ValueError("Property already has 2 meters. Maximum 2 meters per property.")
        meter_obj = Meter(
            property_id=meter_data.property_id,
            meter_type=meter_data.meter_type,
            meter_number=meter_data.meter_number,
            current_reading=0.0,
            previous_reading=0.0,
            subscription_tier=SubscriptionTier.STANDARD,
            is_locked=False,
            lock_until=None,
            total_calculations=0
        )
        self.db.add(meter_obj)
        self.db.commit()
        self.db.refresh(meter_obj)
        return meter_obj
    
    def get_meter(self, meter_id: int) -> Optional[Meter]:
        """Get a meter by ID."""
        return self.db.query(Meter).filter(Meter.id == meter_id).first()
    
    def get_all_meters(self, skip: int = 0, limit: int = 100) -> List[Meter]:
        """Get all meters with pagination."""
        return self.db.query(Meter).offset(skip).limit(limit).all()
    
    def get_meters_by_property(self, property_id: int) -> List[Meter]:
        """Get all meters for a property."""
        return self.db.query(Meter).filter(Meter.property_id == property_id).all()
    
    def update_meter(self, meter_id: int, meter_data: MeterUpdate) -> Optional[Meter]:
        """Update a meter."""
        meter_obj = self.get_meter(meter_id)
        if not meter_obj:
            return None
        update_data = meter_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(meter_obj, field, value)
        if 'subscription_tier' in update_data:
            meter_obj.subscription_tier = update_data['subscription_tier']
        meter_obj.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(meter_obj)
        return meter_obj
    
    def delete_meter(self, meter_id: int) -> bool:
        """Delete a meter."""
        meter_obj = self.get_meter(meter_id)
        if not meter_obj:
            return False
        self.db.delete(meter_obj)
        self.db.commit()
        return True
    
    # ==================== Meter Reading Methods ====================
    
    def get_meter_readings(self, meter_id: int, skip: int = 0, limit: int = 100) -> List[MeterReading]:
        """Get all readings for a meter."""
        return self.db.query(MeterReading).filter(
            MeterReading.meter_id == meter_id
        ).order_by(MeterReading.reading_date.desc()).offset(skip).limit(limit).all()
    
    def get_latest_reading(self, meter_id: int) -> Optional[MeterReading]:
        """Get the latest reading for a meter."""
        return self.db.query(MeterReading).filter(
            MeterReading.meter_id == meter_id
        ).order_by(MeterReading.reading_date.desc()).first()
    
    def calculate_meter_reading(
        self, 
        meter_id: int, 
        current_reading: float, 
        calculated_by: str
    ) -> Tuple[MeterReading, Meter]:
        """
        Calculate meter reading with tier pricing logic.
        
        Pricing: First 2 units (tier 1): 0.18 SAR/unit
                 Additional units (tier 2): 0.30 SAR/unit
        Locking: After 2 calculations, meter locks for 30 days
        """
        meter_obj = self.get_meter(meter_id)
        if not meter_obj:
            raise ValueError("Meter not found")
        
        if meter_obj.is_locked:
            if meter_obj.lock_until and meter_obj.lock_until > datetime.utcnow():
                raise ValueError(f"Meter is locked until {meter_obj.lock_until.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                meter_obj.is_locked = False
                meter_obj.total_calculations = 0
        
        previous_reading = meter_obj.current_reading
        if previous_reading > current_reading:
            raise ValueError("Current reading must be greater than previous reading")
        
        units_consumed = current_reading - previous_reading
        
        tier1_units = min(2, units_consumed)
        tier2_units = units_consumed - tier1_units
        
        tier1_cost = tier1_units * 0.18
        tier2_cost = tier2_units * 0.30
        cost_before_tax = tier1_cost + tier2_cost
        
        property_meters = self.get_meters_by_property(meter_obj.property_id)
        property_meters_count = len(property_meters)
        
        if property_meters_count == 1:
            subscription_cost = 175
        elif property_meters_count == 2:
            subscription_cost = 175
        else:
            subscription_cost = 175 + (property_meters_count - 2) * 35
        
        service_fee = 10.0
        total_cost = cost_before_tax + subscription_cost + service_fee
        
        tax_amount = total_cost * 0.15
        total_cost += tax_amount
        
        meter_obj.previous_reading = previous_reading
        meter_obj.current_reading = current_reading
        meter_obj.total_calculations += 1
        
        if meter_obj.total_calculations >= 2:
            meter_obj.is_locked = True
            meter_obj.lock_until = datetime.utcnow() + timedelta(days=30)
        
        reading_obj = MeterReading(
            meter_id=meter_id,
            current_reading=current_reading,
            previous_reading=previous_reading,
            units_consumed=units_consumed,
            cost_before_tax=cost_before_tax,
            tax_amount=tax_amount,
            total_cost=total_cost,
            calculated_by=calculated_by
        )
        
        self.db.add(reading_obj)
        self.db.commit()
        self.db.refresh(reading_obj)
        self.db.refresh(meter_obj)
        
        return reading_obj, meter_obj
    
    # ==================== Subscription Methods ====================
    
    def get_all_subscription_tiers(self) -> List[SubscriptionTierInfo]:
        """Get all subscription pricing tiers."""
        return [
            SubscriptionTierInfo(
                tier_name="Basic",
                max_meters=2,
                monthly_cost=175,
                description="For properties with up to 2 meters"
            ),
            SubscriptionTierInfo(
                tier_name="Standard",
                max_meters=5,
                monthly_cost=175 + (3 * 35),
                description="For properties with 3-5 meters"
            ),
            SubscriptionTierInfo(
                tier_name="Premium",
                max_meters=10,
                monthly_cost=175 + (8 * 35),
                description="For properties with 6-10 meters"
            ),
            SubscriptionTierInfo(
                tier_name="Enterprise",
                max_meters=50,
                monthly_cost=175 + (48 * 35),
                description="For properties with 11-50 meters"
            )
        ]
    
    def calculate_subscription_cost(self, property_id: int) -> SubscriptionInfo:
        """Calculate subscription cost for a property."""
        property_obj = self.get_property(property_id)
        if not property_obj:
            raise ValueError("Property not found")
        
        meters = self.get_meters_by_property(property_id)
        meter_count = len(meters)
        
        if meter_count <= 2:
            base_cost = 175
        else:
            base_cost = 175 + (meter_count - 2) * 35
        
        service_fee = 10.0
        total_cost = base_cost + service_fee
        
        tax_amount = total_cost * 0.15
        final_cost = total_cost + tax_amount
        
        if meter_count <= 2:
            tier = "Basic"
        elif meter_count <= 5:
            tier = "Standard"
        elif meter_count <= 10:
            tier = "Premium"
        else:
            tier = "Enterprise"
        
        return SubscriptionInfo(
            property_id=property_id,
            property_name=property_obj.name,
            meter_count=meter_count,
            tier=tier,
            base_cost=base_cost,
            service_fee=service_fee,
            tax_amount=tax_amount,
            total_cost=final_cost
        )


