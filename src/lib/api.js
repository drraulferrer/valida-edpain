// ---------------------------------------------------------------------------
// La única puerta a los datos. Todo pasa por funciones RPC `valida_*` que reciben la
// clave del panelista (ver supabase/schema.sql). Con VITE_DEMO=1 no hay red: `demo.js`
// implementa las mismas funciones en memoria, con conceptos de muestra.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js'

export const DEMO = import.meta.env.VITE_DEMO === '1'
const URL = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

let cliente = null
let demo = null

export class ErrorApi extends Error {
  constructor(mensaje, codigo) {
    super(mensaje)
    this.codigo = codigo
  }
}

// 28000 no se traduce aquí: el servidor distingue entre una clave y un código de invitación,
// y sobrescribirlo con un solo texto confundía los dos casos.
const MENSAJES = {
  '42501': 'No tienes acceso a eso.',
  '22023': 'Los datos no son válidos.',
  PGRST301: 'No se pudo conectar. Comprueba la conexión e inténtalo de nuevo.',
}

export async function rpc(nombre, params = {}) {
  if (DEMO) {
    if (!demo) demo = (await import('./demo.js')).crearDemo()
    return demo.rpc(nombre, params)
  }
  if (!cliente) {
    if (!URL || !ANON) throw new ErrorApi('Falta la configuración de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).', 'config')
    cliente = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  const { data, error } = await cliente.rpc(nombre, params)
  if (error) {
    const texto = MENSAJES[error.code] || error.message || 'Error desconocido'
    throw new ErrorApi(texto, error.code)
  }
  return data
}

// --- sesión del panelista (clave en localStorage) -----------------------------

const CLAVE = 'valida.clave'
const DIRECCION = 'valida.direccion'

export function claveGuardada() {
  try { return localStorage.getItem(CLAVE) || '' } catch { return '' }
}
export function guardarClave(clave) {
  try { clave ? localStorage.setItem(CLAVE, clave) : localStorage.removeItem(CLAVE) } catch { /* privado */ }
}
export function claveDireccion() {
  try { return sessionStorage.getItem(DIRECCION) || '' } catch { return '' }
}
export function guardarClaveDireccion(clave) {
  try { clave ? sessionStorage.setItem(DIRECCION, clave) : sessionStorage.removeItem(DIRECCION) } catch { /* privado */ }
}

export function normalizarClave(texto) {
  const limpio = (texto || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (limpio.length !== 12) return (texto || '').trim()
  return `${limpio.slice(0, 4)}-${limpio.slice(4, 8)}-${limpio.slice(8, 12)}`
}

// --- público (sin clave) ---------------------------------------------------------

export const publico = (estudio = 1) => rpc('valida_publico', { estudio })
export const solicitar = (estudio, codigo_invitacion, disciplina, anios, dominios, perfil, perfil_solicitado = 'experto') =>
  rpc('valida_solicitar', { estudio, codigo_invitacion, disciplina, anios, dominios, perfil, perfil_solicitado })

// --- panelista ---------------------------------------------------------------

export const entrar = (clave) => rpc('valida_entrar', { clave })
export const guardarPerfil = (clave, disciplina, anios, dominios, perfil = {}) =>
  rpc('valida_perfil', { clave, disciplina, anios, dominios, perfil })
export const calibracion = (clave) => rpc('valida_calibracion', { clave })
export const calibracionHecha = (clave) => rpc('valida_calibracion_hecha', { clave })
export const bloque = (clave) => rpc('valida_bloque', { clave })
export const modulo = (clave, modulo) => rpc('valida_modulo', { clave, modulo })
export const concepto = (clave, concepto_id) => rpc('valida_concepto', { clave, concepto_id })
export const guardar = (clave, concepto_id, datos) => rpc('valida_guardar', { clave, concepto_id, datos })
export const cobertura = (clave, modulo, exhaustividad, falta, sobra) =>
  rpc('valida_cobertura', { clave, modulo, exhaustividad, falta, sobra })
export const evento = (clave, tipo, detalle) => rpc('valida_evento', { clave, tipo, detalle }).catch(() => {})

// --- dirección ----------------------------------------------------------------

export const dirDatos = (clave) => rpc('valida_dir_datos', { clave })
export const dirConcepto = (clave, concepto_id) => rpc('valida_dir_concepto', { clave, concepto_id })
export const dirAlta = (clave, codigo, perfil, disciplina, dominios, capacidad, notas, es_prueba = false, identidad = {}) =>
  rpc('valida_dir_alta', { clave, codigo, perfil, disciplina, dominios, capacidad, notas, es_prueba,
    email: identidad.email || null, nombre: identidad.nombre || null, apellidos: identidad.apellidos || null })
export const dirReclave = (clave, codigo) => rpc('valida_dir_reclave', { clave, codigo })
export const dirPanelista = (clave, codigo, datos) => rpc('valida_dir_panelista', { clave, codigo, datos })
export const dirAsignar = (clave, perfil_objetivo, max_generalistas = 3) =>
  rpc('valida_dir_asignar', { clave, perfil_objetivo, max_generalistas })
export const dirRonda = (clave, conceptos) => rpc('valida_dir_ronda', { clave, conceptos })
export const dirCerrar = (clave) => rpc('valida_dir_cerrar', { clave })
export const dirEstudio = (clave, datos) => rpc('valida_dir_estudio', { clave, datos })
export const dirPropuesta = (clave, valoracion_id, indice, estado, nota) =>
  rpc('valida_dir_propuesta', { clave, valoracion_id, indice, estado, nota })
export const dirCalibracion = (clave, items) => rpc('valida_dir_calibracion', { clave, items })
export const dirIdentidades = (clave) => rpc('valida_dir_identidades', { clave })
export const dirBorrarPrueba = (clave, codigo) => rpc('valida_dir_borrar_prueba', { clave, codigo })
export const dirAvisos = (clave) => rpc('valida_dir_avisos', { clave })
export const dirMarcarAvisos = (clave, codigos, tipo) => rpc('valida_dir_marcar_avisos', { clave, codigos, tipo })
export const dirPlazo = (clave, codigo, dias, motivo) => rpc('valida_dir_plazo', { clave, codigo, dias, motivo })
export const dirRondaFechas = (clave, ronda, abre_en, cierra_en, notas) =>
  rpc('valida_dir_ronda_fechas', { clave, ronda, abre_en, cierra_en, notas })
