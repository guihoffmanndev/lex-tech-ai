import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Formats cents (integer) into BRL display: R$ 1.234,56
 */
function formatCentsToDisplay(cents: number): string {
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const reaisStr = reais.toLocaleString("pt-BR");
  return `R$ ${reaisStr},${String(centavos).padStart(2, "0")}`;
}

/**
 * Converts cents (integer) to float value for database storage.
 */
function centsToFloat(cents: number): number {
  return cents / 100;
}

/**
 * Converts a float value to cents (integer) for internal state.
 */
function floatToCents(value: number): number {
  return Math.round(value * 100);
}

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  /** Float value (e.g. 10000.50) */
  value: string | number;
  /** Called with the raw float string for state (e.g. "10000.50") */
  onChange: (floatValue: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    // Convert current value to cents for display
    const numValue = typeof value === "string" ? parseFloat(value.replace(",", ".")) || 0 : (value || 0);
    const cents = floatToCents(numValue);
    const display = formatCentsToDisplay(cents);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter
      if (["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key)) {
        if (e.key === "Backspace") {
          e.preventDefault();
          const newCents = Math.floor(cents / 10);
          onChange(String(centsToFloat(newCents)));
        }
        return;
      }

      // Only allow digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      const newCents = cents * 10 + parseInt(e.key);
      // Cap at 999,999,999.99
      if (newCents > 99999999999) return;
      onChange(String(centsToFloat(newCents)));
    };

    return (
      <Input
        ref={ref}
        className={className}
        value={display}
        onKeyDown={handleKeyDown}
        onChange={() => {}} // controlled via onKeyDown
        inputMode="numeric"
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput, centsToFloat, floatToCents, formatCentsToDisplay };
