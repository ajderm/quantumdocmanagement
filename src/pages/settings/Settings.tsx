import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Building2, CreditCard, FileText, Users, ChevronRight } from 'lucide-react';

const settingsCategories = [
  {
    title: 'Account Settings',
    description: 'Company branding, logo, and default terms',
    icon: Building2,
    href: '/settings/account',
    color: 'bg-blue-500',
  },
  {
    title: 'Leasing Partners',
    description: 'Manage financing companies and rate sheets',
    icon: CreditCard,
    href: '/settings/leasing',
    color: 'bg-amber-500',
  },
  {
    title: 'Document Templates',
    description: 'Customize document layouts and fields',
    icon: FileText,
    href: '/settings/templates',
    color: 'bg-purple-500',
  },
  {
    title: 'Team Members',
    description: 'Manage users and permissions',
    icon: Users,
    href: '/settings/team',
    color: 'bg-green-500',
  },
];

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your document generator
          </p>
        </div>

        {/* Settings categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settingsCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.href} to={category.href}>
                <Card className="h-full hover:shadow-medium transition-all duration-200 cursor-pointer hover:border-primary/30 group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`h-10 w-10 rounded-lg ${category.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
                      {category.title}
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}