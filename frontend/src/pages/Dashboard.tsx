import { 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  Bell, 
  ArrowUpRight 
} from 'lucide-react';

export default function Dashboard() {
  const stats = {
    totalRevenue: 24500,
    activeContracts: 12,
    managedProperties: 18,
    totalTenants: 36,
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* الترحيب */}
      <div className="bg-gradient-to-r from-teal-900 to-[#0d2222] p-8 rounded-3xl text-white shadow-xl flex items-center justify-between relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl"></div>
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">عَينك على أرقامك وأعمالك.</h1>
          <p className="text-teal-200/80 text-sm font-medium">Everything Under Control.</p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10">
          <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
          <span className="text-xs font-bold">النظام يعمل بكفاءة تامة</span>
        </div>
      </div>

      {/* بطاقات الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* المدفوعات */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">المدفوعات هذا الشهر</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900">
              {stats.totalRevenue.toLocaleString()}
            </h3>
            <span className="text-xs font-bold text-gray-500">ر.س</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>12% عن الشهر السابق</span>
          </div>
        </div>

        {/* العقود النشطة */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">العقود النشطة</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900">{stats.activeContracts}</h3>
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>8% نمو جديد</span>
          </div>
        </div>

        {/* العقارات المُدارة */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">العقارات المُدارة</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900">{stats.managedProperties}</h3>
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>5% توسع إضافي</span>
          </div>
        </div>

        {/* المستأجرين */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400">المستأجرين</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900">{stats.totalTenants}</h3>
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>10% نسبة الإشغال</span>
          </div>
        </div>
      </div>

      {/* قسم الرسم البياني والتنبيهات */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* إيراداتك الشهرية */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-gray-900 text-base">إيراداتك الشهرية</h3>
            <span className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-xl text-gray-600">هذا الشهر</span>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-teal-700 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold text-gray-500">منحنى الإيرادات جاهز للربط الفعلي</p>
            </div>
          </div>
        </div>

        {/* أهم التنبيهات */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-extrabold text-gray-900 text-base">أهم التنبيهات</h3>
            <span className="text-xs font-bold text-amber-600 cursor-pointer hover:underline">عرض الكل</span>
          </div>
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">✓</div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">تم استلام دفعة إيجار جديدة</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">منذ ساعتين</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">!</div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">تنتهي عقد الإيجار قريباً</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">خلال 7 أيام</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 font-bold text-xs">+</div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">تم اضافة مستأجر جديد</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">منذ يوم</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
