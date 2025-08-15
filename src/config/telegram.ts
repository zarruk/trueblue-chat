// Configuración del Bot de Telegram
export const TELEGRAM_CONFIG = {
  // Token del bot proporcionado por el usuario
  BOT_TOKEN: '7972539148:AAE8OA2qV75zKLNFUbW6Kflfp0NJctTqFSU',
  
  // URL del bot
  BOT_URL: 'https://t.me/Pruebas_TrueBlue_aztec_bot',
  
  // URL base de la API de Telegram
  API_BASE_URL: 'https://api.telegram.org',
  
  // Función para obtener la URL completa de la API
  getApiUrl: (method: string) => `${TELEGRAM_CONFIG.API_BASE_URL}/bot${TELEGRAM_CONFIG.BOT_TOKEN}/${method}`,
  
  // Métodos disponibles
  METHODS: {
    SEND_MESSAGE: 'sendMessage',
    GET_UPDATES: 'getUpdates',
    GET_ME: 'getMe'
  }
} as const;

// Tipos para las respuestas de Telegram
export interface TelegramResponse<T = any> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramErrorResponse {
  ok: false;
  error_code: number;
  description: string;
}

export interface TelegramSuccessResponse<T> {
  ok: true;
  result: T;
}

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    first_name: string;
    username?: string;
    type: string;
  };
  date: number;
  text: string;
}

// Función helper para enviar mensajes
export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramResponse<TelegramMessage>> {
  const response = await fetch(TELEGRAM_CONFIG.getApiUrl(TELEGRAM_CONFIG.METHODS.SEND_MESSAGE), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }),
  });

  return response.json();
}
