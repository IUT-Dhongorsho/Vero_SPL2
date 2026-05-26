import React from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { CreditCard, Zap, Shield } from 'lucide-react';

export const BillingTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <GlassCard className="p-6 text-center">
        <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
        <p className="text-gray-500 mb-4">You're currently on the free tier</p>
        <AnimatedButton variant="primary">Upgrade to Pro</AnimatedButton>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" /> Payment Methods
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No payment methods added</p>
          <AnimatedButton variant="outline">Add Payment Method</AnimatedButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Usage</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Projects used</span>
              <span>3 / 5</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-3/5 h-full bg-blue-600 rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Members</span>
              <span>4 / 10</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-2/5 h-full bg-blue-600 rounded-full" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Storage used</span>
              <span>2.5 GB / 10 GB</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="w-1/4 h-full bg-blue-600 rounded-full" />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
