import codecs

code = '''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام إدارة العقارات</title>
    <link rel="stylesheet" href="src/styles.css">
    <script type="module" src="src/app.js"></script>
</head>
<body>
    <header>
        <h1>🏢 نظام إدارة العقارات</h1>
        <nav>
            <button onclick="showSection('dashboard')" id="nav-dashboard" class="active">📊 لوحة التحكم</button>
            <button onclick="showSection('properties')" id="nav-properties">🏠 العقارات</button>
            <button onclick="showSection('units')" id="nav-units">🚪 الوحدات</button>
            <button onclick="showSection('tenants')" id="nav-tenants">👥 المستأجرين</button>
            <button onclick="showSection('contracts')" id="nav-contracts">📄 العقود</button>
            <button onclick="showSection('meters')" id="nav-meters">⚡ العدادات</button>
            <button onclick="showSection('bills')" id="nav-bills">💰 الفواتير</button>
        </nav>
    </header>
    <div class="container">
        <div id="toast-container"></div>
        <div id="dashboard" class="section active">
            <div class="stats-grid">
                <div class="stat-card"><div class="number" id="total-properties">0</div><div class="label">العقارات</div></div>
                <div class="stat-card"><div class="number" id="total-units">0</div><div class="label">الوحدات</div></div>
                <div class="stat-card"><div class="number" id="active-contracts">0</div><div class="label">العقود النشطة</div></div>
                <div class="stat-card"><div class="number" id="pending-bills">0</div><div class="label">الفواتير المعلقة</div></div>
            </div>
            <div class="card"><h2>📋 العقارات</h2><div id="properties-list"></div></div>
            <div class="card"><h2>📄 العقود</h2><div id="contracts-list"></div></div>
            <div class="card"><h2>⚡ العدادات</h2><div id="meters-list"></div></div>
        </div>
        <div id="properties" class="section hidden">
            <div class="card"><h2>➕ إنشاء عقار جديد</h2><form id="property-form"><div class="form-group"><label>اسم العقار</label><input type="text" id="property-name" required></div><div class="form-group"><label>العنوان</label><input type="text" id="property-address" required></div><button type="submit" class="btn btn-primary">إنشاء العقار</button></form></div>
            <div class="card"><h2>📋 قائمة العقارات</h2><div id="properties-list"></div></div>
        </div>
        <div id="units" class="section hidden">
            <div class="card"><h2>➕ إنشاء وحدة جديدة</h2><form id="unit-form"><div class="form-group"><label>العقار</label><select id="unit-property" required></select></div><div class="form-group"><label>رقم الوحدة</label><input type="text" id="unit-number" required></div><div class="form-group"><label>رقم العداد (اختياري)</label><input type="text" id="unit-meter"></div><button type="submit" class="btn btn-primary">إنشاء الوحدة</button></form></div>
            <div class="card"><h2>📋 قائمة الوحدات</h2><div id="units-list"></div></div>
        </div>
        <div id="tenants" class="section hidden">
            <div class="card"><h2>➕ إضافة مستأجر جديد</h2><form id="tenant-form"><div class="form-group"><label>اسم المستأجر</label><input type="text" id="tenant-name" required></div><div class="form-group"><label>رقم الهاتف</label><input type="tel" id="tenant-phone" required></div><button type="submit" class="btn btn-primary">إضافة المستأجر</button></form></div>
            <div class="card"><h2>📋 قائمة المستأجرين</h2><div id="tenants-list"></div></div>
        </div>
        <div id="contracts" class="section hidden">
            <div class="card"><h2>➕ إنشاء عقد جديد</h2><form id="contract-form"><div class="form-group"><label>الوحدة</label><select id="contract-unit" required></select></div><div class="form-group"><label>المستأجر</label><select id="contract-tenant" required></select></div><div class="form-group"><label>المبلغ (SAR)</label><input type="number" id="contract-amount" required></div><div class="form-group"><label>تاريخ الاستحقاق</label><input type="date" id="contract-due-date" required></div><button type="submit" class="btn btn-primary">إنشاء العقد</button></form></div>
            <div class="card"><h2>📋 قائمة العقود</h2><div id="contracts-table"></div></div>
        </div>
        <div id="meters" class="section hidden">
            <div class="card"><h2>➕ إضافة عداد جديد</h2><form id="meter-form"><div class="form-group"><label>الوحدة</label><select id="meter-unit" required></select></div><div class="form-group"><label>نوع العداد</label><select id="meter-type"><option value="electricity">⚡ كهرباء</option><option value="water">💧 ماء</option></select></div><div class="form-group"><label>رقم العداد</label><input type="text" id="meter-number" required></div><div class="form-group"><label>آخر قراءة</label><input type="date" id="meter-last-reading" required></div><button type="submit" class="btn btn-primary">إضافة العداد</button></form></div>
            <div class="card"><h2>⚡ قراءة العدادات وحساب الفواتير</h2><form id="reading-form"><div class="form-group"><label>العداد</label><select id="reading-meter" required></select></div><div class="form-group"><label>القراءة الحالية</label><input type="number" id="reading-value" required min="0"></div><div class="form-group"><label>تاريخ القراءة</label><input type="date" id="reading-date" required></div><button type="submit" class="btn btn-success">حساب الفاتورة</button></form><div id="calculation-result" class="hidden" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;"></div></div>
            <div class="card"><h2>📋 قائمة العدادات</h2><div id="meters-list"></div></div>
        </div>
        <div id="bills" class="section hidden">
            <div class="card"><h2>📋 الفواتير</h2><div id="bills-list"></div></div>
        </div>
    </div>
    <script>
    document.getElementById('property-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('property-name').value;
        const address = document.getElementById('property-address').value;
        const result = await createProperty(name, address);
        if (result) {
            e.target.reset();
            await initDashboard();
            await populatePropertySelect();
            await populateUnitSelect();
        }
    });
    document.getElementById('unit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const propertyId = document.getElementById('unit-property').value;
        const unitNumber = document.getElementById('unit-number').value;
        const meterNumber = document.getElementById('unit-meter').value || null;
        const result = await createUnit(propertyId, unitNumber, meterNumber);
        if (result) {
            e.target.reset();
            await initDashboard();
            await populateUnitSelect();
        }
    });
    async function populatePropertySelect() {
        const properties = await getProperties();
        const select = document.getElementById('unit-property');
        if (select) {
            select.innerHTML = properties.length ? properties.map(p => '<option value=' + p.id + '>' + p.name + '</option>').join('') : '<option value="">لا توجد عقارات</option>';
        }
    }
    async function populateUnitSelect() {
        const units = await getUnits();
        const select = document.getElementById('contract-unit');
        if (select) {
            select.innerHTML = units.length ? units.map(u => '<option value=' + u.id + '>' + u.unit_number + '</option>').join('') : '<option value="">لا توجد وحدات</option>';
        }
    }
    async function populateTenantSelect() {
        const tenants = await getTenants();
        const select = document.getElementById('contract-tenant');
        if (select) {
            select.innerHTML = tenants.length ? tenants.map(t => '<option value=' + t.id + '>' + t.name + '</option>').join('') : '<option value="">لا توجد مستأجرين</option>';
        }
    }
    async function populateMeterSelect() {
        const meters = await getMeters();
        const select = document.getElementById('reading-meter');
        if (select) {
            select.innerHTML = meters.length ? meters.map(m => '<option value=' + m.id + '>' + m.meter_number + ' (' + (m.meter_type === 'electricity' ? 'كهرباء' : 'ماء') + ')</option>').join('') : '<option value="">لا توجد عدادات</option>';
        }
    }
    document.getElementById('reading-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const meterId = document.getElementById('reading-meter').value;
        const consumption = parseInt(document.getElementById('reading-value').value);
        const readingDate = document.getElementById('reading-date').value;
        if (!meterId || isNaN(consumption) || consumption <= 0) {
            showToast('يرجى إدخال بيانات صحيحة', 'error');
            return;
        }
        const result = await calculateMeterBill(meterId, consumption);
        const resultDiv = document.getElementById('calculation-result');
        if (result.success) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<h3 style=color: green; margin-bottom: 15px;>✅ تم حساب الفاتورة بنجاح</h3>' + 
                '<div style=display: grid; grid-template-columns: 1fr 1fr; gap: 10px;>' + 
                '<div>الاستهلاك: <strong>' + result.consumption + ' وحدة</strong></div>' + 
                '<div>التاريخ: <strong>' + formatDate(readingDate) + '</strong></div>' + 
                '<div>الشريحة 1 (0-100): <strong>' + formatCurrency(result.tier1_amount) + '</strong></div>' + 
                '<div>الشريحة 2 (101+): <strong>' + formatCurrency(result.tier2_amount) + '</strong></div>' + 
                '<div>رسوم الخدمة: <strong>' + formatCurrency(result.service_fee) + '</strong></div>' + 
                '<div>الضريبة (15%): <strong>' + formatCurrency(result.vat) + '</strong></div>' + 
                '<div style=grid-column: span 2; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px;>' + 
                '<div style=font-size: 1.2em;>المبلغ الإجمالي: <strong style=color: #dc3545;>' + formatCurrency(result.total_amount) + '</strong></div>' + 
                '</div>' + 
                '</div>';
            showToast('تم حساب الفاتورة بنجاح', 'success');
        } else {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<h3 style=color: red; margin-bottom: 10px;>❌ فشل في حساب الفاتورة</h3>' + 
                '<p style=color: #666;>' + result.message + '</p>';
            showToast(result.message, 'error');
        }
    });
    async function initDashboard() {
        const properties = await getProperties();
        const contracts = await getContracts();
        const meters = await getMeters();
        const bills = await getMeterBills();
        document.getElementById("total-properties").textContent = properties.length;
        document.getElementById("total-units").textContent = meters.length;
        document.getElementById("active-contracts").textContent = contracts.filter(c => c.status === "active").length;
        document.getElementById("pending-bills").textContent = bills.filter(b => b.status === "active").length;
        document.getElementById("properties-list").innerHTML = properties.length ? properties.map(p => '<div class="card" style="padding:10px;margin-bottom:10px"><strong>' + p.name + '</strong><br>' + p.address + '</div>').join("") : '<p class="loading">لا توجد عقارات</p>';
        document.getElementById("contracts-list").innerHTML = contracts.length ? contracts.map(c => '<div class="card" style="padding:10px;margin-bottom:10px"><strong>العقد #' + c.id + '</strong><span class="px-3 py-1 rounded-full text-sm ' + getStatusColor(c.status) + '">' + (c.status === "active" ? "نشط" : c.status === "paid" ? "مدفوع" : c.status === "overdue" ? "متأخر" : "ملغي") + '</span><p>المبلغ: ' + formatCurrency(c.amount) + '</p><p class="text-sm">تاريخ الاستحقاق: ' + formatDate(c.due_date) + '</p></div>').join("") : '<p class="loading">لا توجد عقود</p>';
        document.getElementById("meters-list").innerHTML = meters.length ? meters.map(m => '<div class="card" style="padding:10px;margin-bottom:10px"><strong>العداد #' + m.meter_number + '</strong><p>' + (m.meter_type === "electricity" ? "الكهرباء" : "الماء") + '</p><p class="text-sm">آخر قراءة: ' + formatDate(m.last_reading_date) + '</p></div>').join("") : '<p class="loading">لا توجد عدادات</p>';
    }
    document.querySelectorAll('nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    window.addEventListener('load', async () => {
        await initDashboard();
        await populatePropertySelect();
        await populateUnitSelect();
        await populateTenantSelect();
        await populateMeterSelect();
    });
    </script>
</body>
</html>
'''

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(code)
print('HTML created')
