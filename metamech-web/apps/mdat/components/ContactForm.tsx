'use client';

import { useState } from 'react';
import { User, Building, Mail, Phone, MessageSquare, Send, Check } from 'lucide-react';

const FORMSPREE_URL = 'https://formspree.io/f/xvzzkjwd';

export default function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Demo Request - ${formData.company}`,
          ...formData,
        }),
      });
      if (response.ok) {
        setIsSubmitted(true);
      } else {
        throw new Error('Form submission failed');
      }
    } catch {
      alert('Something went wrong. Please email us directly at hi@metamechsolutions.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name && formData.company && formData.email;

  if (isSubmitted) {
    return (
      <div className="glass-card p-6 sm:p-8">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-6 animate-scale-in">
            <Check size={40} className="text-cyan-400" />
          </div>
          <h3 className="font-orbitron text-2xl font-bold text-white mb-3">Message Sent!</h3>
          <p className="text-gray-400">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" name="name" placeholder="Full Name *" value={formData.name} onChange={handleInputChange} className="input-field pl-12" required />
          </div>
          <div className="relative">
            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" name="company" placeholder="Company Name *" value={formData.company} onChange={handleInputChange} className="input-field pl-12" required />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleInputChange} className="input-field pl-12" required />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="input-field pl-12" />
          </div>
        </div>

        <div className="relative">
          <MessageSquare className="absolute left-4 top-4 text-gray-500" size={18} />
          <textarea name="message" placeholder="Tell us about your project..." value={formData.message} onChange={handleInputChange} rows={5} className="input-field pl-12 resize-none" />
        </div>

        <button type="submit" disabled={!isFormValid || isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Send size={18} /> Send Request</>
          )}
        </button>
      </form>
    </div>
  );
}
