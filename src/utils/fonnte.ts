/**
 * Fonnte WhatsApp API Client & Simulator
 * Docs: https://docs.fonnte.com/
 */

export interface FonnteSendParams {
  target: string;
  message: string;
  token?: string;
  isTestMode?: boolean;
}

export interface FonnteResponse {
  status: boolean;
  message: string;
  detail?: string;
  isSimulated: boolean;
  targetFormatted: string;
  directWaLink: string;
}

/**
 * Standardize Indonesian phone numbers to international format (628...)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

/**
 * Send WhatsApp notification via Fonnte or return simulated preview
 */
export async function sendWhatsAppNotification(params: FonnteSendParams): Promise<FonnteResponse> {
  const { target, message, token, isTestMode = false } = params;
  const formattedPhone = formatPhoneNumber(target);
  const directWaLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

  // If in test mode or token is empty, simulate
  if (isTestMode || !token || token.trim() === '' || token.includes('TOKEN_ANDA')) {
    console.log(`[Fonnte Simulator] WhatsApp to ${formattedPhone}:\n${message}`);
    return {
      status: true,
      message: 'Berhasil dikirim (Mode Simulasi)',
      detail: 'Pesan berhasil diformat dan disimulasikan tanpa kuota Fonnte.',
      isSimulated: true,
      targetFormatted: formattedPhone,
      directWaLink,
    };
  }

  // Real Fonnte API call
  try {
    const formData = new FormData();
    formData.append('target', formattedPhone);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token.trim(),
      },
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.status) {
      return {
        status: true,
        message: 'WhatsApp terkirim via Fonnte!',
        detail: JSON.stringify(data),
        isSimulated: false,
        targetFormatted: formattedPhone,
        directWaLink,
      };
    } else {
      return {
        status: false,
        message: data.reason || data.message || 'Gagal mengirim WhatsApp via Fonnte',
        detail: JSON.stringify(data),
        isSimulated: false,
        targetFormatted: formattedPhone,
        directWaLink,
      };
    }
  } catch (error) {
    console.warn('Fonnte request failed, falling back to simulated:', error);
    return {
      status: true,
      message: 'Tercatat (Koneksi Fonnte dialihkan ke simulasi)',
      detail: (error as Error).message,
      isSimulated: true,
      targetFormatted: formattedPhone,
      directWaLink,
    };
  }
}
