'use client';

import { FormEvent, useState } from 'react';
import { contact, projectEnquiryOptions } from '@metamech/shared';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(contact.formspree, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Form submission failed');
      form.reset();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form className="form-panel" onSubmit={onSubmit} noValidate>
      <div className="form-grid two">
        <label>
          Name
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
      </div>
      <div className="form-grid two" style={{ marginTop: '0.9rem' }}>
        <label>
          Company
          <input name="company" autoComplete="organization" />
        </label>
        <label>
          Project type
          <select name="project_type" required defaultValue="">
            <option value="" disabled>
              Select an option
            </option>
            {projectEnquiryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid" style={{ marginTop: '0.9rem' }}>
        <label>
          Project details
          <textarea name="message" required placeholder="What are you looking to build?" />
        </label>
      </div>
      <input type="hidden" name="_subject" value="MetaMech Solutions — Project enquiry" />
      <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="submit"
          className="mm-btn mm-btn-primary"
          disabled={status === 'submitting'}
          style={{
            background: 'linear-gradient(135deg, #3F7CFF, #20C7C9)',
            color: '#fff',
            border: 'none',
            padding: '0.85rem 1.35rem',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {status === 'submitting' ? 'Sending…' : 'Send enquiry'}
        </button>
        <a href={`mailto:${contact.email}`} style={{ color: 'var(--mm-blue)', fontWeight: 600 }}>
          or email {contact.email}
        </a>
      </div>
      {status === 'success' ? <p className="form-status">Thanks — your enquiry has been sent.</p> : null}
      {status === 'error' ? (
        <p className="form-status">Something went wrong. Please email {contact.email} directly.</p>
      ) : null}
    </form>
  );
}
