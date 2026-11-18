import { useEffect, useState } from 'react';
import { Bot, Maximize2, Mic, Minimize2, Send, X } from 'lucide-react';
import { apiUrl } from '../lib/api';

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
      const respuesta = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, estado_pantalla: estado }),
      });
      if (!respuesta.ok) throw new Error('chat no disponible');
      const data = await respuesta.json();
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

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {abierto && (
        <section className={`${expandido ? 'h-[min(34rem,calc(100vh-7rem))] w-[min(38rem,calc(100vw-2rem))]' : 'w-[min(22rem,calc(100vw-2rem))]'} flex flex-col overflow-hidden rounded-2xl border border-[#B7CBD6] bg-white shadow-2xl dark:border-[#19506B] dark:bg-[#0E3E5B]`} aria-label="Asistente HUN">
          <header className="flex items-center justify-between bg-[#102A43] px-4 py-3 text-[#F7FAFC]">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#B9E2F0]" /><span className="font-bold">Asistente HUN</span></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setExpandido((valor) => !valor)} aria-label={expandido ? 'Reducir asistente' : 'Expandir asistente'} className="rounded-md p-1 hover:bg-white/10">
                {expandido ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="rounded-md p-1 hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
          </header>
          <div className={`${expandido ? 'min-h-0 flex-1' : 'max-h-72'} space-y-3 overflow-y-auto p-3 text-sm`}>
            {!mensajes.length && <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-6 text-center text-[#46657A] dark:text-[#B9D4DF]"><Bot className="h-7 w-7 text-[#2C7A9B]" /><p>Escribe una pregunta para empezar.</p></div>}
            {mensajes.map((item, index) => <div key={`${item.rol}-${index}`} className={item.rol === 'usuario' ? 'ml-6 rounded-lg bg-[#E8F6FA] p-2.5 text-[#0C4A62] dark:bg-[#0E3E5B] dark:text-[#D8EFF7]' : 'mr-3 rounded-lg bg-[#F7FAFC] p-2.5 text-[#294B63] ring-1 ring-inset ring-[#D1DEE7] dark:bg-[#071B2A] dark:text-[#D8EFF7] dark:ring-[#19506B]'}>{item.rol === 'asistente' ? resaltarNumeros(item.texto) : item.texto}</div>)}
            {cargando && <p className="text-xs text-[#46657A]">Analizando…</p>}
          </div>
          <form onSubmit={(evento) => { evento.preventDefault(); enviarPregunta(); }} className="flex items-center gap-2 border-t border-[#D1DEE7] p-3 dark:border-[#19506B]">
            <input value={mensaje} onChange={(evento) => setMensaje(evento.target.value)} placeholder="Escribe una pregunta…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#7990A0]" aria-label="Pregunta al asistente" />
            {vozDisponible && <button type="button" onClick={escuchar} aria-label={escucha ? 'Escuchando' : 'Dictar pregunta'} title={escucha ? 'Escuchando… habla ahora' : 'Dictar pregunta'} className={`rounded-md p-2 ${escucha ? 'bg-[#F0C86A] text-[#102A43]' : 'text-[#14516B] hover:bg-[#E8F6FA]'}`}><Mic className="h-4 w-4" /></button>}
            <button type="submit" aria-label="Enviar pregunta" className="rounded-md bg-[#102A43] p-2 text-white hover:bg-[#14516B]"><Send className="h-4 w-4" /></button>
          </form>
          {vozDisponible && (escucha || errorVoz) && <p role={errorVoz ? 'alert' : 'status'} className={`px-3 pb-2 text-xs ${errorVoz ? 'text-red-700 dark:text-red-300' : 'text-[#46657A] dark:text-[#B9D4DF]'}`}>{errorVoz || 'Escuchando… habla ahora.'}</p>}
        </section>
      )}
      {!abierto && <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir asistente HUN" className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#102A43] p-2 shadow-xl ring-2 ring-[#71B5CC] transition-transform hover:scale-105 dark:border-[#0E3E5B]"><img src="/logo-hospital-universidad-del-norte-light.png" alt="" className="h-full w-full object-contain" /></button>}
    </div>
  );
}
