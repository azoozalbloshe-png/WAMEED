import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../i18n/LanguageContext"
import { CheckCircle, Loader2, UserPlus } from "lucide-react"
// Static translations to avoid require in browser
const translations = {
  en: {
    register: {
      title: 'Create Account',
      welcome: 'Join us today and get started',
      username: 'Username',
      usernamePlaceholder: 'johndoe',
      email: 'Email',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      confirmPassword: 'Confirm Password',
      createAccount: 'Create Account',
      creatingAccount: 'Creating account...',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      passwordsDoNotMatch: 'Passwords do not match',
      passwordMinLength: 'Password must be at least 6 characters',
      accountCreated: 'Account Created!',
      redirecting: 'You will be redirected to your dashboard shortly...',
      failedToCreate: 'Failed to create account. Please try again.',
    },
  },
  ar: {
    register: {
      title: 'إنشاء حساب',
      welcome: 'انضم إلينا اليوم وابدأ رحلتك',
      username: 'اسم المستخدم',
      usernamePlaceholder: 'johndoe',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      confirmPassword: 'تأكيد كلمة المرور',
      createAccount: 'إنشاء حساب',
      creatingAccount: 'جاري إنشاء الحساب...',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
      passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
      passwordMinLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
      accountCreated: 'تم إنشاء الحساب بنجاح!',
      redirecting: 'سيتم تحويلك إلى لوحة التحكم قريباً...',
      failedToCreate: 'فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.',
    },
  },
}

export default function Register() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const { language } = useLanguage()

  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = translations[language as keyof typeof translations] || translations.en
    keys.forEach((k) => (value = value?.[k]))
    return value || key
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError(t('register.passwordsDoNotMatch'))
      return
    }
    if (password.length < 6) {
      setError(t('register.passwordMinLength'))
      return
    }
    setIsLoading(true)
    try {
      await register(email, username, password)
      setSuccess(true)
      setTimeout(() => { navigate("/dashboard") }, 1500)
    } catch (err) {
      setError(t('register.failedToCreate'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Account Created!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You will be redirected to your dashboard shortly...
            </p>
            <Loader2 className="animate-spin mx-auto mt-6 text-blue-600" size={32} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-up">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <UserPlus className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Account
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Join us today and get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('register.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('register.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin ml-2" size={20} />
                  {t('register.creatingAccount')}
                </>
              ) : (
                <>
                  <UserPlus className="ml-2" size={20} />
                  {t('register.createAccount')}
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('register.alreadyHaveAccount')}
            <Link
              to="/login"
              className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
            >
              {t('register.signIn')}
            </Link>
          </p>
        </div>
    </div>
  </div>
)
}
