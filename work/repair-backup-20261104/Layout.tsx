import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  Zap,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const location = useLocation();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const navItems = [
    { path: "/dashboard", label: "الرئيسية", icon: Home },
    { path: "/properties", label: "العقارات والوحدات", icon: Building2 },
    { path: "/tenants", label: "المستأجرون", icon: Users },
    { path: "/contracts", label: "العقود", icon: FileText },
    { path: "/finances", label: "التحصيلات والمصروفات", icon: CreditCard },
    { path: "/maintenance", label: "الصيانة", icon: Wrench },
    { path: "/reports", label: "التقارير", icon: BarChart3 },
    { path: "/meter-calculator", label: "حساب العداد", icon: Zap },
    { path: "/settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"} flex flex-col font-sans`}>
      {/* الشريط العلوي النحيف والموحد */}
      <header className="h-16 border-b border-gray-800 bg-gray-900 px-6 flex items-center justify-between sticky top-0 z-50">
        {/* الشعار والاسم الموحد */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white font-serif">
            وميض <span className="text-xs text-amber-400 font-sans tracking-normal">WAMEED</span>
          </span>
        </div>

        {/* شريط البحث الاحترافي */}
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن عقار، مستأجر، عقد أو وحدة..."
              className="w-full bg-gray-800/60 border border-gray-700/60 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:border-amber-500/50 transition-all text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        {/* أدوات التحكم المجمعة (اللغة، الدارك مود، والخروج) */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            title="تغيير الوضع المظلم/المضيء"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 transition-colors flex items-center space-x-1.5 space-x-reverse"
          >
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* القائمة الجانبية المتفاعلة (تتوسع عند الـ Hover وتطوى عند الإبعاد) */}
        <aside
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
          className={`bg-gray-900 border-l border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-40 ${
            isSidebarExpanded ? "w-64" : "w-20"
          }`}
        >
          <div className="py-6 flex flex-col space-y-1.5 flex-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3.5 py-3 rounded-xl transition-all group ${
                    isActive
                      ? "bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/20"
                      : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-5 h-5 min-w-[20px] ${isActive ? "text-amber-400" : "text-gray-400 group-hover:text-gray-200"}`} />
                  <span
                    className={`mr-3 text-sm whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
                      isSidebarExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </aside>

        {/* محتوى الصفحة الرئيسي */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
