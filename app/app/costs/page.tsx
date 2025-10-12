
import { CostDashboard } from '@/components/cost-dashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CostsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Cost Tracking</h1>
            <p className="text-muted-foreground">Monitor your AI and storage costs</p>
          </div>
        </div>
        
        <CostDashboard />
      </div>
    </div>
  );
}
