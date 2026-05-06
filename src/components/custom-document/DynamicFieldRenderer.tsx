import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DocumentField } from '@/components/admin/types';

interface DynamicFieldRendererProps {
  field: DocumentField;
  value: string | boolean | Date | number | undefined;
  onChange: (value: string | boolean | Date | number) => void;
  disabled?: boolean;
  allFieldValues?: Record<string, any>;
}

export function evaluateFormula(formula: string, allValues: Record<string, any>): number | null {
  try {
    let expression = formula.replace(/\{([^}]+)\}/g, (_, fieldId) => {
      const val = parseFloat(String(allValues[fieldId] || 0));
      return isNaN(val) ? '0' : String(val);
    });
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) return null;
    const result = new Function(`return (${expression})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function formatFieldNumber(val: number | null, decimals?: number, prefix?: string, suffix?: string): string {
  if (val === null || val === undefined) return '-';
  const d = decimals ?? 2;
  const formatted = val.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

export function DynamicFieldRenderer({ field, value, onChange, disabled, allFieldValues }: DynamicFieldRendererProps) {
  const widthClass = { full: 'col-span-6', half: 'col-span-3', third: 'col-span-2' }[field.width];

  const formulaResult = useMemo(() => {
    if (field.type !== 'formula' || !field.formula || !allFieldValues) return null;
    return evaluateFormula(field.formula, allFieldValues);
  }, [field.type, field.formula, allFieldValues]);

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={field.placeholder} className="h-9" />;

      case 'textarea':
        return <Textarea value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={field.placeholder} rows={3} />;

      case 'richtext':
        return <Textarea value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={field.placeholder || 'Enter text...'} rows={5} />;

      case 'date': {
        const dateValue = value ? new Date(value as string) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-9', !dateValue && 'text-muted-foreground')} disabled={disabled}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'MM/dd/yyyy') : field.placeholder || 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateValue} onSelect={(date) => date && onChange(date.toISOString())} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        );
      }

      case 'dropdown':
        return (
          <Select value={(value as string) || ''} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="h-9"><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2 h-9">
            <Checkbox id={field.id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} disabled={disabled} />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">{field.label}</Label>
          </div>
        );

      case 'signature':
        return <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={field.placeholder || 'Type signature'} className="h-9 font-script italic" />;

      case 'number':
        return (
          <div className="relative">
            {field.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.prefix}</span>}
            <Input type="number" value={value !== undefined && value !== '' ? String(value) : ''} onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} disabled={disabled} placeholder={field.placeholder || '0'} className={cn('h-9', field.prefix && 'pl-7', field.suffix && 'pr-8')} step="any" />
            {field.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.suffix}</span>}
          </div>
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.prefix || '$'}</span>
            <Input type="number" value={value !== undefined && value !== '' ? String(value) : ''} onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} disabled={disabled} placeholder={field.placeholder || '0.00'} className="h-9 pl-7" step="0.01" />
          </div>
        );

      case 'percentage':
        return (
          <div className="relative">
            <Input type="number" value={value !== undefined && value !== '' ? String(value) : ''} onChange={(e) => onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} disabled={disabled} placeholder={field.placeholder || '0'} className="h-9 pr-8" step="0.1" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
        );

      case 'formula': {
        const displayValue = formatFieldNumber(formulaResult, field.decimals, field.prefix, field.suffix);
        return (
          <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/30 text-sm">
            <Calculator className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{displayValue}</span>
          </div>
        );
      }

      default:
        return <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-9" />;
    }
  };

  return (
    <div className={cn(widthClass, 'space-y-1.5')}>
      {field.type !== 'checkbox' && (
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderField()}
    </div>
  );
}
