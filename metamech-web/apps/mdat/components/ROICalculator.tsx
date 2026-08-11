'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Clock, Euro, Calendar, Package, Calculator, TrendingUp } from 'lucide-react';

const plans = [
  { name: 'Trial', cost: 0 },
  { name: 'Standard', cost: 999 },
  { name: 'Premium', cost: 1299 },
  { name: 'Premium Plus', cost: 1599 },
];

function useAnimatedNumber(value: number, duration = 500) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(value);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const from = startRef.current;
    const to = value;
    if (from === to) return;

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplay(Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  // Keep startRef in sync when display settles
  useEffect(() => {
    startRef.current = display;
  }, [display]);

  return display;
}

function AnimatedCurrency({ value }: { value: number }) {
  const animated = useAnimatedNumber(value, 600);
  const formatted = new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(animated);
  return <>{formatted}</>;
}

function AnimatedInteger({ value, suffix = '' }: { value: number; suffix?: string }) {
  const animated = useAnimatedNumber(value, 500);
  return <>{animated}{suffix}</>;
}

export default function ROICalculator() {
  const [engineers, setEngineers] = useState(5);
  const [hoursSaved, setHoursSaved] = useState(10);
  const [hourlyCost, setHourlyCost] = useState(75);
  const [weeksPerYear, setWeeksPerYear] = useState(48);
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [toolCost, setToolCost] = useState(999);

  const weeklySavings = engineers * hoursSaved * hourlyCost;
  const monthlySavings = weeklySavings * 4.33;
  const annualSavings = weeklySavings * weeksPerYear;
  const breakEven = toolCost > 0 && weeklySavings > 0 ? Math.ceil(toolCost / weeklySavings) : 0;

  const handlePlanSelect = (index: number) => {
    setSelectedPlan(index);
    setToolCost(plans[index].cost);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Inputs Column */}
      <div className="lg:col-span-3 space-y-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Users size={20} className="text-cyan-400" />
            </div>
            <label className="text-white font-medium">Number of Engineers</label>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="50"
              value={engineers}
              onChange={(e) => setEngineers(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 text-right font-mono text-cyan-400 text-lg">{engineers}</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Clock size={20} className="text-cyan-400" />
            </div>
            <label className="text-white font-medium">Hours Saved Per Week</label>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="40"
              value={hoursSaved}
              onChange={(e) => setHoursSaved(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 text-right font-mono text-cyan-400 text-lg">{hoursSaved}h</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Euro size={20} className="text-cyan-400" />
            </div>
            <label className="text-white font-medium">Hourly Cost (€)</label>
          </div>
          <input
            type="number"
            min="1"
            max="200"
            value={hourlyCost}
            onChange={(e) => setHourlyCost(e.target.value === '' ? 0 : Number(e.target.value))}
            className="input-field w-full"
          />
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Calendar size={20} className="text-cyan-400" />
            </div>
            <label className="text-white font-medium">Working Weeks Per Year</label>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="52"
              value={weeksPerYear}
              onChange={(e) => setWeeksPerYear(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-16 text-right font-mono text-cyan-400 text-lg">{weeksPerYear}</span>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Package size={20} className="text-gold" />
            </div>
            <label className="text-white font-medium">Select Your Plan</label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plans.map((plan, index) => (
              <button
                key={index}
                onClick={() => handlePlanSelect(index)}
                className={`p-3 rounded-xl border transition-all duration-300 text-sm ${
                  selectedPlan === index
                    ? 'border-cyan-500 bg-cyan-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="font-medium">{plan.name}</div>
                <div className="text-xs opacity-70">€{plan.cost}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
              <Calculator size={20} className="text-gold" />
            </div>
            <label className="text-white font-medium">Tool Cost (€)</label>
          </div>
          <input
            type="number"
            min="0"
            value={toolCost}
            onChange={(e) => setToolCost(e.target.value === '' ? 0 : Number(e.target.value))}
            className="input-field w-full"
          />
        </div>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2">
        <div className="glass-card p-6 lg:sticky lg:top-24">
          <h3 className="font-orbitron text-xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-cyan-400" />
            Your Savings
          </h3>

          <div className="space-y-6">
            <div className="relative">
              <div className="text-sm text-gray-500 mb-1">Weekly Savings</div>
              <div className="font-mono text-3xl sm:text-4xl font-bold text-gradient-teal">
                <AnimatedCurrency value={weeklySavings} />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>

            <div className="relative">
              <div className="text-sm text-gray-500 mb-1">Monthly Savings</div>
              <div className="font-mono text-3xl sm:text-4xl font-bold text-gradient-teal">
                <AnimatedCurrency value={Math.round(monthlySavings)} />
              </div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
            </div>

            <div className="relative p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
              <div className="text-sm text-cyan-400 mb-1">Annual Savings</div>
              <div className="font-mono text-4xl sm:text-5xl font-bold text-gradient-teal">
                <AnimatedCurrency value={annualSavings} />
              </div>
            </div>

            <div className="relative">
              <div className="text-sm text-gray-500 mb-1">Break-even Time</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-gradient-gold">
                  <AnimatedInteger value={breakEven} />
                </span>
                <span className="text-gray-400">weeks</span>
              </div>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min((breakEven / 52) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
