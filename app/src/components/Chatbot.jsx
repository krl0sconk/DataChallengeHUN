import { useEffect, useState } from 'react';
import { Bot, Maximize2, Mic, Minimize2, Send, X } from 'lucide-react';
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
  return texto.split(/(\b\d+(?:[.,]\d+)?%?\b)/g).map((parte, index) => (
    /^\d/.test(parte)
      ? <strong key={`${parte}-${index}`} className="font-bold text-[#0F2942] dark:text-[#D8EFF7]">{parte}</strong>
      : parte
  ));
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

  const estado = {
    pantalla,
    servicio: servicio?.id || servicio?.nombre,
    fecha,
    prediccion,
    intervalo: Array.isArray(intervalo) ? intervalo : [intervalo?.min, intervalo?.max].filter((valor) => valor != null),
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
      setMensajes((actuales) => [...actuales, { rol: 'asistente', texto: data.respuesta || 'No pude interpretar esa pregunta.' }]);
    } catch {
      setMensajes((actuales) => [...actuales, { rol: 'asistente', texto: 'El asistente no está disponible ahora. Revisa el semáforo, el intervalo y los factores visibles en pantalla.' }]);
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
        'network': 'El reconocimiento de voz necesita conexión a internet.',
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
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[65]"
          onClick={() => setExpandido(false)}
          aria-hidden="true"
        />
      )}

      {abierto && (
        <section
          className={
            expandido
              ? 'fixed inset-2 sm:inset-4 md:inset-8 z-[70] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden'
              : 'w-[min(24rem,calc(100vw-2rem))] h-[32rem] fixed bottom-5 right-5 z-[60] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900'
          }
          aria-label="Asistente HUN"
        >
          <header className="flex items-center justify-between bg-[#102A43] px-4 py-3 text-[#F7FAFC] shrink-0">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#B9E2F0]" /><span className="font-bold">Asistente HUN</span></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setExpandido((valor) => !valor)} aria-label={expandido ? 'Reducir asistente' : 'Expandir asistente'} className="rounded-md p-1 hover:bg-white/10">
                {expandido ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => { setAbierto(false); setExpandido(false); }} aria-label="Cerrar asistente" className="rounded-md p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className={expandido ? 'flex-1 min-h-0 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-4 text-sm' : 'flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 text-sm'}>
            {!mensajes.length && (
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center gap-1.5 pt-2 text-center text-slate-600 dark:text-slate-300">
                  <Bot className="h-7 w-7 text-sky-600 dark:text-sky-400" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Preguntas sugeridas para esta vista:
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  {sugeridas.map((pregunta) => (
                    <button
                      key={pregunta}
                      type="button"
                      onClick={() => enviarPregunta(pregunta)}
                      className="text-left text-xs font-medium p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
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
                    ? 'ml-6 rounded-lg bg-[#E8F6FA] p-2.5 text-[#0C4A62] dark:bg-[#0E3E5B] dark:text-[#D8EFF7]'
                    : 'mr-3 rounded-lg bg-[#F7FAFC] p-2.5 text-[#294B63] ring-1 ring-inset ring-[#D1DEE7] dark:bg-[#071B2A] dark:text-[#D8EFF7] dark:ring-[#19506B]'
                }
              >
                {item.rol === 'asistente' ? resaltarNumeros(item.texto) : item.texto}
              </div>
            ))}
            {cargando && <p className="text-xs text-slate-500 dark:text-slate-400">Analizando…</p>}
          </div>

          <form
            onSubmit={(evento) => { evento.preventDefault(); enviarPregunta(); }}
            className={
              expandido
                ? 'p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 flex items-center gap-3 max-w-3xl mx-auto w-full'
                : 'flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 p-3'
            }
          >
            <input value={mensaje} onChange={(evento) => setMensaje(evento.target.value)} placeholder="Escribe una pregunta…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white" aria-label="Pregunta al asistente" />
            {vozDisponible && <button type="button" onClick={escuchar} aria-label={escucha ? 'Escuchando' : 'Dictar pregunta'} title={escucha ? 'Escuchando… habla ahora' : 'Dictar pregunta'} className={`rounded-md p-2 ${escucha ? 'bg-[#F0C86A] text-[#102A43]' : 'text-[#14516B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Mic className="h-4 w-4" /></button>}
            <button type="submit" aria-label="Enviar pregunta" className="rounded-md bg-[#102A43] p-2 text-white hover:bg-[#14516B]"><Send className="h-4 w-4" /></button>
          </form>
          {vozDisponible && (escucha || errorVoz) && <p role={errorVoz ? 'alert' : 'status'} className={`px-3 pb-2 text-xs ${errorVoz ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`}>{errorVoz || 'Escuchando… habla ahora.'}</p>}
        </section>
      )}

      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente HUN"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#102A43] p-2 shadow-xl ring-2 ring-[#71B5CC] transition-transform hover:scale-105 dark:border-[#0E3E5B]"
        >
          <img src="/logo-hospital-universidad-del-norte-light.png" alt="" className="h-full w-full object-contain" />
        </button>
      )}
    </>
  );
}
