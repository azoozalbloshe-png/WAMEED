import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { LogIn, Loader2 } from 'lucide-react'
// Static translations to avoid require in browser
const translations = {
  en: {
    login: {
      title: 'Sign In',
      welcomeBack: 'Welcome back! Please enter your details',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      dontHaveAccount: "Don't have an account?",
      signUp: 'Sign up',
      invalidCredentials: 'Invalid email or password',
    },
  },
  ar: {
    login: {
      title: 'تسجيل الدخول',
      welcomeBack: 'مرحباً بعودتك! الرجاء إدخال بياناتك',
      email: 'البريد الإلكتروني',
      emailPlaceholder: 'you@example.com',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      signIn: 'تسجيل الدخول',
      signingIn: 'جاري تسجيل الدخول...',
      dontHaveAccount: 'ليس لديك حساب؟',
      signUp: 'إنشاء حساب',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    },
  },
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()

  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = translations[language as keyof typeof translations] || translations.en
    keys.forEach((k) => (value = value?.[k]))
    return value || key
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(t('login.invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div dir="ltr" className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <LogIn className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('login.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('login.welcomeBack')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin ml-2" size={20} />
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  <LogIn className="ml-2" size={20} />
                  {t('login.signIn')}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('login.dontHaveAccount')}{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              {t('login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
