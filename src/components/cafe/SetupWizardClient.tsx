'use client';

import React, { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Coffee,
  UtensilsCrossed,
  Cake,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles,
  DollarSign,
  TrendingUp,
  Store,
  PartyPopper,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TemplateItem {
  name: string;
  slug: string;
  category_slug: string;
  price_cents: number;
  variants: { suffix: string; price_cents: number }[];
}

interface TemplateCategory {
  name: string;
  slug: string;
  sort_order: number;
}

interface FixedCostDefault {
  type: string;
  label: string;
  label_np: string;
  typical_cents: number;
}

interface Template {
  id: string;
  template_key: string;
  display_name: string;
  display_name_np: string;
  description: string;
  icon: string;
  categories: TemplateCategory[];
  items: TemplateItem[];
  fixed_cost_defaults: FixedCostDefault[];
}

interface SetupWizardClientProps {
  cafeId: string;
  cafeName: string;
  templates: Template[];
}

interface ItemOverride {
  slug: string;
  price_cents: number;
  enabled: boolean;
}

interface FixedCostEntry {
  type: string;
  label: string;
  amount_cents: number;
}

const STEPS = ['cafe_type', 'menu', 'costs', 'preview'] as const;
type Step = typeof STEPS[number];

const STEP_LABELS: Record<Step, string> = {
  cafe_type: 'Cafe Type',
  menu: 'Menu',
  costs: 'Monthly Costs',
  preview: 'Ready!',
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  chiya_pasal: <Coffee className="w-10 h-10" />,
  medium_cafe: <UtensilsCrossed className="w-10 h-10" />,
  bakery: <Cake className="w-10 h-10" />,
};

function formatRs(cents: number): string {
  return `Rs ${(cents / 100).toLocaleString('en-IN')}`;
}

export default function SetupWizardClient({ cafeId, cafeName, templates }: SetupWizardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<Step>('cafe_type');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [itemOverrides, setItemOverrides] = useState<Record<string, ItemOverride>>({});
  const [fixedCosts, setFixedCosts] = useState<FixedCostEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customersPerDay, setCustomersPerDay] = useState(40);

  const stepIndex = STEPS.indexOf(currentStep);

  // Step 1: Select template
  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    // Initialize item overrides from template
    const overrides: Record<string, ItemOverride> = {};
    template.items.forEach(item => {
      overrides[item.slug] = {
        slug: item.slug,
        price_cents: item.price_cents,
        enabled: true,
      };
    });
    setItemOverrides(overrides);
    // Initialize fixed costs from template defaults
    setFixedCosts(
      template.fixed_cost_defaults.map(fc => ({
        type: fc.type,
        label: fc.label,
        amount_cents: fc.typical_cents,
      }))
    );
  }, []);

  // Step 2: Update item price
  const handlePriceChange = useCallback((slug: string, newPriceCents: number) => {
    setItemOverrides(prev => ({
      ...prev,
      [slug]: { ...prev[slug], price_cents: newPriceCents },
    }));
  }, []);

  // Step 2: Toggle item
  const handleToggleItem = useCallback((slug: string) => {
    setItemOverrides(prev => ({
      ...prev,
      [slug]: { ...prev[slug], enabled: !prev[slug].enabled },
    }));
  }, []);

  // Step 3: Update fixed cost
  const handleCostChange = useCallback((index: number, newAmountCents: number) => {
    setFixedCosts(prev => prev.map((c, i) => i === index ? { ...c, amount_cents: newAmountCents } : c));
  }, []);

  // Calculate projections
  const enabledItems = selectedTemplate?.items.filter(item => itemOverrides[item.slug]?.enabled) || [];
  const avgItemPrice = enabledItems.length > 0
    ? enabledItems.reduce((sum, item) => sum + (itemOverrides[item.slug]?.price_cents || item.price_cents), 0) / enabledItems.length
    : 0;
  const totalFixedCosts = fixedCosts.reduce((sum, c) => sum + c.amount_cents, 0);
  const dailyFixedCost = Math.round(totalFixedCosts / 30);
  const estimatedDailyRevenue = Math.round(customersPerDay * avgItemPrice);
  const estimatedMonthlyRevenue = estimatedDailyRevenue * 30;
  const estimatedMonthlyProfit = estimatedMonthlyRevenue - totalFixedCosts;

  // Navigation
  const goNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) setCurrentStep(STEPS[nextIndex]);
  };
  const goBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) setCurrentStep(STEPS[prevIndex]);
  };

  // Submit
  const handleSubmit = async () => {
    if (!selectedTemplate || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const overridesArray = Object.values(itemOverrides).map(o => ({
        slug: o.slug,
        price_cents: o.price_cents,
        enabled: o.enabled,
      }));

      const costsArray = fixedCosts.map(c => ({
        type: c.type,
        label: c.label,
        amount_cents: c.amount_cents,
      }));

      const { data, error } = await supabase.rpc('setup_cafe_from_template', {
        p_cafe_id: cafeId,
        p_template_key: selectedTemplate.template_key,
        p_item_overrides: overridesArray,
        p_fixed_costs: costsArray,
        p_cafe_name: cafeName,
      });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string; items_created?: number };
      if (result?.error) throw new Error(result.error);

      toast.success(`${result?.items_created || 0} menu items created! Your cafe is ready.`);

      // Small delay for toast to show, then redirect
      setTimeout(() => {
        router.push('/cafe/dashboard');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error('Setup error:', err);
      toast.error(err.message || 'Setup failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Sparkles className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sajilo Suru</h1>
              <p className="text-sm text-gray-500">15 minutes ma cafe setup garnus</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center gap-1">
                <div className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= stepIndex ? 'bg-orange-500' : 'bg-gray-200'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STEPS.map((step, i) => (
              <span key={step} className={`text-xs ${i <= stepIndex ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                {STEP_LABELS[step]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1: Cafe Type */}
        {currentStep === 'cafe_type' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Namaste! 🙏</h2>
              <p className="text-gray-600 mt-2">
                <span className="font-semibold">{cafeName}</span> ko lagi setup suru garau.
                <br />Kun type ko cafe ho?
              </p>
            </div>

            <div className="grid gap-4">
              {templates.map(template => (
                <button
                  key={template.template_key}
                  onClick={() => handleSelectTemplate(template)}
                  className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all text-left ${
                    selectedTemplate?.template_key === template.template_key
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-orange-200 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${
                    selectedTemplate?.template_key === template.template_key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {TEMPLATE_ICONS[template.template_key] || <Store className="w-10 h-10" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{template.display_name}</h3>
                    <p className="text-sm text-gray-500">{template.display_name_np}</p>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      {template.items.length} items • {template.categories.length} categories
                    </p>
                  </div>
                  {selectedTemplate?.template_key === template.template_key && (
                    <Check className="w-6 h-6 text-orange-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={goNext}
              disabled={!selectedTemplate}
              className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              Aghi Badhau <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: Menu Review */}
        {currentStep === 'menu' && selectedTemplate && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">📋 Menu Review</h2>
              <p className="text-gray-600 mt-1">Price adjust garnus. Nachahine item hataunus.</p>
            </div>

            {selectedTemplate.categories.map(category => {
              const catItems = selectedTemplate.items.filter(item => item.category_slug === category.slug);
              if (catItems.length === 0) return null;
              return (
                <div key={category.slug} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-700">{category.name}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {catItems.map(item => {
                      const override = itemOverrides[item.slug];
                      if (!override) return null;
                      return (
                        <div key={item.slug} className={`flex items-center gap-3 px-4 py-3 ${!override.enabled ? 'opacity-50' : ''}`}>
                          <button
                            onClick={() => handleToggleItem(item.slug)}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              override.enabled
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {override.enabled && <Check className="w-4 h-4" />}
                          </button>
                          <span className="flex-1 font-medium text-gray-900 text-sm">{item.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">Rs</span>
                            <input
                              type="number"
                              value={override.price_cents / 100}
                              onChange={(e) => handlePriceChange(item.slug, Math.round(parseFloat(e.target.value || '0') * 100))}
                              disabled={!override.enabled}
                              className="w-20 px-2 py-1.5 text-right border border-gray-300 rounded-lg text-sm font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none disabled:bg-gray-100"
                              min="0"
                              step="5"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <p className="text-center text-sm text-gray-500">
              {enabledItems.length} items selected • Average price: {formatRs(Math.round(avgItemPrice))}
            </p>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" /> Pachhi
              </button>
              <button
                onClick={goNext}
                disabled={enabledItems.length === 0}
                className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                Aghi Badhau <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Fixed Costs */}
        {currentStep === 'costs' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">💰 Monthly Kharcha</h2>
              <p className="text-gray-600 mt-1">Mahina ko fixed kharcha haru bharnuhos</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {fixedCosts.map((cost, index) => (
                  <div key={cost.type} className="flex items-center gap-3 px-4 py-4">
                    <DollarSign className="w-5 h-5 text-gray-400 shrink-0" />
                    <span className="flex-1 font-medium text-gray-900">{cost.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">Rs</span>
                      <input
                        type="number"
                        value={cost.amount_cents / 100}
                        onChange={(e) => handleCostChange(index, Math.round(parseFloat(e.target.value || '0') * 100))}
                        className="w-24 px-2 py-1.5 text-right border border-gray-300 rounded-lg text-sm font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                        min="0"
                        step="500"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-orange-50 px-4 py-4 border-t border-orange-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total Monthly</span>
                  <span className="font-bold text-lg text-orange-600">{formatRs(totalFixedCosts)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Daily share: {formatRs(dailyFixedCost)}/day
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" /> Pachhi
              </button>
              <button
                onClick={goNext}
                className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                Aghi Badhau <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Preview & Launch */}
        {currentStep === 'preview' && selectedTemplate && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">🚀 Tayyar Cha!</h2>
              <p className="text-gray-600 mt-1">{cafeName} ko projection hernus</p>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-xl">
                  {TEMPLATE_ICONS[selectedTemplate.template_key]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{cafeName}</h3>
                  <p className="text-sm text-gray-500">{selectedTemplate.display_name} • {enabledItems.length} items</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Din ma kati customer aaucha? (Estimate)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={customersPerDay}
                    onChange={(e) => setCustomersPerDay(parseInt(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-lg font-bold text-orange-600 w-12 text-right">{customersPerDay}</span>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Projection */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  Monthly Projection
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue (est.)</span>
                    <span className="font-semibold text-green-600">{formatRs(estimatedMonthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fixed Costs</span>
                    <span className="font-semibold text-red-500">-{formatRs(totalFixedCosts)}</span>
                  </div>
                  <hr className="border-gray-300" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-bold text-lg">Est. Profit</span>
                    <span className={`font-bold text-2xl ${estimatedMonthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {estimatedMonthlyProfit >= 0 ? '' : '-'}{formatRs(Math.abs(estimatedMonthlyProfit))}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * Variable costs (ingredients, supplies) not included. Actual profit = this minus daily purchases.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className="py-4 px-6 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold rounded-2xl text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <PartyPopper className="w-6 h-6" />
                    Suru Garau! 🚀
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
