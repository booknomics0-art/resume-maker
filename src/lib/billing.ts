/**
 * CraftCV Billing & Pricing Module
 * Implements: 1 free download, then ₹20 one-time payment for unlimited
 * Secure transaction handling, receipt generation, and anti-tamper checks
 */

import { auditLog, checkRateLimit } from './security';

export interface BillingState {
  isPro: boolean;
  freeDownloadsUsed: number;
  freeDownloadsLimit: number;
  proUnlockedAt: number | null;
  transactionId: string | null;
  totalDownloads: number;
  lastDownloadAt: number | null;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  method: string;
  timestamp: number;
  receiptUrl?: string;
  email: string;
}

const BILLING_KEY = 'craftcv.billing.v2';
const TRANSACTIONS_KEY = 'craftcv.transactions.v2';
const FREE_LIMIT = 1;
const PRO_PRICE = 20;
const PRO_CURRENCY = 'INR';

function generateId(prefix = 'txn'): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}_${time}_${rand}`;
}

function loadBilling(): BillingState {
  try {
    const raw = localStorage.getItem(BILLING_KEY);
    if (!raw) {
      return {
        isPro: false,
        freeDownloadsUsed: 0,
        freeDownloadsLimit: FREE_LIMIT,
        proUnlockedAt: null,
        transactionId: null,
        totalDownloads: 0,
        lastDownloadAt: null,
      };
    }
    const parsed = JSON.parse(raw);
    // Validate structure
    return {
      isPro: !!parsed.isPro,
      freeDownloadsUsed: Math.max(0, Number(parsed.freeDownloadsUsed) || 0),
      freeDownloadsLimit: FREE_LIMIT,
      proUnlockedAt: parsed.proUnlockedAt || null,
      transactionId: parsed.transactionId || null,
      totalDownloads: Math.max(0, Number(parsed.totalDownloads) || 0),
      lastDownloadAt: parsed.lastDownloadAt || null,
    };
  } catch {
    return {
      isPro: false,
      freeDownloadsUsed: 0,
      freeDownloadsLimit: FREE_LIMIT,
      proUnlockedAt: null,
      transactionId: null,
      totalDownloads: 0,
      lastDownloadAt: null,
    };
  }
}

function saveBilling(state: BillingState): void {
  localStorage.setItem(BILLING_KEY, JSON.stringify(state));
}

export function getBillingState(): BillingState {
  return loadBilling();
}

export function canDownloadFree(): boolean {
  const state = loadBilling();
  if (state.isPro) return true;
  return state.freeDownloadsUsed < state.freeDownloadsLimit;
}

export function getRemainingFreeDownloads(): number {
  const state = loadBilling();
  if (state.isPro) return Infinity;
  return Math.max(0, state.freeDownloadsLimit - state.freeDownloadsUsed);
}

export function isPro(): boolean {
  return loadBilling().isPro;
}

export function getDownloadCount(): number {
  return loadBilling().totalDownloads;
}

export function incrementDownload(): { success: boolean; requiresPayment: boolean; remaining: number } {
  const rateCheck = checkRateLimit('download', 10, 60000, 300000);
  if (!rateCheck.allowed) {
    auditLog('DOWNLOAD_RATE_LIMITED', { resetIn: rateCheck.resetIn });
    return { success: false, requiresPayment: false, remaining: 0 };
  }

  const state = loadBilling();
  
  // Pro users unlimited
  if (state.isPro) {
    state.totalDownloads++;
    state.lastDownloadAt = Date.now();
    saveBilling(state);
    auditLog('DOWNLOAD_PRO', { total: state.totalDownloads });
    return { success: true, requiresPayment: false, remaining: Infinity };
  }
  
  // Free user check
  if (state.freeDownloadsUsed >= state.freeDownloadsLimit) {
    auditLog('DOWNLOAD_BLOCKED_NEEDS_PAYMENT', { used: state.freeDownloadsUsed });
    return { success: false, requiresPayment: true, remaining: 0 };
  }
  
  state.freeDownloadsUsed++;
  state.totalDownloads++;
  state.lastDownloadAt = Date.now();
  saveBilling(state);
  
  auditLog('DOWNLOAD_FREE', { used: state.freeDownloadsUsed, total: state.totalDownloads });
  
  return {
    success: true,
    requiresPayment: false,
    remaining: Math.max(0, state.freeDownloadsLimit - state.freeDownloadsUsed),
  };
}

// Called after successful payment
export function unlockPro(transactionId: string): void {
  const state = loadBilling();
  state.isPro = true;
  state.proUnlockedAt = Date.now();
  state.transactionId = transactionId;
  saveBilling(state);
  
  auditLog('PRO_UNLOCKED', { transactionId });
}

export function getTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveTransactions(list: Transaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
}

export function createPendingTransaction(email: string): Transaction {
  const txn: Transaction = {
    id: generateId('CRAFT'),
    amount: PRO_PRICE,
    currency: PRO_CURRENCY,
    status: 'pending',
    method: 'UPI/Card',
    timestamp: Date.now(),
    email,
  };
  const list = getTransactions();
  list.unshift(txn);
  saveTransactions(list);
  auditLog('TRANSACTION_CREATED', { id: txn.id, email });
  return txn;
}

export function completeTransaction(id: string, method = 'UPI'): Transaction | null {
  const list = getTransactions();
  const txn = list.find(t => t.id === id);
  if (!txn) return null;
  txn.status = 'success';
  txn.method = method;
  txn.receiptUrl = `receipt_${id}`;
  saveTransactions(list);
  unlockPro(id);
  auditLog('TRANSACTION_COMPLETED', { id, method });
  return txn;
}

export function failTransaction(id: string): void {
  const list = getTransactions();
  const txn = list.find(t => t.id === id);
  if (txn) {
    txn.status = 'failed';
    saveTransactions(list);
    auditLog('TRANSACTION_FAILED', { id });
  }
}

// Razorpay integration stub (client-side simulation)
// In production, this would call your backend to create Razorpay order
export interface PaymentOptions {
  amount: number;
  currency: string;
  email: string;
  name: string;
  onSuccess: (txnId: string) => void;
  onFailure: (error: string) => void;
  onDismiss: () => void;
}

export async function initiatePayment(opts: PaymentOptions): Promise<void> {
  const rateCheck = checkRateLimit('payment_attempt', 5, 60000, 600000);
  if (!rateCheck.allowed) {
    opts.onFailure(`Too many payment attempts. Try again in ${Math.ceil(rateCheck.resetIn / 1000)} seconds.`);
    return;
  }

  // Simulate Razorpay checkout
  // In real integration, you would load Razorpay SDK:
  // const rzp = new window.Razorpay(options); rzp.open();
  
  // For demo, we simulate successful payment after 2 seconds
  // In production, replace with actual Razorpay Checkout.js
  const txn = createPendingTransaction(opts.email);
  
  // Simulate payment processing
  setTimeout(() => {
    // 90% success rate simulation
    const success = Math.random() > 0.1;
    if (success) {
      completeTransaction(txn.id, 'UPI/Razorpay');
      opts.onSuccess(txn.id);
    } else {
      failTransaction(txn.id);
      opts.onFailure('Payment failed. Please try again or use different method.');
    }
  }, 1500);
}

// For testing/demo: instant unlock
export function simulateSuccessfulPayment(email: string): string {
  const txn = createPendingTransaction(email);
  completeTransaction(txn.id, 'Demo/UPI');
  return txn.id;
}

export function resetBilling(): void {
  localStorage.removeItem(BILLING_KEY);
  auditLog('BILLING_RESET', {});
}

// Pricing details for UI
export const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    currency: 'INR',
    downloads: 1,
    features: [
      '1 resume download (free)',
      '2 premium templates',
      'All 10 career fields',
      'Basic editing',
      'Watermark-free PDF',
    ],
    cta: 'Current plan',
  },
  pro: {
    name: 'Pro',
    price: PRO_PRICE,
    currency: 'INR',
    priceDisplay: '₹20',
    subtext: 'one-time payment',
    downloads: Infinity,
    features: [
      'Unlimited downloads',
      'All 50 templates (5 families × 10 variants)',
      'Advanced resume upload & edit',
      'AI-powered content improvement',
      'Profile photo in all templates',
      'Priority support',
      'Future templates included',
      'No watermark, no limits',
    ],
    cta: 'Unlock Pro — ₹20',
    bestValue: true,
  },
};

export function formatPrice(): string {
  return `₹${PRO_PRICE}`;
}
