import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AVAILABLE_ICONS } from './types';
import { 
  FileText, File, FilePlus, FileCheck, FileSignature,
  ClipboardList, ClipboardCheck, Receipt, Truck, Package,
  PackageCheck, Building2, Warehouse, Settings, Wrench,
  ShieldCheck, CheckCircle, Send, Mail, MailCheck,
  Users, UserCheck, Calendar, DollarSign, CreditCard,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
}

const iconMap: Record<string, LucideIcon> = {
  FileText, File, FilePlus, FileCheck, FileSignature,
  ClipboardList, ClipboardCheck, Receipt, Truck, Package,
  PackageCheck, Building2, Warehouse, Settings, Wrench,
  ShieldCheck, CheckCircle, Send, Mail, MailCheck,
  Users, UserCheck, Calendar, DollarSign, CreditCard,
};

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const [open, setOpen] = useState(false);

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          {getIcon(value)}
          <span>{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="grid grid-cols-5 gap-1">
          {AVAILABLE_ICONS.map((iconName) => (
            <Button
              key={iconName}
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10',
                value === iconName && 'bg-primary text-primary-foreground'
              )}
              onClick={() => {
                onChange(iconName);
                setOpen(false);
              }}
              title={iconName}
            >
              {getIcon(iconName)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
