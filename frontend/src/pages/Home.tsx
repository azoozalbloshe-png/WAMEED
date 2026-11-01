import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
export default function Home() {
  const navigate = useNavigate()
  const { language } = useLanguage()

  return (
    <div className="p-8 text-white max-w-5xl mx-auto">
      <div className="bg-[#1e293b]/80 backdrop-blur-md p-8 rounded-2xl border border-[#F5E6C8]/20 shadow-xl">
        <h1 className="text-3xl font-bold mb-4" style={{ color: '#F5E6C8' }}>
          {language === 'ar' ? 'مرحباً بك في وُميض' : 'Welcome to Womeed'}
        </h1>
        <p className="text-gray-300 text-lg mb-6">
          {language === 'ar' ? 'كل شيء تحت السيطرة لإدارة العقارات والمقاييس بكفاءة.' : 'Everything is under control for efficient property and meter management.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg"
          style={{ backgroundColor: '#F5E6C8', color: '#1a1a1a' }}
        >
          {language === 'ar' ? 'الذهاب إلى لوحة التحكم' : 'Go to Dashboard'}
        </button>
      </div>
    </div>
  )
}
