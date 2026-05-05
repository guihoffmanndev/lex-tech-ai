import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value: string;               // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  max?: string;                // "YYYY-MM-DD"
  min?: string;                // "YYYY-MM-DD"
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  max,
  min,
  placeholder = "Selecione a data",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? parseISO(value) : undefined;
  const maxDate = max ? parseISO(max) : undefined;
  const minDate = min ? parseISO(min) : undefined;

  const isDateDisabled = (d: Date) => {
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  const defaultMonth =
    date && isValid(date)
      ? date
      : maxDate
      ? new Date(maxDate.getFullYear(), maxDate.getMonth())
      : new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-9",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {date && isValid(date)
            ? format(date, "dd/MM/yyyy")
            : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => {
            if (selected && isValid(selected)) {
              onChange(format(selected, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          disabled={isDateDisabled}
          defaultMonth={defaultMonth}
          captionLayout="dropdown"
          fromYear={1950}
          toYear={new Date().getFullYear() + 10}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
