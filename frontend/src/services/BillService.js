// frontend/src/services/BillService.js
import axios from "../api/axios";

const BASE = "/bills";

async function handleResponse(promise) {
  const res = await promise;
  return res.data;
}

const BillService = {
  /**
   * Get bills (optionally filtered)
   * params example: { month: '2025-09' } or { tenant: '...', room: '...' }
   */
  getBills: async (params = {}) => {
    try {
      return await handleResponse(axios.get(BASE, { params }));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Get a single bill by id
   */
  getBill: async (id) => {
    try {
      return await handleResponse(axios.get(`${BASE}/${id}`));
    } catch (err) {
      throw err;
    }
  },

  getBillById: async (id) => {
    return BillService.getBill(id);
  },

  /**
   * Download PDF blob for a bill
   * Returns blob data (caller should createObjectURL or save)
   */
  getBillPdf: async (id, options = {}) => {
    try {
      const axiosOpts = {
        responseType: options.responseType || "blob",
      };
      if (options.params) axiosOpts.params = options.params;
      const res = await axios.get(`${BASE}/${id}/pdf`, axiosOpts);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Public lookup for tenants/rooms (no auth)
   * e.g. { tenantId: 'T001', month: '2025-09' }
   */
  getBillsPublic: async (params = {}) => {
    try {
      return await handleResponse(axios.get(`${BASE}/public`, { params }));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Create a bill (admin)
   * payload: { room, tenant, billingMonth, totalAmount, charges: [...], totals, notes, paymentLink }
   */
  createBill: async (data) => {
    try {
      return await handleResponse(axios.post(BASE, data));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Update existing bill (admin)
   */
  updateBill: async (id, data) => {
    try {
      return await handleResponse(axios.put(`${BASE}/${id}`, data));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Create payment order for an existing bill (admin protected route)
   * Returns backend response containing { orderId, razorpayKeyId, amount } (or order object)
   */
  createPaymentOrderForBill: async (id) => {
    try {
      return await handleResponse(axios.post(`${BASE}/${id}/create-order`));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Create payment order FOR TENANT (public, no auth).
   * POST /bills/:id/create-payment-order-public
   * Use this from tenant-facing pages (TenantBills.jsx).
   */
  createPaymentOrderForBillPublic: async (id) => {
    try {
      return await handleResponse(axios.post(`${BASE}/${id}/create-payment-order-public`));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Create Razorpay Payment Link for a bill (prefilled with UPI)
   * Returns { link, billId, status }
   */
  createPaymentLinkForBill: async (id) => {
    try {
      return await handleResponse(axios.post(`/payments/create-link`, { billId: id }));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Mark bill as paid (admin protected)
   * data e.g. { paymentRef: 'razorpay_payment_id', paidAt: 'ISO date', method: 'razorpay' }
   */
  markPaid: async (id, data = {}) => {
    try {
      return await handleResponse(axios.put(`${BASE}/${id}/pay`, data));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Mark bill as paid (public tenant endpoint)
   * POST /bills/:id/mark-paid-public
   * Use this from tenant-facing flow after successful client-side payment/verification.
   */
  markPaidPublic: async (id, data = {}) => {
    try {
      return await handleResponse(axios.post(`${BASE}/${id}/mark-paid-public`, data));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Delete a bill (admin)
   */
  deleteBill: async (id) => {
    try {
      return await handleResponse(axios.delete(`${BASE}/${id}`));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Resend email/whatsapp notifications for a bill (admin)
   */
  resendBill: async (id) => {
    try {
      return await handleResponse(axios.post(`${BASE}/${id}/send`));
    } catch (err) {
      throw err;
    }
  },

  /**
   * Optional helper: turn a blob into a download in browser (caller can use)
   * Example:
   * const blob = await BillService.getBillPdf(billId);
   * BillService.downloadBlob(blob, `bill_${billId}.pdf`);
   */
  downloadBlob: (blob, filename) => {
    try {
      const file = blob instanceof Blob ? blob : new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "download.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      console.error("downloadBlob error:", err);
      return false;
    }
  },
};

export default BillService;
