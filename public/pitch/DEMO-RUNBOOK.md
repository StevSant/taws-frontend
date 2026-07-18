# Demo de Midas — 4 minutos

## Preparación (antes de subir al escenario)

1. Abrir `https://taws-frontend.vercel.app/login` e ingresar como **Analista — Sofía Reyes**.
2. Dejar abiertas estas pestañas:
   - Radar: `https://taws-frontend.vercel.app/radar`
   - Chat: `https://taws-frontend.vercel.app/chat`
   - Escenarios: `https://taws-frontend.vercel.app/scenarios`
   - Respaldo offline: `/pitch/demo-backup.html`
3. En Chat, dejar seleccionada una conversación guardada que tenga gráfico o fuentes.
4. En Escenarios, abrir previamente un resultado persistido. No generar el escenario por primera vez en vivo.
5. Tener Telegram abierto en el teléfono con una alerta real o preparada.

## Recorrido principal

### 0:00–0:45 — Radar

Narración:

> “Midas vigila el mercado antes de que yo formule una pregunta. Aquí veo qué se mueve, el contexto macro y las alertas relacionadas con mi lista.”

Mostrar:

- Ventana `48h`.
- Contexto de mercado.
- Un instrumento seguido.
- Campana de alertas.

No mostrar:

- Un indicador con valores incoherentes.
- Una noticia cuyo instrumento relacionado no sea evidente.

### 0:45–1:45 — Chat con evidencia

Usar primero una conversación guardada.

Prompt alternativo si el backend está estable:

> “Muéstrame el movimiento y la volatilidad de BTC en los últimos 30 días. Incluye un gráfico, fuentes y los riesgos que debería vigilar.”

Señalar:

- Respuesta en streaming.
- Especialista elegido por el Supervisor.
- Gráfico.
- Confianza y fuentes.
- Aviso de que Midas no ejecuta operaciones.

### 1:45–2:50 — Scenario Lab

Abrir un resultado persistido sobre tasas o Bitcoin.

Narración:

> “Midas no solo explica qué pasó. Permite ensayar qué podría ocurrir y separa datos actuales, análogos históricos y razonamiento.”

Señalar:

- Cadena causal.
- Impacto por activo.
- Confianza.
- Perspectivas de los especialistas.
- Acción de monitorear el escenario, solo si ya está configurada.

### 2:50–3:30 — Briefing y decisión humana

Mostrar un informe existente y su flujo de revisión.

Narración:

> “La salida no es una orden de compra. Es un informe que una persona puede revisar, escalar o descartar con justificación.”

### 3:30–4:00 — Telegram

Mostrar una alerta ya recibida.

Narración:

> “La inteligencia no se queda en el dashboard. Cuando algo relevante cambia, Midas llega a donde ya estás.”

## Fallbacks

- **Radar sin datos:** usar la captura incluida en el pitch.
- **Chat lento:** abrir la conversación guardada; no esperar una respuesta nueva.
- **Scenario Lab lento:** abrir un resultado persistido.
- **Backend o internet caído:** abrir `/pitch/demo-backup.html` y narrar sobre la secuencia automática.
- **Telegram sin conexión:** mostrar una captura preparada, sin fingir que la alerta llegó en ese instante.

## Cierre de demo

> “Midas no promete predecir el mercado. Hace que cada decisión llegue con contexto, evidencia y una persona en control.”
