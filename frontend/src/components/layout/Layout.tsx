import { ReactNode, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Settings,
  Zap,
  LogOut,
  Globe
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const menuItems = [
  { name: 'الرئيسية', path: '/dashboard', icon: Home },
  { name: 'عقاراتي', path: '/properties', icon: Building2 },
  { name: 'المستأجرين', path: '/tenants', icon: Users },
  { name: 'العقود', path: '/contracts', icon: FileText },
  { name: 'المدفوعات', path: '/payments', icon: CreditCard },
  { name: 'التقارير', path: '/reports', icon: BarChart3 },
  { name: 'حساب العداد', path: '/calculation', icon: Zap },
  { name: 'الإعدادات', path: '/settings', icon: Settings },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [isHovered, setIsHovered] = useState(false);
  const isOpen = isHovered;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      {/* القائمة الجانبية المتطورة */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-[#0d2222] text-white flex flex-col shrink-0 justify-between border-l border-white/5 transition-all duration-300 ease-in-out relative z-30 ${
          isOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div>
          {/* رأس القائمة واللوجو بتناسق تام */}
          <div className="p-4 flex items-center border-b border-white/10 overflow-hidden">
            <div className="flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl blur-md opacity-25 animate-pulse"></div>
                <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-teal-950 font-black shadow-lg">
                  <Zap className="w-6 h-6 fill-teal-950 stroke-teal-950 stroke-[2.5]" />
                </div>
              </div>

              {isOpen && (
                <div className="flex flex-col justify-center transition-opacity duration-300 whitespace-nowrap space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent leading-none">
                      وميض
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  </div>
                  <span className="text-[10px] font-extrabold tracking-[0.28em] bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent uppercase leading-none">
                    WAMEED
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* روابط التنقل مع تأثير الضغطة */}
          <nav className="p-3 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-3.5 rounded-xl text-sm transition-all active:scale-95 duration-150 ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-300 font-extrabold border-r-4 border-amber-400 shadow-md tracking-wide'
                      : 'text-gray-200 font-bold hover:bg-white/10 hover:text-white tracking-wide'
                  }`
                }
                title={!isOpen ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0 transition-transform active:scale-90" />
                {isOpen && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* أسفل القائمة */}
        <div className="p-3 border-t border-white/10 space-y-3">
          {isOpen && (
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 transition-all active:scale-95 duration-150 border border-white/5"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                {language === 'ar' ? 'English' : 'العربية'}
              </span>
            </button>
          )}

          <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                أع
              </div>
              {isOpen && (
                <div className="whitespace-nowrap overflow-hidden">
                  <h4 className="text-xs font-bold text-white">أحمد العتيبي</h4>
                </div>
              )}
            </div>
            {isOpen && (
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 transition-all active:scale-90 p-1.5 hover:bg-white/5 rounded-lg shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
