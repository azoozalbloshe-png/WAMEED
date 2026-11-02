import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await authService.login(identifier, password);
      if (data.user.role === 'super_admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e293b] p-4" dir="rtl">
      <div className="bg-[#0f172a] border border-[#F5E6C8]/20 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#F5E6C8] mb-2">منصة وميض</h1>
          <p className="text-gray-400 text-sm">تسجيل الدخول إلى حسابك</p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-xl mb-4 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-300 text-sm mb-2">اسم المستخدم أو البريد الإلكتروني</label>
            <input 
              type="text" 
              value={identifier} 
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full bg-[#1e293b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F5E6C8]"
              placeholder="أدخل البريد أو اسم المستخدم"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-2">كلمة المرور</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#1e293b] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F5E6C8]"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3 text-gray-400 text-sm hover:text-[#F5E6C8]"
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-[#1e293b] border-gray-700 text-[#F5E6C8] focus:ring-0"
              />
              تذكرني
            </label>
            <a href="#forgot" className="text-[#F5E6C8] hover:underline">نسيت كلمة المرور؟</a>
          </div>

          <button 
            type="submit"
            className="w-full py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg"
            style={{ backgroundColor: '#F5E6C8', color: '#1a1a1a' }}
          >
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}
