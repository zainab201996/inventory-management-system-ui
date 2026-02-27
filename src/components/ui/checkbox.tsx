import type React from "react";

interface CheckboxProps {
  label?: React.ReactNode;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
}) => {
  const checkboxElement = (
    <div className="relative w-5 h-5">
      <input
        id={id}
        type="checkbox"
        className={`w-5 h-5 appearance-none cursor-pointer dark:border-gray-700 border border-gray-300 checked:border-transparent rounded-md checked:bg-brand-500 disabled:opacity-60 
        ${className}`}
        checked={checked && !disabled}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {checked && !disabled && (
        <svg
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
            stroke="white"
            strokeWidth="1.94437"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );

  if (!label) {
    return checkboxElement;
  }

  return (
    <label
      className={`flex items-center space-x-3 group cursor-pointer ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      {checkboxElement}
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center">
        {label}
      </span>
    </label>
  );
};

export default Checkbox;
