import { useEffect, useState } from 'react';
import { Bot, Maximize2, MessageSquare, Mic, Minimize2, Send, X } from 'lucide-react';
import { enviarMensajeChat } from '../lib/api';

const PREGUNTAS_SUGERIDAS = {
  hoy: [
    '¿Por qué el servicio está en este nivel de alerta?',
    '¿Qué significa el rango esperado de pacientes?',
    '¿Cómo se compara la afluencia de hoy con un día normal?',
    '¿Qué factores del modelo influyen más en la predicción?',
  ],
  atascos: [
    '¿Dónde se atasca principalmente el flujo de pacientes?',
    '¿Cuál es la etapa con mayor tiempo de espera?',
    '¿Qué franja horaria registra la mayor saturación?',
    '¿Cuánto tarda en promedio el traslado de urgencias a piso?',
  ],
  simulador: [
    '¿Qué pasa si mañana es día festivo?',
    '¿Cómo afecta el Carnaval de Barranquilla a urgencias?',
    '¿Qué impacto tienen las vacaciones escolares en rehabilitación?',
    '¿Cuánto varía la demanda durante un fin de semana?',
  ],
  precision: [
    '¿Qué tan exacto es el modelo predictivo en este servicio?',
    '¿Qué significa la métrica de error típico WAPE?',
    '¿Por qué la exactitud cambia en fines de semana?',
    '¿Qué porcentaje de las llegadas reales cae dentro del intervalo?',
  ],
};

function resaltarNumeros(texto) {
  return texto.split(/(\*\*[^*]+\*\*|\b\d+(?:[.,]\d+)?%?\b)/g).map((parte, index) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) {
      return (
        <strong key={`b-${index}`} className="font-semibold text-[var(--mf-ink)]">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (/^\d/.test(parte)) {
      return (
        <strong key={`${parte}-${index}`} className="font-mono-num font-semibold text-[var(--mf-ink)]">
          {parte}
        </strong>
      );
    }
    return parte;
  });
}

