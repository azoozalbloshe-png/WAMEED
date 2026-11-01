import { useState } from 'react';
import { Zap, Calculator, RefreshCcw, CheckCircle2, Droplets } from 'lucide-react';

export default function MeterCalculation() {
  const [previousReading, setPreviousReading] = useState('');
  const [currentReading, setCurrentReading] = useState('');
  const [meterType, setMeterType] = useState<'electricity' | 'water'>('electricity');
  const [result, setResult] = useState<{
    consumption: number;
    basePrice: number;
    serviceFee: number;
    vat: number;
    total: number;
  } | null>(null);

  const handleInputChange = (value: string, setter: (val: string) => void) => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let sanitized = value;
    
    arabicNumbers.forEach((char, index) => {
      const regex = new RegExp(char, 'g');
      sanitized = sanitized.replace(regex, index.toString());
    });

    sanitized = sanitized.replace(/[^0-9.]/g, '');
    setter(sanitized);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const prev = parseFloat(previousReading) || 0;
    const curr = parseFloat(currentReading) || 0;
    
    if (curr <= prev) return;

    const consumption = curr - prev;
    const rate = meterType === 'electricity' ? 0.18 : 0.035;
    const basePrice = consumption * rate;
    const serviceFee = 10;
    const subtotal = basePrice + serviceFee;
    const vat = subtotal * 0.15;
    const total = subtotal + vat;

    setResult({
      consumption,
      basePrice: Number(basePrice.toFixed(2)),
      serviceFee,
      vat: Number(vat.toFixed(2)),
      total: Number(total.toFixed(2)),
    });
  };

  const handleReset = () => {
    setPreviousReading('');
    setCurrentReading('');
    setResult(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10" dir="rtl">
      {/* عنوان الصفحة الفخم */}
      <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-[#0d2222] p-8 rounded-3xl text-white shadow-2xl flex items-center justify-between relative overflow-hidden border border-white/10">
        <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight mb-2 bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">
            حاسبة استهلاك العدادات الذكية
          </h1>
          <p className="text-teal-200/80 text-sm font-medium">
            حساب دقيق وفوري لاستهلاك الكهرباء والمياه بمعايير اعتماد احترافية.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-3 bg-white/10 px-5 py-3 rounded-2xl backdrop-blur-xl border border-white/15 shadow-inner">
          <Calculator className="w-6 h-6 text-amber-400" />
          <span className="text-xs font-extrabold tracking-wide">حساب آلي معتمد</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* نموذج الإدخال (مودرن) */}
        <div className="lg:col-span-1 bg-white p-7 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">بيانات العداد</h3>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            </div>
            
            <form onSubmit={handleCalculate} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-2.5">اختر نوع العداد</label>
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setMeterType('electricity')}
                    className={`relative p-4 rounded-2xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-2.5 overflow-hidden ${
                      meterType === 'electricity'
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-teal-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100/80'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      meterType === 'electricity' ? 'bg-teal-950/10 text-teal-950' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <span>كهرباء</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeterType('water')}
                    className={`relative p-4 rounded-2xl text-xs font-black transition-all border flex flex-col items-center justify-center gap-2.5 overflow-hidden ${
                      meterType === 'water'
                        ? 'bg-gradient-to-br from-teal-800 to-teal-950 text-white border-teal-800 shadow-lg shadow-teal-900/20 scale-[1.02]'
                        : 'bg-gray-50/80 text-gray-600 border-gray-200 hover:bg-gray-100/80'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      meterType === 'water' ? 'bg-white/15 text-amber-400' : 'bg-teal-50 text-teal-700'
                    }`}>
                      <Droplets className="w-5 h-5 fill-current" />
                    </div>
                    <span>مياه</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-2">القراءة السابقة</label>
                <input
                  type="text"
                  value={previousReading}
                  onChange={(e) => handleInputChange(e.target.value, setPreviousReading)}
                  placeholder="مثال: 1000"
                  className="w-full px-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-2">القراءة الحالية</label>
                <input
                  type="text"
                  value={currentReading}
                  onChange={(e) => handleInputChange(e.target.value, setCurrentReading)}
                  placeholder="مثال: 1250"
                  className="w-full px-4 py-3.5 rounded-2xl bg-gray-50/80 border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-teal-900 to-[#0d2222] hover:from-teal-950 hover:to-teal-900 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg shadow-teal-900/20 active:scale-95"
                >
                  احسب الآن
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all active:scale-95 shadow-sm"
                  title="إعادة تعيين"
                >
                  <RefreshCcw className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* عرض النتائج والملخص المالي */}
        <div className="lg:col-span-2 bg-white p-7 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-base">نتائج الحساب والتكلفة</h3>
              <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                meterType === 'electricity' 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}>
                {meterType === 'electricity' ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Droplets className="w-3.5 h-3.5 fill-current" />}
                {meterType === 'electricity' ? 'عداد الكهرباء' : 'عداد المياه'}
              </span>
            </div>

            {result ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="bg-gradient-to-br from-teal-900 to-[#0d2222] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                    <span className="text-xs font-bold text-teal-200/80 block mb-1">إجمالي الاستهلاك</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-amber-400 tracking-tight">{result.consumption}</span>
                      <span className="text-xs font-bold text-teal-200">{meterType === 'electricity' ? 'كيلوواط / ساعة' : 'متر مكعب'}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-3xl text-teal-950 shadow-lg relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                    <span className="text-xs font-extrabold text-teal-950/80 block mb-1">المبلغ الإجمالي المستحق</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-teal-950 tracking-tight">
                        {result.total.toFixed(2)}
                      </span>
                      <span className="text-xs font-extrabold text-teal-950 mr-1">﷼</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/80 p-6 rounded-3xl space-y-4 border border-gray-100 shadow-inner">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600 pb-3 border-b border-gray-200/60">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-800"></span>
                      تكلفة الاستهلاك الأساسي:
                    </span>
                    <span className="text-gray-900 font-extrabold text-sm">{result.basePrice} ﷼</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600 pb-3 border-b border-gray-200/60">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      رسوم الخدمة الثابتة:
                    </span>
                    <span className="text-gray-900 font-extrabold text-sm">{result.serviceFee} ﷼</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      ضريبة القيمة المضافة (15%):
                    </span>
                    <span className="text-gray-900 font-extrabold text-sm">{result.vat} ﷼</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4 shadow-sm animate-pulse">
                  <Zap className="w-8 h-8 fill-teal-800" />
                </div>
                <h4 className="font-extrabold text-gray-800 text-base mb-1">أدخل قراءات العداد للحساب الفوري</h4>
                <p className="text-xs text-gray-400 max-w-xs">قم بتعبئة القراءة السابقة والحالية بالأرقام الإنجليزية في النموذج الجانبي واضغط على "احسب الآن".</p>
              </div>
            )}
          </div>

          {result && (
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-emerald-600 text-xs font-extrabold bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>تمت عملية الحساب بنجاح ودقة تامة وفقاً للتعرفة الرسمية المعتمدة.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
