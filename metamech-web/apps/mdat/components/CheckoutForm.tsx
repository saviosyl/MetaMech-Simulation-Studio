'use client';

import { useState } from 'react';
import {
  User, Building, Receipt, MapPin, Mail, Phone,
  CreditCard, Wallet, FileText, Check, ArrowRight,
  Lock, Shield, ChevronRight,
} from 'lucide-react';

const countries = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Belgium','Bolivia','Brazil',
  'Bulgaria','Cambodia','Cameroon','Canada','Chile','China','Colombia','Costa Rica',
  'Croatia','Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan',
  'Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon','Lithuania','Luxembourg',
  'Malaysia','Maldives','Malta','Mexico','Moldova','Monaco','Mongolia','Montenegro',
  'Morocco','Mozambique','Myanmar','Namibia','Nepal','Netherlands','New Zealand',
  'Nicaragua','Nigeria','North Macedonia','Norway','Oman','Pakistan','Panama','Paraguay',
  'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','South Africa',
  'South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Taiwan','Tanzania',
  'Thailand','Tunisia','Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

const paymentMethods = [
  { id: 'stripe', name: 'Credit Card (Stripe)', icon: CreditCard, description: 'Pay securely with Stripe' },
  { id: 'revolut', name: 'Revolut', icon: Wallet, description: 'Pay with Revolut' },
  { id: 'invoice', name: 'Request Invoice', icon: FileText, description: "We'll send you an invoice" },
];

const STRIPE_LINKS: Record<string, string> = {
  standard: 'https://buy.stripe.com/28E5kC61J4252sl6vi2Nq00',
  premium: 'https://buy.stripe.com/4gM28qgGnaqteb38Dq2Nq01',
  plus: '#',
};

const REVOLUT_LINK = 'https://revolut.me/saviosyl';
const FORMSPREE_URL = 'https://formspree.io/f/xvzzkjwd';

export default function CheckoutForm() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    vatNumber: '',
    country: '',
    address: '',
    email: '',
    phone: '',
  });
  const [selectedPayment, setSelectedPayment] = useState('stripe');
  const [selectedPlan, setSelectedPlan] = useState('standard');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Order Details - ${formData.companyName}`,
          plan: selectedPlan,
          ...formData,
        }),
      });
      if (response.ok) {
        setStep(2);
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      alert('Something went wrong. Please email us directly at hi@metamechsolutions.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = () => {
    switch (selectedPayment) {
      case 'stripe': {
        const url = STRIPE_LINKS[selectedPlan];
        if (url && url !== '#') window.open(url, '_blank');
        else alert('Stripe link not configured for this plan. Please use Revolut or Request Invoice.');
        break;
      }
      case 'revolut':
        window.open(REVOLUT_LINK, '_blank');
        break;
      case 'invoice':
        window.location.href = `mailto:hi@metamechsolutions.com?subject=Invoice Request - ${encodeURIComponent(formData.companyName)}&body=${encodeURIComponent(
          `Plan: ${selectedPlan.toUpperCase()}\nCompany: ${formData.companyName}\nName: ${formData.fullName}\nEmail: ${formData.email}\nCountry: ${formData.country}\nAddress: ${formData.address}`
        )}`;
        break;
    }
  };

  const isStep1Valid = formData.fullName && formData.companyName && formData.email && formData.country;

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-cyan-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-cyan-500 text-navy' : 'bg-white/10'}`}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <span className="text-sm font-medium hidden sm:block">Your Details</span>
          </div>
          <div className="w-16 sm:w-24 h-px bg-white/10 relative">
            <div className="absolute inset-y-0 left-0 bg-cyan-500 transition-all duration-500" style={{ width: step > 1 ? '100%' : '0%' }} />
          </div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-cyan-400' : 'text-gray-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-cyan-500 text-navy' : 'bg-white/10'}`}>
              2
            </div>
            <span className="text-sm font-medium hidden sm:block">Payment</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-8">
        {step === 1 ? (
          <form onSubmit={handleSubmitDetails} className="space-y-5">
            <h3 className="font-orbitron text-xl font-bold text-white mb-6">Your Details</h3>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Selected Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full bg-navy-light border border-white/20 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="trial">Demo / Trial (3 days) - €0</option>
                <option value="standard">Standard Pack - €999</option>
                <option value="premium">Premium Pack - €1,299</option>
                <option value="plus">Premium Plus - €1,599</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" name="fullName" placeholder="Full Name *" value={formData.fullName} onChange={handleInputChange} className="input-field pl-12" required />
              </div>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" name="companyName" placeholder="Company Name *" value={formData.companyName} onChange={handleInputChange} className="input-field pl-12" required />
              </div>
              <div className="relative">
                <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="text" name="vatNumber" placeholder="VAT Number (optional)" value={formData.vatNumber} onChange={handleInputChange} className="input-field pl-12" />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <select name="country" value={formData.country} onChange={handleInputChange} className="input-field pl-12 appearance-none" required>
                  <option value="">Select Country *</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="relative">
              <MapPin className="absolute left-4 top-4 text-gray-500" size={18} />
              <textarea name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} rows={3} className="input-field pl-12 resize-none" />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleInputChange} className="input-field pl-12" required />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="input-field pl-12" />
              </div>
            </div>

            <button type="submit" disabled={!isStep1Valid || isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6">
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Continue to Payment <ArrowRight size={18} /></>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-4">
              Your information is securely sent to our team. We&apos;ll never share your data.
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-cyan-400" />
              </div>
              <h3 className="font-orbitron text-xl font-bold text-white mb-2">Details Saved!</h3>
              <p className="text-gray-400 text-sm">Choose your payment method to complete the order.</p>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Selected Plan:</span>
                <span className="text-white font-medium capitalize">{selectedPlan} Pack</span>
              </div>
            </div>

            <h3 className="font-orbitron text-lg font-bold text-white">Select Payment Method</h3>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`w-full p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${
                    selectedPayment === method.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedPayment === method.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-gray-400'}`}>
                    <method.icon size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${selectedPayment === method.id ? 'text-white' : 'text-gray-300'}`}>{method.name}</div>
                    <div className="text-sm text-gray-500">{method.description}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPayment === method.id ? 'border-cyan-500' : 'border-gray-500'}`}>
                    {selectedPayment === method.id && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 py-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-gray-500 text-sm"><Lock size={16} className="text-cyan-400" /> SSL Secure</div>
              <div className="flex items-center gap-2 text-gray-500 text-sm"><Shield size={16} className="text-cyan-400" /> Protected</div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all duration-300">
                Back
              </button>
              <button onClick={handlePayment} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {selectedPayment === 'invoice' ? 'Request Invoice' : 'Proceed to Payment'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
