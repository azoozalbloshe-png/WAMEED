import { InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
export default function PasswordInput({
  className = "auth-input",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  const { tr } = useLanguage();
  return (
    <span className="password-field">
      <input
        {...props}
        className={className}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={tr(visible ? "Hide password" : "Show password")}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <Eye size={19} aria-hidden="true" />
        ) : (
          <EyeOff size={19} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}
