import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  icon?: React.ReactNode;
}

export const ErrorButton: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "relative overflow-hidden inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full font-bold transition-all duration-300 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-1 focus:ring-brand-200 dark:focus:ring-brand-800 border-2 border-transparent",
    outline:
      "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 focus:ring-brand-100 dark:focus:ring-brand-900",
    ghost:
      "bg-transparent text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/50 focus:ring-brand-100 dark:focus:ring-brand-900 border-2 border-transparent",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && (
        <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
};
