import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface ResultadoConsumidor {
  tipo: string; cuentaId?: string; intentId?: string; runId?: string;
  inicio: number; fin?: number; lecturas?: number; cancelado?: boolean; error?: string;
  operaciones?: Array<{ nombre: string; inicio: number; fin: number; duracionMs: number }>;
}

export async function iniciarConsumidor() {
  const hijo = fork(fileURLToPath(new URL('../../../backend/tests/e2e/consumidor-stripe.cjs', import.meta.url)), [], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  let resultado: ResultadoConsumidor | undefined;
  let codigo: number | null = null;
  const salida = new Promise<void>(resolve => hijo.once('exit', code => { codigo = code; resolve(); }));
  hijo.on('message', (m: ResultadoConsumidor) => { if (m.tipo === 'fin') resultado = m; });
  const detener = async () => {
    if (hijo.connected) hijo.send('detener');
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([salida, new Promise<never>((_, reject) => {
        temporizador = setTimeout(() => { hijo.kill(); reject(new Error('Consumidor: cierre fuera de plazo')); }, 40000);
      })]);
    } finally { clearTimeout(temporizador); }
    return { ...resultado, codigo };
  };
  try {
    const listo = await new Promise<ResultadoConsumidor>((resolve, reject) => {
      const temporizador = setTimeout(() => reject(new Error('Consumidor: arranque fuera de plazo')), 40000);
      hijo.on('message', (m: ResultadoConsumidor) => {
        if (m.tipo === 'listo') { clearTimeout(temporizador); resolve(m); }
        if (m.tipo === 'fin') { clearTimeout(temporizador); reject(new Error(`Consumidor: ${m.error || 'terminó antes de iniciar'}`)); }
      });
      hijo.once('error', () => { clearTimeout(temporizador); reject(new Error('No se pudo iniciar el consumidor')); });
      hijo.once('exit', () => { clearTimeout(temporizador); reject(new Error('Consumidor cerrado antes de estar listo')); });
    });
    return { listo, detener };
  } catch (error) { await detener(); throw error; }
}