export function Chatbot({ pantalla, servicio, fecha, prediccion, intervalo, alerta, factores = [] }) {
  const [abierto, setAbierto] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [escucha, setEscucha] = useState(false);
  const [vozDisponible, setVozDisponible] = useState(false);
  const [errorVoz, setErrorVoz] = useState('');

  useEffect(() => {
    setVozDisponible(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    setMensajes([]);
    setMensaje('');
  }, [pantalla, servicio?.id]);

  useEffect(() => {
    if (!abierto) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAbierto(false);
        setExpandido(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [abierto]);

  const estado = {
    pantalla,
    servicio: servicio?.id || servicio?.nombre,
    fecha,
    prediccion,
    intervalo: Array.isArray(intervalo)
      ? intervalo
      : [intervalo?.min, intervalo?.max].filter((valor) => valor != null),
    alerta: alerta?.nivel || alerta?.etiqueta,
    factores: factores.map((factor) => ({ nombre: factor.nombre, aporte: factor.aporte })),
  };

  async function enviarPregunta(pregunta = mensaje) {
    const texto = pregunta.trim();
    if (!texto || cargando) return;
    setMensaje('');
    setMensajes((actuales) => [...actuales, { rol: 'usuario', texto }]);
    setCargando(true);
    try {
      const data = await enviarMensajeChat({ mensaje: texto, estado_pantalla: estado });
      setMensajes((actuales) => [
        ...actuales,
        { rol: 'asistente', texto: data.respuesta || 'No pude interpretar esa pregunta.' },
      ]);
    } catch {
      setMensajes((actuales) => [
        ...actuales,
        {
          rol: 'asistente',
          texto: 'El asistente no está disponible ahora. Revisa el semáforo, el intervalo y los factores visibles en pantalla.',
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function escuchar() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    setErrorVoz('');
    const reconocimiento = new Recognition();
    reconocimiento.lang = 'es-CO';
    reconocimiento.interimResults = true;
    reconocimiento.continuous = false;
    reconocimiento.onstart = () => setEscucha(true);
    reconocimiento.onend = () => setEscucha(false);
    reconocimiento.onerror = (evento) => {
      setEscucha(false);
      const errores = {
        'not-allowed': 'Permite el acceso al micrófono en el navegador para dictar.',
        'service-not-allowed': 'El navegador bloqueó el servicio de reconocimiento de voz.',
        'no-speech': 'No detecté voz. Intenta hablar más cerca del micrófono.',
        'audio-capture': 'No se encontró un micrófono disponible.',
        network: 'El reconocimiento de voz necesita conexión a internet.',
      };
      setErrorVoz(errores[evento.error] || 'No se pudo reconocer la voz. Intenta de nuevo.');
    };
    reconocimiento.onresult = (evento) => {
      const transcripcion = Array.from(evento.results)
        .map((resultado) => resultado[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcripcion) setMensaje(transcripcion);
    };
    try {
      reconocimiento.start();
    } catch {
      setEscucha(false);
      setErrorVoz('No se pudo iniciar el micrófono. Espera un momento e inténtalo otra vez.');
    }
  }

  const sugeridas = PREGUNTAS_SUGERIDAS[pantalla] || PREGUNTAS_SUGERIDAS.hoy;

  return (
    <>
      {abierto && expandido && (
        <div
          className="fixed inset-0 bg-[#08151D]/60 z-[65]"
          onClick={() => setExpandido(false)}
          aria-hidden="true"
        />
      )}

      {abierto && (
        <section
          className={
            expandido
              ? 'fixed inset-3 sm:inset-6 md:inset-10 z-[70] flex flex-col overflow-hidden rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface)] text-[var(--mf-ink)] shadow-lg'
              : 'fixed bottom-5 right-5 z-[60] flex h-[34rem] w-[min(25rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface)] text-[var(--mf-ink)] shadow-lg'
          }
          aria-label="Asistente MediFlow"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--mf-rail-border)] bg-[var(--mf-rail)] px-4 py-3 text-[var(--mf-rail-ink)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <Bot className="h-5 w-5 shrink-0 text-[#4AD2C7]" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">Asistente MediFlow</h2>
                <p className="truncate text-xs text-[var(--mf-rail-muted)]">
                  {servicio?.nombre || 'Hospital Universidad del Norte'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setExpandido((valor) => !valor)}
                aria-label={expandido ? 'Reducir asistente' : 'Expandir asistente'}
                className="rounded-lg p-1.5 text-[var(--mf-rail-muted)] hover:bg-[var(--mf-rail-hover)] hover:text-white transition-colors cursor-pointer"
              >
                {expandido ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setExpandido(false);
                }}
                aria-label="Cerrar asistente"
                className="rounded-lg p-1.5 text-[var(--mf-rail-muted)] hover:bg-[var(--mf-rail-hover)] hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div
            className={
              expandido
                ? 'mx-auto flex-1 min-h-0 w-full max-w-3xl overflow-y-auto p-6 space-y-4 text-sm'
                : 'flex-1 min-h-0 overflow-y-auto p-4 space-y-3 text-sm'
            }
          >
            {!mensajes.length && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center gap-2 pt-2 text-center">
                  <Bot className="h-7 w-7 text-[var(--mf-accent)]" aria-hidden="true" />
                  <p className="text-xs font-medium text-[var(--mf-ink-2)]">
                    Consultas contextuales sobre esta vista:
                  </p>
                </div>
                <div className="mf-subsurface divide-y divide-[var(--mf-border)] overflow-hidden">
                  {sugeridas.map((pregunta) => (
                    <button
                      key={pregunta}
                      type="button"
                      onClick={() => enviarPregunta(pregunta)}
                      className="block w-full px-3.5 py-2.5 text-left text-xs font-medium text-[var(--mf-ink)] hover:bg-[var(--mf-accent-soft)] hover:text-[var(--mf-accent-ink)] transition-colors cursor-pointer"
                    >
                      {pregunta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensajes.map((item, index) => (
              <div
                key={`${item.rol}-${index}`}
                className={
                  item.rol === 'usuario'
                    ? 'ml-6 rounded-lg bg-[var(--mf-accent-soft)] px-3.5 py-2.5 text-sm text-[var(--mf-accent-ink)]'
                    : 'mr-3 rounded-lg bg-[var(--mf-surface-2)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--mf-ink)]'
                }
              >
                {item.rol === 'asistente' ? resaltarNumeros(item.texto) : item.texto}
              </div>
            ))}

            {cargando && (
              <p role="status" className="text-xs text-[var(--mf-ink-3)]">
                Analizando contexto clínico…
              </p>
            )}
          </div>

          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              enviarPregunta();
            }}
            className={
              expandido
                ? 'mx-auto flex w-full max-w-3xl items-center gap-2.5 border-t border-[var(--mf-border)] bg-[var(--mf-surface)] p-4'
                : 'flex items-center gap-2 border-t border-[var(--mf-border)] bg-[var(--mf-surface)] p-3'
            }
          >
            <input
              value={mensaje}
              onChange={(evento) => setMensaje(evento.target.value)}
              placeholder="Escribe una pregunta…"
              className="mf-input min-w-0 flex-1"
              aria-label="Pregunta al asistente"
            />
            {vozDisponible && (
              <button
                type="button"
                onClick={escuchar}
                aria-label={escucha ? 'Escuchando' : 'Dictar pregunta'}
                title={escucha ? 'Escuchando… habla ahora' : 'Dictar pregunta'}
                className={
                  escucha
                    ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border mf-badge-warn cursor-pointer'
                    : 'mf-btn-secondary shrink-0 px-2.5'
                }
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              aria-label="Enviar pregunta"
              className="mf-btn-primary shrink-0 px-3"
              disabled={cargando}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          {vozDisponible && (escucha || errorVoz) && (
            <p
              role={errorVoz ? 'alert' : 'status'}
              className={`px-3.5 pb-2.5 text-xs ${
                errorVoz ? 'text-[var(--mf-crit)]' : 'text-[var(--mf-ink-2)]'
              }`}
            >
              {errorVoz || 'Escuchando… habla ahora.'}
            </p>
          )}
        </section>
      )}

      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir Asistente MediFlow"
          className="fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-[var(--mf-accent)] hover:bg-[var(--mf-accent-hover)] px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors cursor-pointer"
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Asistente MediFlow</span>
        </button>
      )}
    </>
  );
}
