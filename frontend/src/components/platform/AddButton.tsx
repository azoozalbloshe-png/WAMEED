import { ButtonHTMLAttributes } from "react";
import { Plus } from "lucide-react";

export default function AddButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} type={type} className={`btn btn-add ${className}`}>
      <span className="add-button-icon" aria-hidden="true">
        <Plus size={18} strokeWidth={2.2} />
      </span>
      <span className="add-button-label">{children}</span>
    </button>
  );
}
