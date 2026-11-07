import { ReactNode } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import BrandLogo from "./BrandLogo";

export default function AuthLayout({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <main className="auth-screen" dir={language === "ar" ? "rtl" : "ltr"}>
      <section className={`auth-card ${compact ? "auth-card-compact" : ""}`}>
        {children}
      </section>
    </main>
  );
}

export function AuthHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="auth-header">
      <BrandLogo />
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </header>
  );
}
