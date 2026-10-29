'use client';

interface Option {
  value: string;
  label: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function StyledSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required = false,
  className = '',
}: StyledSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${className}`}
    >
      <option
        value=""
        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
      >
        {placeholder}
      </option>
      {options.map((o) => (
        <option
          key={o.value}
          value={o.value}
          className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        >
          {o.label}
        </option>
      ))}
    </select>
  );
}