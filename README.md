# نظام إدارة العقارات (Real Estate Management System)

نظام متكامل لإدارة العقارات مع واجهة أمامية وعقبية متكاملة.

## Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework for building APIs
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migration tool
- **Pydantic** - Data validation and settings management
- **SQLite** - Database (can be replaced with PostgreSQL)
- **Passlib** - Password hashing
- **JWT** - Authentication tokens

### Frontend
- **React 18** - UI library with Hooks and Context
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Project Structure

```
web-project/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py       # Application entry point
│   │   ├── config.py     # Configuration settings
│   │   ├── database.py   # Database connection
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routers/      # API routes
│   │   ├── services/     # Business logic
│   │   └── tests/        # Test files
│   ├── alembic/          # Database migrations
│   └── pyproject.toml    # Poetry configuration
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── contexts/     # React contexts
│   │   └── hooks/        # Custom hooks
│   └── package.json      # Dependencies
└── docker-compose.yml    # Docker configuration
```

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Run migrations
alembic upgrade head

# Run the application
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run the application
npm run dev
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token

### Health
- `GET /api/health` - Check API health status

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest app/tests/test_auth.py
```

## Development

### Code Formatting
```bash
# Backend
black app/
mypy app/

# Frontend
npm run format
```

### Git Hooks
```bash
pre-commit install
```

## License

MIT

## تشغيل النسخة المطورة والحفاظ على البيانات

الواجهة المحلية على `http://localhost:5173`، وخدمة البيانات على `127.0.0.1:5002`:

```bash
cd backend
./run_server.sh
```

وفي نافذة أخرى، من مجلد `frontend` شغّل `npm run dev`. لا تشغّل أكثر من نسخة على المنفذ نفسه.

التحديث يضيف جداول الوحدات والصيانة والمرفقات وحقول الربط فقط. لا ينشئ عقارات أو وحدات أو دفعات تجريبية، ولا يغير أدوار المستخدمين أو سياسات الصلاحيات الحالية. العقود القديمة تبقى محفوظة؛ اربطها بأرقام الوحدات الفعلية من تفاصيل العقد لتظهر حالة الإشغال التفصيلي. وحدات العقارات القديمة غير المعرّفة لا تُعتبر شاغرة تلقائيًا.

### أسس الحساب والتقارير

- الإيراد في التحليلات استحقاق تعاقدي موزع على أيام الشهر، مع تناسب الفترات الجزئية؛ يختلف عن التحصيل النقدي.
- صافي الدخل = الإيراد التعاقدي ناقص المصروفات. صافي النقد = التحصيلات ناقص المصروفات.
- تنبيهات الاستحقاق تستخدم دفعات شهرية من تاريخ بداية العقد، مع توزيع التحصيلات بالأقدم أولًا وتناسب المدة الأخيرة. راجع طريقة التحصيل إن كانت العقود الفعلية تستخدم دورية مختلفة؛ لا تُحفظ هذه الحسابات كفواتير جديدة.
- الملخص الحالي حتى اليوم يستبعد السجلات المؤرخة مستقبلًا. اختيار فترة مستقبلية مخصصة يعرض السجلات المؤرخة داخل تلك الفترة.
- تصدير Excel ينتج ملف XLSX حقيقيًا بخلايا نصية آمنة. زر PDF / طباعة يفتح معاينة طباعة منسقة لجميع النتائج؛ اختر حفظ PDF.
- الفواتير المرفقة وطلبات الصيانة منفصلة عن المصروف المحصل: سجل المصروف الفعلي في قسم المصروفات واربطه بالعقار أو الوحدة. تنبيهات فواتير العدادات لا تفترض أنها غير مسددة، لأن سجل القراءات الحالي لا يتتبع سدادها.

### النسخ الاحتياطي

من مجلد `backend` شغّل:

```bash
../.venv/bin/python work/backup_database.py
```

ينشئ هذا نسخة SQLite متسقة ويتحقق من سلامتها دون حذف الأصل. احفظ نسخة من `.env` و`.jwt-secret` في مكان خاص آمن أيضًا. لا ترفع قاعدة البيانات أو النسخ أو الأسرار إلى مستودع المصدر. قبل استعادة نسخة، أوقف خدمة البيانات واحتفظ بنسخة أخرى من الحالة الحالية. لا تنسخ ملف SQLite المفتوح نسخًا عاديًا أثناء الكتابة عليه.

### التجهيز لنطاق خاص

يوجد إعداد Docker للإنتاج بواجهة Nginx تعمل من المصدر نفسه مع `/api`، وبقاعدة البيانات الحالية في مجلد `backend` المثبت خارج الحاوية. **أوقف التشغيل المحلي قبل استخدام القاعدة نفسها في Docker**. لا تحذف مجلد `backend` عند تحديث الحاويات. الإعداد لا ينشر الموقع خارجيًا تلقائيًا:

```bash
docker compose up --build -d
```

يفتح الموقع على `http://127.0.0.1:8080`. لربط نطاق، ضع أمامه وكيل HTTPS موثوقًا، وحدد `FRONTEND_URL=https://your-domain.example` و`CORS_ORIGINS=["https://your-domain.example"]` في إعدادات الخادم ثم أعد تشغيله. مفتاح توقيع الجلسات مخزن دائمًا في مجلد البيانات أو يحدد بواسطة `SECRET_KEY`. اختبر البريد مجددًا بعد تغيير رابط الموقع، لأن روابط الاستعادة تستخدم `FRONTEND_URL`.

قاعدة SQLite الحالية مناسبة لتشغيل نسخة واحدة مع تخزين دائم. التشغيل على عدة خوادم يتطلب خطة نقل مختبرة إلى قاعدة مشتركة؛ ترحيل بدء التشغيل الحالي مخصص لـSQLite. تحصيل الاشتراكات الآلي وربط النطاق فعليًا يتطلبان اختيار الخدمات وإعدادها. راجع TLS والنسخ والاستعادة والبريد والصلاحيات في بيئة الاستضافة قبل استقبال عملاء فعليين.

### لغة الواجهة

تدعم الواجهة العربية والإنجليزية عبر زر اللغة أعلى الموقع، بما في ذلك نسخة الجوال وصفحات الدخول والاستعادة. يحفظ الاختيار على الجهاز ويتزامن بين تبويبات المتصفح، ويبدّل اتجاه الواجهة تلقائيًا دون إعادة تحميلها أو مسح النماذج. تبقى الأرقام `0123456789` في اللغتين. عناوين تصدير Excel واتجاه الورقة يتبعان اللغة المختارة؛ بيانات العملاء المكتوبة لا تُترجم أو تُعدل. مصدر نصوص العربية هو `frontend/src/i18n/platform.ar.json`، وتسميات التصدير في `backend/app/locales/ar.json`.
