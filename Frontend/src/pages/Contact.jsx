import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import './Contact.css';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', form);
      toast.success('Message sent successfully! We will get back to you soon.');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-container">

        {/* Header */}
        <div className="contact-header">
          <p className="contact-label">Get In Touch</p>
          <h1 className="contact-title">Contact Us</h1>
          <div className="contact-title-line" />
          <p className="contact-subtitle">
            We're happy to help with any queries about our export services or floral offerings.
          </p>
        </div>

        <div className="contact-layout">

          {/* Left — Info */}
          <div className="contact-info">
            <div className="contact-info-card">
              <h3 className="contact-info-title">Buraq Flower Exports</h3>
              <p className="contact-info-tagline">
                Premium roses & blooms from Hosur to the world.
              </p>

              <div className="contact-info-items">
                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <p className="contact-info-label">Address</p>
                    <p className="contact-info-value">
                      Flat-138, Thotagari road, Goldan City<br />
                      Hosur, Tamil Nadu – 635109
                    </p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="contact-info-label">Phone</p>
                    <p className="contact-info-value">+91 9092849130</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="contact-info-label">Email</p>
                    <p className="contact-info-value">anees2785@gmail.com</p>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="contact-info-label">Working Hours</p>
                    <p className="contact-info-value">Mon – Sat: 9:00 AM – 6:30 PM</p>
                    <p className="contact-info-value">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="contact-form-wrap">
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3 className="contact-form-title">Send Us a Message</h3>

              <div className="contact-form-group">
                <label className="contact-form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                  className="contact-form-input"
                />
              </div>

              <div className="contact-form-group">
                <label className="contact-form-label">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="contact-form-input"
                />
              </div>

              <div className="contact-form-group">
                <label className="contact-form-label">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell us about your enquiry, bulk order requirements, or any questions..."
                  required
                  rows={5}
                  className="contact-form-textarea"
                />
              </div>

              <button
                type="submit"
                className="contact-form-btn"
                disabled={loading}
              >
                {loading ? 'Sending…' : 'SEND MESSAGE'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Contact;
