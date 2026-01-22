import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DocumentField } from '@/components/admin/types';

interface DynamicFieldRendererProps {
  field: DocumentField;
  value: string | boolean | Date | undefined;
  onChange: (value: string | boolean | Date) => void;
  disabled?: boolean;
}

export function DynamicFieldRenderer({ field, value, onChange, disabled }: DynamicFieldRendererProps) {
  const widthClass = {
    full: 'col-span-6',
    half: 'col-span-3',
    third: 'col-span-2',
  }[field.width];

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={3}
          />
        );

      case 'date':
        const dateValue = value ? new Date(value as string) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-9',
                  !dateValue && 'text-muted-foreground'
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'MM/dd/yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => date && onChange(date.toISOString())}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case 'dropdown':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2 h-9">
            <Checkbox
              id={field.id}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(Boolean(checked))}
              disabled={disabled}
            />
            <Label htmlFor={field.id} className="text-sm font-normal cursor-pointer">
              {field.label}
            </Label>
          </div>
        );

      case 'signature':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="Type signature"
            className="h-9 font-script italic"
          />
        );

      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        );
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
