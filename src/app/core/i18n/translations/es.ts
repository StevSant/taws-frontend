import { TranslationDict } from '../translation-dict.model';

/** Spanish dictionary — default locale. Keep this the natural, primary copy. */
export const ES_TRANSLATIONS = {
  'shell.title': 'TAWS · Radar de Mercado',
  'shell.nav.radar': 'Radar',
  'shell.nav.chat': 'Chat',
  'shell.nav.scenarios': 'Laboratorio de Escenarios',
  'shell.nav.briefings': 'Briefings',
  'shell.language.es': 'ES',
  'shell.language.en': 'EN',
  'shell.language.toggleLabel': 'Cambiar idioma',
  'shell.auth.login': 'Iniciar sesión',
  'shell.auth.logout': 'Cerrar sesión',
  'auth.login.title': 'Iniciar sesión',
  'auth.signup.title': 'Crear una cuenta',
  'auth.email.label': 'Correo electrónico',
  'auth.password.label': 'Contraseña',
  'auth.submit.login': 'Iniciar sesión',
  'auth.submit.signup': 'Registrarme',
  'auth.submitting': 'Procesando…',
  'auth.toggle.toSignup': '¿No tienes cuenta? Regístrate',
  'auth.toggle.toLogin': '¿Ya tienes cuenta? Inicia sesión',
  'auth.confirmation.required':
    'Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.',
  'chat.placeholder': 'Escribe un mensaje…',
  'chat.send': 'Enviar',
  'chat.streaming': 'Generando respuesta…',
  'chat.role.user': 'Tú',
  'chat.role.assistant': 'Asistente',
  'chat.trace.title': 'Ruta de agentes',
  'chat.trace.routing': 'enrutando',
  'chat.trace.start': 'iniciado',
  'chat.trace.done': 'completado',
  'chat.error.banner': 'Ocurrió un error: ',
  'radar.title': 'Radar de Noticias y Señales',
  'radar.description':
    'Feed en vivo de noticias financieras vinculadas a instrumentos de distintas clases de activos, con clasificación de impacto (positivo/negativo/neutral/incierto), nivel de confianza y evidencia de movimiento de precio. Próximamente: filtros por tipo de instrumento, activo y antigüedad.',
  'scenarios.title': 'Laboratorio de Escenarios',
  'scenarios.description':
    '"¿Qué pasa si ocurre X?" Simula eventos de mercado (subas de tasas, resultados corporativos, shocks macro) y obtén cadenas causales, impacto cuantificado por clase de activo y recomendaciones respaldadas por evidencia. Próximamente: escenarios preconfigurados, formulario libre y mapa de calor de impacto.',
  'briefings.title': 'Briefings',
  'briefings.description':
    'Resúmenes por watchlist que puedes marcar como revisado, escalado o descartado, siempre con fuentes, evidencia y el recordatorio de que esto no es asesoría personalizada. Nunca ejecutamos operaciones. Próximamente: briefings on-demand y programados, con historial de revisión.',
  'placeholder.badge': 'Próximamente',
} satisfies TranslationDict;
