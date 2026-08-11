'use client';

import { FormEvent, useState } from 'react';
import { contact, projectEnquiryOptions } from '@metamech/shared';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextErrors: Record<string, string> = {};

    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const projectType = String(data.get('project_type') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name) nextErrors.name = 'Please enter your name.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Enter a valid email.';
    if (!projectType) nextErrors.project_type = 'Select a project type.';
    if (!message || message.length < 10) nextErrors.message = 'Add a short project description.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus('idle');
      return;
    }

    setStatus('submitting');

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
          <input name="name" required autoComplete="name" aria-invalid={Boolean(errors.name)} />
          {errors.name ? <span className="form-error">{errors.name}</span> : null}
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" aria-invalid={Boolean(errors.email)} />
          {errors.email ? <span className="form-error">{errors.email}</span> : null}
        </label>
      </div>
      <div className="form-grid two" style={{ marginTop: '0.9rem' }}>
        <label>
          Company
          <input name="company" autoComplete="organization" />
        </label>
        <label>
          Project type
          <select name="project_type" required defaultValue="" aria-invalid={Boolean(errors.project_type)}>
            <option value="" disabled>
              Select an option
            </option>
            {projectEnquiryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.project_type ? <span className="form-error">{errors.project_type}</span> : null}
        </label>
      </div>
      <div className="form-grid" style={{ marginTop: '0.9rem' }}>
        <label>
          Project details
          <textarea
            name="message"
            required
            placeholder="What are you looking to build?"
            aria-invalid={Boolean(errors.message)}
          />
          {errors.message ? <span className="form-error">{errors.message}</span> : null}
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
            minHeight: 44,
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
