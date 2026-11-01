import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MapPin, Trash2, Home, X, Check, Layers, DollarSign, Activity } from 'lucide-react';

interface Property {
  id: number;
  name: string;
  type: string;
  location: string;
  units: number;
  status: 'مؤجر بالكامل' | 'شاغر جزئياً' | 'متاح';
  income: number;
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('wamid_properties');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 1, name: 'برج وميض التجاري', type: 'عمارة تجارية', location: 'حي المروج', units: 12, status: 'مؤجر بالكامل', income: 15000 },
      { id: 2, name: 'مجمّع الوالدين السكني', type: 'فلل وادوار', location: 'حي الياسمين', units: 6, status: 'شاغر جزئياً', income: 9400 },
      { id: 3, name: 'عقارات الشفاء الفاخرة', type: 'شقق مفروشة', location: 'حي الشفاء', units: 8, status: 'متاح', income: 0 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('wamid_properties', JSON.stringify(properties));
  }, [properties]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('عمارة سكنية');
  const [newLocation, setNewLocation] = useState('');
  const [newUnits, setNewUnits] = useState('');
  const [newIncome, setNewIncome] = useState('');
  const [newStatus, setNewStatus] = useState<'مؤجر بالكامل' | 'شاغر جزئياً' | 'متاح'>('متاح');

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newLocation || !newUnits) return;

    const newProp: Property = {
      id: Date.now(),
      name: newName,
      type: newType,
      location: newLocation,
      units: parseInt(newUnits) || 1,
      status: newStatus,
      income: parseFloat(newIncome) || 0,
    };

    setProperties([newProp, ...properties]);
    setNewName('');
    setNewType('عمارة سكنية');
    setNewLocation('');
    setNewUnits('');
    setNewIncome('');
    setNewStatus('متاح');
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  const handleStatusChange = (id: number, status: 'مؤجر بالكامل' | 'شاغر جزئياً' | 'متاح') => {
    setProperties(properties.map(p => p.id === id ? { ...p, status } : p));
  };

  // تصفية العقارات حسب البحث وحسب الفلتر المحدد عند الضغط على الأزرار العلوية
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'الكل' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // حساب الإحصائيات
  const totalCount = properties.length;
  const rentedCount = properties.filter(p => p.status === 'مؤجر بالكامل').length;
  const partialCount = properties.filter(p => p.status === 'شاغر جزئياً').length;
  const availableCount = properties.filter(p => p.status === 'متاح').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10" dir="rtl">
      {/* رأس الصفحة الفخم */}
      <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-[#0d2222] p-8 rounded-3xl text-white shadow-2xl flex items-center justify-between relative overflow-hidden border border-white/10">
        <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">
            إدارة العقارات والوحدات
          </h1>
          <p className="text-teal-200/80 text-sm font-medium">
            متابعة شاملة للعقارات المدرة للدخل، حالات الإشغال، وتفاصيل المواقع.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 group flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-teal-950 font-black px-6 py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 border border-amber-300/50 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-teal-950/10 flex items-center justify-center transition-transform group-hover:rotate-90 duration-300">
            <Plus className="w-4 h-4 text-teal-950" />
          </div>
          <span className="text-sm tracking-wide">إضافة عقار جديد</span>
        </button>
      </div>

      {/* شريط البحث وإحصائيات الفرز القابلة للضغط */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم العقار أو الحي..."
            className="w-full pr-12 pl-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 transition-all"
          />
        </div>

        {/* أزرار الفرز الإحصائية المماثلة لتصميم الكروت */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setStatusFilter('الكل')}
            className={`text-xs font-black px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${
              statusFilter === 'الكل' 
                ? 'bg-teal-900 text-white border-teal-900 shadow-md' 
                : 'bg-teal-50 text-teal-900 border-teal-100 hover:bg-teal-100/60'
            }`}
          >
            إجمالي العقارات: {totalCount}
          </button>

          <button
            onClick={() => setStatusFilter('مؤجر بالكامل')}
            className={`text-xs font-black px-3.5 py-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
              statusFilter === 'مؤجر بالكامل'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'مؤجر بالكامل' ? 'bg-white' : 'bg-emerald-500'}`}></span>
            مؤجر: {rentedCount}
          </button>

          <button
            onClick={() => setStatusFilter('شاغر جزئياً')}
            className={`text-xs font-black px-3.5 py-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
              statusFilter === 'شاغر جزئياً'
                ? 'bg-amber-500 text-teal-950 border-amber-500 shadow-md'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'شاغر جزئياً' ? 'bg-teal-950' : 'bg-amber-500'}`}></span>
            شاغر جزئياً: {partialCount}
          </button>

          <button
            onClick={() => setStatusFilter('متاح')}
            className={`text-xs font-black px-3.5 py-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
              statusFilter === 'متاح'
                ? 'bg-gray-700 text-white border-gray-700 shadow-md'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${statusFilter === 'متاح' ? 'bg-white' : 'bg-gray-400'}`}></span>
            متاح: {availableCount}
          </button>
        </div>
      </div>

      {/* قائمة العقارات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties.map((property) => (
          <div key={property.id} className="bg-white p-7 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100/80 flex flex-col justify-between relative group hover:border-amber-400/60 transition-all duration-300">
            <div>
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-400/30 flex items-center justify-center shadow-sm">
                  <Building2 className="w-7 h-7" />
                </div>
                
                <select
                  value={property.status}
                  onChange={(e) => handleStatusChange(property.id, e.target.value as any)}
                  className={`text-xs font-black px-3.5 py-2 rounded-xl border outline-none cursor-pointer transition-all flex items-center gap-2 ${
                    property.status === 'مؤجر بالكامل' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    property.status === 'شاغر جزئياً' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <option value="مؤجر بالكامل">🟢 مؤجر بالكامل</option>
                  <option value="شاغر جزئياً">🟡 شاغر جزئياً</option>
                  <option value="متاح">⚪ متاح</option>
                </select>
              </div>

              <h3 className="font-black text-gray-900 text-lg mb-1.5">{property.name}</h3>
              <p className="text-xs font-bold text-gray-500 mb-6 flex items-center gap-1.5 bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100 w-fit">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                {property.location} • <span className="text-teal-900">{property.type}</span>
              </p>

              <div className="bg-gradient-to-br from-gray-50/80 to-teal-50/20 p-5 rounded-2xl space-y-3 mb-6 border border-gray-100 shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold text-gray-600 pb-2 border-b border-gray-200/60">
                  <span className="flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-teal-800" />
                    عدد الوحدات:
                  </span>
                  <span className="text-gray-900 font-black text-sm">{property.units} وحدات</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    الدخل الشهري:
                  </span>
                  <span className="text-teal-950 font-black text-sm">{property.income} ﷼</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-[11px] font-extrabold text-teal-900/60 bg-teal-50/60 px-2.5 py-1 rounded-lg">معتمد في النظام</span>
              <button
                onClick={() => handleDelete(property.id)}
                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                title="حذف العقار"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* نافذة إضافة عقار جديدة ومودرن */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl p-8 rounded-3xl shadow-2xl border border-gray-100 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 border border-amber-400/30 flex items-center justify-center shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">إضافة عقار جديد</h3>
                  <p className="text-xs font-medium text-gray-400">قم بتعبئة بيانات العقار لإضافته إلى النظام فوراً.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddProperty} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-2">اسم العقار</label>
                <div className="relative">
                  <Building2 className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: برج الواحة السكني"
                    className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">نوع العقار</label>
                  <div className="relative">
                    <Layers className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="عمارة سكنية">عمارة سكنية</option>
                      <option value="عمارة تجارية">عمارة تجارية</option>
                      <option value="فلل وادوار">فلل وادوار</option>
                      <option value="شقق مفروشة">شقق مفروشة</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">حالة العقار الأولية</label>
                  <div className="relative">
                    <Activity className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="متاح">⚪ متاح</option>
                      <option value="شاغر جزئياً">🟡 شاغر جزئياً</option>
                      <option value="مؤجر بالكامل">🟢 مؤجر بالكامل</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">الموقع (الحي)</label>
                  <div className="relative">
                    <MapPin className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder="مثال: حي النخيل"
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-2">عدد الوحدات</label>
                  <div className="relative">
                    <Home className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={newUnits}
                      onChange={(e) => setNewUnits(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="مثال: 10"
                      className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-2">الدخل الشهري (﷼)</label>
                <div className="relative">
                  <DollarSign className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={newIncome}
                    onChange={(e) => setNewIncome(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="مثال: 12000"
                    className="w-full pr-12 pl-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-100 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-teal-900 to-[#0d2222] hover:from-teal-950 hover:to-teal-900 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg shadow-teal-900/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-5 h-5 text-amber-400" />
                  <span>حفظ وإضافة العقار</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold text-sm transition-all active:scale-95 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
