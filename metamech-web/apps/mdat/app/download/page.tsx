'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Check, User, Building, MapPin, Mail, FileDown, Calendar, Phone, Briefcase, MessageSquare } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
const FORMSPREE_URL = 'https://formspree.io/f/xvzzkjwd';

export default function DownloadPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    designation: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    email: '',
    notes: '',
  });

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!formRef.current) return;
    import('gsap').then((gsapMod) => {
      const gsap = gsapMod.default || gsapMod;
      gsap.fromTo(formRef.current, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
    }).catch(() => {
      if (formRef.current) formRef.current.style.opacity = '1';
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Trial Download Request - ${formData.companyName}`,
          ...formData,
        }),
      });
      if (res.ok) setIsSubmitted(true);
      else throw new Error('Failed');
    } catch { alert('Something went wrong. Please email us at hi@metamechsolutions.com'); }
    finally { setIsSubmitting(false); }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = 'https://github.com/saviosyl/MDAT/releases/latest/download/MetaMech-Trial.zip';
    link.download = 'MetaMech-Trial.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFormValid = formData.fullName && formData.companyName && formData.email;

  return (
    <div className="pt-[70px]">
      <Breadcrumbs items={[{ name: 'Download Trial' }]} />
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-navy">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[200px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-orbitron text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              DOWNLOAD YOUR <span className="text-gradient-teal">FREE TRIAL</span>
            </h1>
            <p className="text-gray-400 text-lg">Experience the full power of MetaMech for 3 days, completely free.</p>
          </div>

          <div ref={formRef} className="glass-card p-6 sm:p-10">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Calendar size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold text-white">3-Day Free Trial</h2>
                    <p className="text-sm text-gray-500">Full access to all features</p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" name="fullName" placeholder="Full Name *" value={formData.fullName} onChange={handleInputChange} className="input-field pl-12" required />
                </div>

                {/* Designation & Phone — side by side */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" name="designation" placeholder="Designation" value={formData.designation} onChange={handleInputChange} className="input-field pl-12" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} className="input-field pl-12" />
                  </div>
                </div>

                {/* Company Name */}
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" name="companyName" placeholder="Company Name *" value={formData.companyName} onChange={handleInputChange} className="input-field pl-12" required />
                </div>

                {/* Company Address */}
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="text" name="companyAddress" placeholder="Company Address" value={formData.companyAddress} onChange={handleInputChange} className="input-field pl-12" />
                </div>

                {/* Email */}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input type="email" name="email" placeholder="Email Address *" value={formData.email} onChange={handleInputChange} className="input-field pl-12" required />
                </div>

                {/* Notes */}
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-gray-500" size={18} />
                  <textarea name="notes" placeholder="Notes (optional)" value={formData.notes} onChange={handleInputChange} rows={3} className="input-field pl-12 resize-none" />
                </div>

                <button type="submit" disabled={!isFormValid || isSubmitting} className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" /> : <><Download size={18} /> Unlock Download</>}
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">By downloading, you agree to our Terms of Service and Privacy Policy.</p>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-6 animate-scale-in">
                  <Check size={40} className="text-cyan-400" />
                </div>
                <h2 className="font-orbitron text-2xl font-bold text-white mb-3">Your Download is Ready!</h2>
                <p className="text-gray-400 mb-8">Thank you! Your free trial has been unlocked.</p>
                <button onClick={handleDownload} className="btn-primary flex items-center justify-center gap-2 mx-auto mb-4">
                  <FileDown size={18} /> Download MetaMech Trial
                </button>
                <p className="text-sm text-gray-500 mb-6">MetaMech-Trial.zip</p>
                <div className="text-left bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-xs font-bold text-cyan-400 mb-2">⚠️ Windows SmartScreen Notice</p>
                  <p className="text-xs text-gray-400">Windows may show a protection warning because MetaMech is new software. This is normal for all new applications.</p>
                  <p className="text-xs text-gray-400 mt-2">To proceed: Click <span className="text-white font-semibold">&quot;More info&quot;</span> → then click <span className="text-white font-semibold">&quot;Run anyway&quot;</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
