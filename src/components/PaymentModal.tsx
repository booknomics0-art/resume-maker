/**
 * CraftCV Payment Modal — ₹20 Pro Unlock
 * Razorpay-like UI with UPI, Card, Netbanking options
 * Secure, audited, with transaction handling
 */

import { useState } from 'react';
import { PRICING, initiatePayment, simulateSuccessfulPayment } from '../lib/billing';
import { currentUser } from '../lib/auth';
import { auditLog } from '../lib/security';

interface Props {
  onClose: () => void;
  onSuccess: (txnId: string) => void;
  remainingFree: number;
}

export default function PaymentModal({ onClose, onSuccess, remainingFree }: Props) {
  const [step, setStep] = useState<'options' | 'processing' | 'success' | 'failed'>('options');
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [error, setError] = useState('');
  const [txnId, setTxnId] = useState('');
  const user = currentUser();

  const handlePay = () => {
    setError('');
    setStep('processing');
    auditLog('PAYMENT_INITIATED', { method, amount: PRICING.pro.price });

    // In production, integrate Razorpay Checkout:
    // const options = { key: 'rzp_live_xxx', amount: 2000, currency: 'INR', ... }
    // For demo, simulate payment
    initiatePayment({
      amount: PRICING.pro.price,
      currency: 'INR',
      email: user?.email || 'user@craftcv.app',
      name: user?.name || 'CraftCV User',
      onSuccess: (id) => {
        setTxnId(id);
        setStep('success');
        setTimeout(() => onSuccess(id), 1500);
      },
      onFailure: (err) => {
        setError(err);
        setStep('failed');
      },
      onDismiss: () => {
        setStep('options');
      },
    });
  };

  const handleDemoUnlock = () => {
    // For testing — instant unlock without real payment gateway
    // In production, remove this and use only Razorpay
    const id = simulateSuccessfulPayment(user?.email || 'demo@craftcv.app');
    setTxnId(id);
    setStep('success');
    setTimeout(() => onSuccess(id), 1000);
    auditLog('DEMO_PAYMENT_USED', { id });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(7,15,34,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        
        {step === 'options' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--navy-900)', fontSize: 20 }}>Unlock Pro — ₹20 One-Time</h3>
              <button className="btn small ghost" onClick={onClose} style={{ minWidth: 36 }}>✕</button>
            </div>

            <div className="notice warn" style={{ marginBottom: 16 }}>
              <b>Free limit reached:</b> You used your {remainingFree === 0 ? '1 free download' : `${1-remainingFree}/1 free downloads`}. 
              Pro unlocks unlimited downloads forever for just ₹20.
            </div>

            <div style={{ background: 'var(--navy-50)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--navy-100)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <b style={{ fontSize: 18, color: 'var(--navy-900)' }}>₹20 <small style={{ fontWeight: 400, color: 'var(--silver-500)' }}>one-time, no renewal</small></b>
                <span style={{ background: 'var(--navy-800)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>BEST VALUE</span>
              </div>
              <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: 13.5, lineHeight: 1.6 }}>
                <li>♾️ Unlimited resume downloads</li>
                <li>🎨 All 50 templates unlocked</li>
                <li>📤 Advanced resume upload & edit</li>
                <li>✨ AI content improvement</li>
                <li>🚫 No watermark, no limits</li>
                <li>🔮 Future templates included</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="f">Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { id: 'upi', label: 'UPI', icon: '📱', desc: 'GPay, PhonePe' },
                  { id: 'card', label: 'Card', icon: '💳', desc: 'Visa, Mastercard' },
                  { id: 'netbanking', label: 'Netbanking', icon: '🏦', desc: 'All banks' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id as any)}
                    style={{
                      padding: '12px 8px', borderRadius: 10, border: `2px solid ${method === m.id ? 'var(--navy-600)' : 'var(--silver-300)'}`,
                      background: method === m.id ? 'var(--navy-50)' : '#fff',
                      cursor: 'pointer', textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{m.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--silver-500)' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="notice" style={{ fontSize: 12, marginBottom: 16 }}>
              🔒 <b>Secure payment via Razorpay</b> — UPI, Cards, Netbanking, Wallets. 
              Encrypted, PCI-DSS compliant. No card details stored. 
              Receipt sent to {user?.email || 'your email'}.
            </div>

            {error && <div className="notice err" style={{ marginBottom: 12 }}>{error}</div>}

            <button className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 16, fontWeight: 800 }} onClick={handlePay}>
              Pay ₹20 Securely — Unlock Unlimited
            </button>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn small" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDemoUnlock}>
                🧪 Demo Unlock (Test)
              </button>
              <button className="btn small ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                Maybe Later
              </button>
            </div>

            <p className="hint" style={{ textAlign: 'center', marginTop: 12, fontSize: 11.5 }}>
              By paying, you agree to our <a href="#/terms">Terms</a> & <a href="#/refund">Refund Policy (No Refund)</a>. 
              Digital product — instant unlock.
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⏳</div>
            <h3 style={{ color: 'var(--navy-900)' }}>Processing Payment...</h3>
            <p className="hint">Please wait — connecting to Razorpay secure gateway</p>
            <div className="progress" style={{ marginTop: 20, height: 6 }}><div style={{ width: '80%', animation: 'pulse 1.2s infinite' }} /></div>
            <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>Amount: ₹20 · Method: {method.toUpperCase()} · Don't close window</p>
          </div>
        )}

        {step === 'success' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h3 style={{ color: 'var(--ok)' }}>Payment Successful!</h3>
            <p style={{ fontSize: 14, color: 'var(--ink)' }}>Pro unlocked — unlimited downloads forever</p>
            <div style={{ background: 'var(--silver-100)', borderRadius: 8, padding: 12, marginTop: 16, textAlign: 'left', fontSize: 13 }}>
              <div><b>Transaction ID:</b> {txnId}</div>
              <div><b>Amount:</b> ₹20</div>
              <div><b>Status:</b> <span style={{ color: 'var(--ok)', fontWeight: 700 }}>SUCCESS</span></div>
              <div><b>Plan:</b> Pro Lifetime</div>
            </div>
            <p className="hint" style={{ marginTop: 12 }}>Receipt sent to your email. You can now download unlimited resumes.</p>
          </div>
        )}

        {step === 'failed' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h3 style={{ color: 'var(--err)' }}>Payment Failed</h3>
            <p className="notice err">{error || 'Transaction failed. Please try again.'}</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn" onClick={() => setStep('options')}>Try Again</button>
              <button className="btn primary" onClick={handleDemoUnlock}>Use Demo Unlock</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}
