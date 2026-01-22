import {
  FileText, File, FilePlus, FileCheck, FileSignature,
  ClipboardList, ClipboardCheck, Receipt, Truck, Package,
  PackageCheck, Building2, Warehouse, Settings, Wrench,
  ShieldCheck, CheckCircle, Send, Mail, MailCheck,
  Users, UserCheck, Calendar, DollarSign, CreditCard,
  type LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  FileText, File, FilePlus, FileCheck, FileSignature,
  ClipboardList, ClipboardCheck, Receipt, Truck, Package,
  PackageCheck, Building2, Warehouse, Settings, Wrench,
  ShieldCheck, CheckCircle, Send, Mail, MailCheck,
  Users, UserCheck, Calendar, DollarSign, CreditCard,
};

interface DynamicIconProps {
  name: string;
  className?: string;
}

export function DynamicIcon({ name, className }: DynamicIconProps) {
  const Icon = iconMap[name] || FileText;
  return <Icon className={className} />;
}
