import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';

const formatDisplay = (value: number): string =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseValue = (text: string): number =>
  parseFloat(text.replace(/[^0-9.-]/g, '')) || 0;

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  prefix?: boolean;
}

/**
 * Currency input that lets the user type freely and only formats on blur.
 * Fixes the "8 becomes 8.00" issue where formatCurrency runs on every keystroke.
 */
export function CurrencyInput({ value, onChange, className = '', placeholder, prefix = false }: CurrencyInputProps) {
  const [text, setText] = useState<string>(value ? formatDisplay(value) : '');
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when value changes externally (e.g., restore version, load saved config)
  // but only when the input is NOT focused (user is not actively typing)
  useEffect(() => {
    if (!isFocused) {
      setText(value ? formatDisplay(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);
    onChange(parseValue(raw));
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // On focus, show raw number without formatting so user can edit cleanly
    if (value) {
      setText(String(value));
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // On blur, format the display
    const parsed = parseValue(text);
    setText(parsed ? formatDisplay(parsed) : '');
    onChange(parsed);
  }, [text, onChange]);

  if (prefix) {
    return (
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
        <Input
          type="text"
          className={`pl-5 ${className}`}
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <Input
      type="text"
      className={className}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
}
