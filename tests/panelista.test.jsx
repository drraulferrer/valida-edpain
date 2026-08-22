import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { crearDemo, CLAVES_DEMO } from '../src/lib/demo.js'

// El título del primer concepto de la demo: el paciente NO debe verlo en ninguna parte.
const DEMO_TITULO_TECNICO = 'El dolor es una experiencia, no una medida del daño en los tejidos'

// La api real se sustituye por el backend de demostración en memoria: mismas funciones,
// mismos errores, sin red. Cada test arranca con una demo nueva.
let demo
vi.mock('../src/lib/api.js', async () => {
  const real = await vi.importActual('../src/lib/api.js')
  const via = (nombre) => (...args) => demo.rpc(nombre, argsA(nombre, args))
  const argsA = (nombre, a) => ({
    valida_entrar: { clave: a[0] },
    valida_perfil: { clave: a[0], disciplina: a[1], anios: a[2], dominios: a[3], perfil: a[4] },
    valida_calibracion: { clave: a[0] },
    valida_calibracion_hecha: { clave: a[0] },
    valida_bloque: { clave: a[0] },
    valida_modulo: { clave: a[0], modulo: a[1] },
    valida_concepto: { clave: a[0], concepto_id: a[1] },
    valida_guardar: { clave: a[0], concepto_id: a[1], datos: a[2] },
    valida_cobertura: { clave: a[0], modulo: a[1], exhaustividad: a[2], falta: a[3], sobra: a[4] },
    valida_evento: { clave: a[0], tipo: a[1], detalle: a[2] },
    valida_publico: { estudio: a[0] },
    valida_solicitar: { estudio: a[0], codigo_invitacion: a[1], disciplina: a[2], anios: a[3], dominios: a[4], perfil: a[5], perfil_solicitado: a[6] },
  })[nombre]
  let guardada = ''
  return {
    ...real,
    DEMO: true,
    entrar: via('valida_entrar'), guardarPerfil: via('valida_perfil'), calibracion: via('valida_calibracion'),
    calibracionHecha: via('valida_calibracion_hecha'), bloque: via('valida_bloque'), modulo: via('valida_modulo'), concepto: via('valida_concepto'),
    guardar: via('valida_guardar'), cobertura: via('valida_cobertura'), evento: via('valida_evento'),
    publico: via('valida_publico'), solicitar: via('valida_solicitar'),
    claveGuardada: () => guardada, guardarClave: (c) => { guardada = c || '' },
  }
})

import App from '../src/App.jsx'
import * as api from '../src/lib/api.js'

beforeEach(() => { cleanup(); demo = crearDemo(); api.guardarClave(''); window.location.hash = '#/'; window.scrollTo = () => {} })

// Al paciente solo se le pide el correo: ni nombre ni apellidos.
const rellenarCorreoPaciente = (email = 'dolor@ejemplo.org') => {
  fireEvent.change(screen.getByLabelText('Correo de contacto'), { target: { value: email } })
}

const rellenarIdentidad = (email = 'ana@ejemplo.org') => {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Ruiz Gil' } })
  fireEvent.change(screen.getByLabelText('Correo de contacto'), { target: { value: email } })
}

const entrarComo = async (clave) => {
  render(<App />)
  const input = await screen.findByPlaceholderText('xxxx-xxxx-xxxx')
  fireEvent.change(input, { target: { value: clave } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('entrada', () => {
  it('rechaza una clave que no existe', async () => {
    await entrarComo('zzzz-zzzz-zzzz')
    expect((await screen.findByRole('alert')).textContent).toMatch(/válida/)
  })
  it('un experto nuevo pasa por el perfil, y sin consentimiento no sigue', async () => {
    await entrarComo(CLAVES_DEMO.experto)
    expect(await screen.findByText('Tu perfil como panelista')).toBeTruthy()
    rellenarIdentidad()
    fireEvent.change(screen.getByLabelText('Disciplina principal'), { target: { value: 'fisioterapia' } })
    fireEvent.change(screen.getByLabelText('Titulación académica máxima'), { target: { value: 'master' } })
    fireEvent.click(screen.getByLabelText('Docencia', { selector: 'input[type="checkbox"]' }))
    fireEvent.change(screen.getByLabelText(/Años de experiencia en dolor/), { target: { value: '3' } })
    fireEvent.click(screen.getByLabelText(/Intermedio: lo aplico/))
    fireEvent.click(await screen.findByLabelText(/Neurobiología y mecanismos/))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    expect((await screen.findAllByRole('alert'))[0].textContent).toMatch(/consentimiento|aceptar/)
    expect(demo._estado.panelistas[0].perfil_completado).toBe(false)
  })
})

describe('flujo del experto', () => {
  it('perfil → instrucciones → calibración → bloque', async () => {
    await entrarComo(CLAVES_DEMO.experto)
    await screen.findByText('Tu perfil como panelista')
    rellenarIdentidad()
    fireEvent.change(screen.getByLabelText('Disciplina principal'), { target: { value: 'fisioterapia' } })
    fireEvent.change(screen.getByLabelText('Titulación académica máxima'), { target: { value: 'doctorado' } })
    fireEvent.click(screen.getByLabelText('Asistencial', { selector: 'input[type="checkbox"]' }))
    fireEvent.change(screen.getByLabelText(/Años de experiencia en dolor/), { target: { value: '12' } })
    fireEvent.click(screen.getByLabelText(/Avanzado: lo enseño/))
    const casilla = await screen.findByLabelText(/Fundamentos del dolor/)
    fireEvent.click(casilla)
    fireEvent.click(screen.getByLabelText(/He leído la información, he podido preguntar/))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    expect(await screen.findByText('Cuatro afirmaciones por concepto')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Practicar con dos conceptos' }))
    expect(await screen.findByText(/Práctica · 1 de 2/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Saltar la práctica' }))
    expect(await screen.findByText(/conceptos en/)).toBeTruthy()
    expect(demo._estado.panelistas[0].calibracion_hecha).toBe(true)
  })

  it('el wizard exige ajuste con un 2 y guarda la valoración', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('link', { name: 'Empezar' }))
    expect(await screen.findByRole('button', { name: 'He leído: puntuar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'He leído: puntuar' }))
    const grupos = await screen.findAllByRole('radiogroup')
    expect(grupos.length).toBe(3)
    // 4, 2, 4 → la claridad en 2 obliga a ajustar
    const valores = [4, 2, 4]
    grupos.forEach((g, i) => fireEvent.click(g.querySelectorAll('button')[valores[i] - 1]))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(await screen.findByText(/Has puntuado 1 o 2/)).toBeTruthy()
    const seguir = screen.getByRole('button', { name: 'Seguir' })
    expect(seguir.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Sobre qué parte'), { target: { value: 'definicion' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'ambiguedad' } })
    fireEvent.change(screen.getByLabelText(/Redacción alternativa/), { target: { value: 'Mi redacción.' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Seguir' }).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    expect(await screen.findByText('Tus puntuaciones')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const v = demo._estado.valoraciones.find((x) => x.panelista_id === 1 && x.concepto_id === 'DEMO-00001')
      expect(v?.completa).toBe(true)
      expect(v.puntuaciones).toEqual({ relevancia: 4, claridad: 2, representatividad: 4 })
      expect(v.ajustes[0].redaccion).toBe('Mi redacción.')
    })
    expect(window.location.hash).toBe('#/c/DEMO-00002')
  })

  it('la abstención no exige puntuar y deja el estado abstenida', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    window.location.hash = '#/c/DEMO-00003'
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('button', { name: 'He leído: puntuar' }))
    fireEvent.click(await screen.findByRole('button', { name: /fuera de mi ámbito: me abstengo/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const a = demo._estado.asignaciones.find((x) => x.panelista_id === 1 && x.concepto_id === 'DEMO-00003')
      expect(a.estado).toBe('abstenida')
    })
  })

  it('al terminar un módulo pide la pregunta de cobertura', async () => {
    const p = demo._estado.panelistas[0]
    p.perfil_completado = true; p.calibracion_hecha = true
    // DEMO-00001 ya hecha; al cerrar DEMO-00002 se completa D01.M01
    await demo.rpc('valida_guardar', { clave: CLAVES_DEMO.experto, concepto_id: 'DEMO-00001', datos: { puntuaciones: { relevancia: 4, claridad: 4, representatividad: 4 } } })
    window.location.hash = '#/c/DEMO-00002'
    await entrarComo(CLAVES_DEMO.experto)
    fireEvent.click(await screen.findByRole('button', { name: 'He leído: puntuar' }))
    const grupos = await screen.findAllByRole('radiogroup')
    grupos.forEach((g) => fireEvent.click(g.querySelectorAll('button')[3]))
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => expect(window.location.hash).toBe('#/modulo/D01.M01'))
    expect(await screen.findByText(/Fin del módulo/)).toBeTruthy()
    // la lista trae TODOS los títulos del módulo, no solo los muestreados
    expect(await screen.findByText('El dolor es siempre real, tenga o no lesión visible')).toBeTruthy()
    expect(screen.getByText(/tiene 4 conceptos; has valorado 2/)).toBeTruthy()
    const grupo = await screen.findByRole('radiogroup', { name: 'Exhaustividad' })
    fireEvent.click(grupo.querySelectorAll('button')[3])
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    await waitFor(() => expect(demo._estado.cobertura.length).toBe(1))
    expect(demo._estado.cobertura[0].exhaustividad).toBe(4)
  })
})

// El conjunto mínimo de datos del panel de paciente: temporalidad, localización, diagnóstico,
// impacto (PEG), educación previa y alfabetización en salud (Chew).
// El formulario de paciente va en dos pasos, así que rellenarlo también.
// Paso 1: lo que decide si se puede seguir —quién eres, tu dolor y el consentimiento—.
function rellenarPacientePaso1({ duracion = '1_5a' } = {}) {
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '1980-05-12' } })
  fireEvent.change(screen.getByLabelText('¿Cuánto tiempo llevas con dolor?'), { target: { value: duracion } })
  fireEvent.change(screen.getByLabelText('¿Cada cuánto te duele?'), { target: { value: 'casi_diario' } })
  fireEvent.click(screen.getByLabelText('Espalda baja o lumbares'))
  fireEvent.click(screen.getByLabelText('Fibromialgia'))
  fireEvent.click(screen.getByLabelText(/He leído la información, he podido preguntar/))
}

// Paso 2: la parte larga —EGDC, los dos cribados de ánimo, tratamientos y alfabetización—.
function rellenarPacientePaso2() {
  // EGDC española: días con dolor, tres de intensidad, el tramo de días perdidos y tres de interferencia.
  fireEvent.change(screen.getByLabelText(/Cuántos días ha tenido dolor/), { target: { value: '150' } })
  for (const [rotulo, n] of [[/EN ESTE MOMENTO/, 5],
                             [/su PEOR dolor/, 8],
                             [/EN PROMEDIO/, 5]]) {
    fireEvent.click(within(screen.getByRole('radiogroup', { name: rotulo })).getByRole('radio', { name: String(n) }))
  }
  fireEvent.change(screen.getByLabelText(/TAREAS HABITUALES/), { target: { value: '16-24' } })
  for (const [rotulo, n] of [[/ACTIVIDADES DIARIAS/, 5],
                             [/OCIO, SOCIALES Y FAMILIARES/, 6],
                             [/CAPACIDAD PARA TRABAJAR/, 4]]) {
    fireEvent.click(within(screen.getByRole('radiogroup', { name: rotulo })).getByRole('radio', { name: String(n) }))
  }
  // GAD-7 y PHQ-9: los dos cribados, tal como están publicados.
  for (const [rotulo, v] of [[/nervioso\/a, ansioso/, '2'], [/parar o controlar su preocupación/, '1'],
                             [/preocupado demasiado/, '2'], [/dificultad para relajarse/, '1'],
                             [/quedarse quieto/, '0'], [/molestado o irritado/, '1'],
                             [/algo terrible fuera a pasar/, '0']]) {
    fireEvent.change(screen.getByLabelText(rotulo), { target: { value: v } })
  }
  for (const [rotulo, v] of [[/Poco interés o placer/, '1'], [/desanimado/, '1'],
                             [/dificultad para dormirse/, '2'], [/cansado\/a o con poca energía/, '2'],
                             [/poco apetito/, '0'], [/mal con usted mismo/, '0'],
                             [/dificultad para concentrarse/, '1'], [/tan despacio/, '0'],
                             [/estaría mejor muerto/, '0']]) {
    fireEvent.change(screen.getByLabelText(rotulo), { target: { value: v } })
  }
  fireEvent.change(screen.getByLabelText('¿Alguna vez un profesional te ha explicado cómo funciona el dolor?'), { target: { value: 'nunca' } })
  fireEvent.change(screen.getByLabelText(/te ayude a leer los papeles/), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText(/rellenando tú solo o sola/), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText(/te cuesta entender tu problema de salud/), { target: { value: '2' } })
}

const seguirAlPaso2 = () => fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))

function rellenarPerfilPaciente(ajustes = {}) {
  rellenarPacientePaso1(ajustes)
  seguirAlPaso2()
  rellenarPacientePaso2()
}

describe('flujo del paciente', () => {
  it('ve solo la explicación de paciente y su instrumento', async () => {
    await entrarComo(CLAVES_DEMO.paciente)
    expect(await screen.findByText('Unos datos sobre ti')).toBeTruthy()
    rellenarCorreoPaciente('paciente@ejemplo.org')
    rellenarPerfilPaciente()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Empezar' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Empezar' }))
    // Las tres dimensiones de comprensibilidad, en la misma Likert 1-4 que el experto.
    expect(await screen.findByRole('radiogroup', { name: 'Se entiende' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Las palabras' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'El orden' })).toBeTruthy()
    // Y NADA del material profesional: ni el texto, ni el título (que es la afirmación técnica).
    expect(screen.queryByText('Explicación profesional')).toBeNull()
    expect(screen.queryByText(DEMO_TITULO_TECNICO)).toBeNull()
    for (const dim of ['Se entiende', 'Las palabras', 'El orden']) {
      fireEvent.click(within(screen.getByRole('radiogroup', { name: dim })).getByRole('radio', { name: /Totalmente de acuerdo/ }))
    }
    fireEvent.click(screen.getByRole('radio', { name: 'Igual que antes de leerlo' }))
    fireEvent.click(screen.getByLabelText('Suena a que la culpa es mía'))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar y siguiente' }))
    await waitFor(() => {
      const v = demo._estado.valoraciones.find((x) => x.panelista_id === 2)
      expect(v?.completa).toBe(true)
      expect(v.puntuaciones).toEqual({ comprensibilidad: 4, palabras: 4, orden: 4 })
      expect(v.paciente).toEqual({ efecto: 'igual', vetos: ['culpa'] })
    })
  })

  it('no puede cerrar el texto sin puntuar las tres dimensiones', async () => {
    await entrarComo(CLAVES_DEMO.paciente)
    expect(await screen.findByText('Unos datos sobre ti')).toBeTruthy()
    rellenarCorreoPaciente('paciente2@ejemplo.org')
    rellenarPerfilPaciente()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y seguir' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Empezar' }))
    fireEvent.click(await screen.findByRole('link', { name: 'Empezar' }))
    const seEntiende = await screen.findByRole('radiogroup', { name: 'Se entiende' })
    fireEvent.click(within(seEntiende).getByRole('radio', { name: /Totalmente de acuerdo/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Igual que antes de leerlo' }))
    expect(screen.getByRole('button', { name: 'Guardar y siguiente' }).disabled).toBe(true)
  })
})

describe('convocatoria pública (#/participar)', () => {
  const rellenar = async ({ titulacion, anios, formacion = false, codigo = 'demo' }) => {
    window.location.hash = '#/participar'
    render(<App />)
    // La convocatoria pregunta primero quién eres: los dos paneles no leen lo mismo.
    fireEvent.click(await screen.findByRole('button', { name: /Soy profesional con experiencia en dolor/ }))
    fireEvent.change(await screen.findByLabelText(/Código de/), { target: { value: codigo } })
    rellenarIdentidad()
    fireEvent.change(screen.getByLabelText('Disciplina principal'), { target: { value: 'fisioterapia' } })
    fireEvent.change(screen.getByLabelText('Titulación académica máxima'), { target: { value: titulacion } })
    if (formacion) fireEvent.click(screen.getByLabelText(/formación específica acreditada/))
    fireEvent.click(screen.getByLabelText('Asistencial', { selector: 'input[type="checkbox"]' }))
    fireEvent.change(screen.getByLabelText(/Años de experiencia en dolor/), { target: { value: String(anios) } })
    fireEvent.click(screen.getByLabelText(/Avanzado: lo enseño/))
    fireEvent.click(await screen.findByLabelText(/Fundamentos del dolor/))
    fireEvent.click(screen.getByLabelText(/He leído la información, he podido preguntar/))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
  }
  it('acepta a quien alcanza la puntuación de Fehring, le da clave y bloque', async () => {
    await rellenar({ titulacion: 'doctorado', anios: 10, formacion: true })
    expect(await screen.findByText(/Solicitud aceptada/)).toBeTruthy()
    expect(screen.getByText(/Eres PAN-08/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entrar en el estudio' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Preparar el correo' }).getAttribute('href')).toMatch(/^mailto:ana%40ejemplo.org\?subject=/)
    expect(demo._estado.identidades?.length ?? 1).toBeGreaterThan(0)
    const nuevo = demo._estado.panelistas.find((p) => p.codigo === 'PAN-08')
    expect(nuevo.perfil_completado).toBe(true)
    expect(demo._estado.asignaciones.filter((a) => a.panelista_id === nuevo.id).length).toBe(6)
  })
  it('rechaza a quien no la alcanza, sin crear panelista', async () => {
    const antes = demo._estado.panelistas.length
    await rellenar({ titulacion: 'grado', anios: 0 })
    expect(await screen.findByText(/no alcanza el mínimo \(0 de 5 puntos\)/)).toBeTruthy()
    expect(demo._estado.panelistas.length).toBe(antes)
    expect(screen.queryByRole('button', { name: /Corregir/ })).toBeNull()   // no se le invita a reintentar
  })

  it('quien no alcanzó el criterio y lo reenvía con los datos cambiados no se da de alta', async () => {
    await rellenar({ titulacion: 'grado', anios: 0 })
    await screen.findByText(/no alcanza el mínimo/)
    const antes = demo._estado.panelistas.length
    cleanup()
    await rellenar({ titulacion: 'doctorado', anios: 12, formacion: true })   // mismo correo, perfil «mejorado»
    expect(await screen.findByText(/No es posible tramitar esta solicitud/)).toBeTruthy()
    expect(screen.getByText(/escribe a/)).toBeTruthy()
    expect(demo._estado.panelistas.length).toBe(antes)
    expect(demo._estado.solicitudes.filter((x) => x.bloqueada).length).toBe(1)
  })

  it('quien ya está dentro no se duplica', async () => {
    await rellenar({ titulacion: 'doctorado', anios: 10, formacion: true })
    await screen.findByText(/Solicitud aceptada/)
    const antes = demo._estado.panelistas.length
    cleanup()
    await rellenar({ titulacion: 'doctorado', anios: 10, formacion: true })
    expect(await screen.findByText(/ya está en el panel/)).toBeTruthy()
    expect(demo._estado.panelistas.length).toBe(antes)
  })
})

describe('convocatoria de pacientes (#/participar/paciente)', () => {
  const solicitar = async (ajustes = {}) => {
    window.location.hash = '#/participar/paciente'
    render(<App />)
    expect(await screen.findByText('Participar como persona con dolor')).toBeTruthy()
    await screen.findByLabelText('Correo de contacto')   // el formulario llega cuando responde valida_publico
    const campoCodigo = screen.queryByLabelText(/Código de/)
    if (campoCodigo) fireEvent.change(campoCodigo, { target: { value: ajustes.codigo ?? 'demo' } })
    rellenarCorreoPaciente(ajustes.email || 'dolor@ejemplo.org')
    rellenarPerfilPaciente(ajustes)
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
  }

  it('el enlace directo entra en la vía de paciente sin pasar por la elección', async () => {
    window.location.hash = '#/participar/paciente'
    render(<App />)
    expect(await screen.findByText('Participar como persona con dolor')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Soy profesional/ })).toBeNull()
  })

  it('llegar al enlace directo desde la pantalla de elección también funciona', async () => {
    window.location.hash = '#/participar'
    render(<App />)
    await screen.findByRole('button', { name: /Soy profesional/ })
    // Sin sincronizar la vía con la ruta, el componente ya montado se quedaba en la elección.
    window.location.hash = '#/participar/paciente'
    expect(await screen.findByText('Participar como persona con dolor')).toBeTruthy()
  })

  it('da de alta SIN puntuar: no hay Fehring ni nota de corte', async () => {
    const antes = demo._estado.panelistas.length
    await solicitar()
    expect(await screen.findByText(/Solicitud aceptada/)).toBeTruthy()
    expect(screen.getByText(/Eres PAC-02/)).toBeTruthy()
    const nuevo = demo._estado.panelistas.find((p) => p.codigo === 'PAC-02')
    expect(demo._estado.panelistas.length).toBe(antes + 1)
    expect(nuevo.perfil).toBe('paciente')
    expect(nuevo.dominios_competencia).toEqual([])      // el paciente no juzga por dominios
    expect(nuevo.notas).toMatch(/panel de paciente/)
    expect(nuevo.notas).not.toMatch(/Fehring/)
    // Y le queda un bloque asignado, con textos que tienen explicación para pacientes.
    expect(demo._estado.asignaciones.filter((a) => a.panelista_id === nuevo.id).length).toBeGreaterThan(0)
  })

  it('guarda el conjunto mínimo de datos: dolor, diagnóstico, impacto, tratamientos y alfabetización', async () => {
    await solicitar({ email: 'dolor2@ejemplo.org' })
    await screen.findByText(/Solicitud aceptada/)
    const nuevo = demo._estado.panelistas.find((p) => p.codigo === 'PAC-02')
    const d = nuevo.perfil_datos
    expect(d.duracion_dolor).toBe('1_5a')
    expect(d.frecuencia_dolor).toBe('casi_diario')
    expect(d.zonas).toEqual(['lumbar'])
    expect(d.diagnosticos).toEqual(['fibromialgia'])
    expect([d.egdc_ahora, d.egdc_peor, d.egdc_medio]).toEqual([5, 8, 5])
    expect([d.egdc_diaria, d.egdc_social, d.egdc_trabajo]).toEqual([5, 6, 4])
    expect(d.egdc_dias).toBe('16-24')
    expect(Number(d.egdc_dias_dolor)).toBe(150)
    expect([d.phq9_interes, d.phq9_animo, d.phq9_sueno, d.phq9_energia]).toEqual([1, 1, 2, 2])
    expect([d.phq9_apetito, d.phq9_fracaso, d.phq9_concentracion, d.phq9_lentitud, d.phq9_muerte]).toEqual([0, 0, 1, 0, 0])
    expect([d.gad7_nervioso, d.gad7_preocupacion, d.gad7_exceso, d.gad7_relajarse]).toEqual([2, 1, 2, 1])
    expect([d.gad7_inquietud, d.gad7_irritable, d.gad7_miedo]).toEqual([0, 1, 0])
    expect(d.nacimiento).toBe('1980-05-12')
    expect(d.educacion_previa).toBe('nunca')
    expect([d.ayuda_leer, d.seguridad_formularios, d.cuesta_entender]).toEqual([1, 2, 2])
    // La identidad va aparte: no viaja con el perfil.
    expect(d.identidad).toBeUndefined()
    expect(demo._estado.identidades.some((i) => i.codigo === 'PAC-02')).toBe(true)
  })

  it('el paso 1 no deja pasar con huecos, y el consentimiento va antes que los datos de salud', async () => {
    window.location.hash = '#/participar/paciente'
    render(<App />)
    await screen.findByLabelText('Correo de contacto')
    // Las preguntas de salud no están todavía: primero se consiente, luego se contestan.
    expect(screen.queryByLabelText(/Cuántos días ha tenido dolor/)).toBeNull()
    expect(screen.getByLabelText(/He leído la información, he podido preguntar/)).toBeTruthy()

    rellenarCorreoPaciente('huecos@ejemplo.org')
    rellenarPacientePaso1()
    fireEvent.click(screen.getByLabelText('Espalda baja o lumbares'))   // se desmarca la única zona
    seguirAlPaso2()
    expect((await screen.findAllByRole('alert'))[0].textContent).toMatch(/zona/)
    expect(screen.queryByLabelText(/Cuántos días ha tenido dolor/)).toBeNull()

    fireEvent.click(screen.getByLabelText('Espalda baja o lumbares'))
    seguirAlPaso2()
    expect(await screen.findByLabelText(/Cuántos días ha tenido dolor/)).toBeTruthy()
  })

  it('volver al paso 1 no borra lo que ya se había contestado en el paso 2', async () => {
    window.location.hash = '#/participar/paciente'
    render(<App />)
    await screen.findByLabelText('Correo de contacto')
    rellenarCorreoPaciente('vuelta@ejemplo.org')
    rellenarPacientePaso1()
    seguirAlPaso2()
    fireEvent.change(await screen.findByLabelText(/Cuántos días ha tenido dolor/), { target: { value: '99' } })

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    // Estamos en el paso 1 y sigue estando lo suyo…
    expect(screen.getByLabelText('Fecha de nacimiento').value).toBe('1980-05-12')
    // …y al volver al 2, lo del 2.
    seguirAlPaso2()
    expect((await screen.findByLabelText(/Cuántos días ha tenido dolor/)).value).toBe('99')
  })

  it('marcar el ítem 9 del PHQ-9 enseña dónde pedir ayuda, sin prometer que alguien lee', async () => {
    window.location.hash = '#/participar/paciente'
    render(<App />)
    await screen.findByLabelText('Correo de contacto')
    rellenarCorreoPaciente('animo@ejemplo.org')
    rellenarPacientePaso1()
    seguirAlPaso2()
    // Antes de tocar nada no hay ningún aviso: aparecer sin motivo sería alarmar por alarmar.
    expect(screen.queryByText(/Línea de Atención a la Conducta Suicida/)).toBeNull()
    fireEvent.change(screen.getByLabelText(/estaría mejor muerto/), { target: { value: '1' } })
    expect(await screen.findByText(/Línea de Atención a la Conducta Suicida/)).toBeTruthy()
    expect(screen.getByText(/nadie lee tus respuestas en el momento/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '024' })).toBeTruthy()
    // Y volver a «ningún día» lo retira.
    fireEvent.change(screen.getByLabelText(/estaría mejor muerto/), { target: { value: '0' } })
    expect(screen.queryByText(/Línea de Atención a la Conducta Suicida/)).toBeNull()
  })

  it('menos de tres meses de dolor no es dolor crónico: se corta en el paso 1', async () => {
    const antes = demo._estado.panelistas.length
    window.location.hash = '#/participar/paciente'
    render(<App />)
    await screen.findByLabelText('Correo de contacto')
    rellenarCorreoPaciente('agudo@ejemplo.org')
    rellenarPacientePaso1({ duracion: 'menos_3m' })
    // Ni siquiera deja pasar al paso 2: se entera antes de contestar treinta preguntas.
    expect(screen.getByRole('button', { name: 'Seguir' }).disabled).toBe(true)
    expect(document.querySelector('.aviso-caja').textContent).toMatch(/tres meses o más/)
    expect(screen.queryByLabelText(/Cuántos días ha tenido dolor/)).toBeNull()
    expect(demo._estado.panelistas.length).toBe(antes)
  })

  it('con la inscripción de pacientes cerrada no se puede solicitar', async () => {
    demo.rpc('valida_dir_estudio', { clave: CLAVES_DEMO.direccion, datos: { inscripcion_pacientes_abierta: false } })
    window.location.hash = '#/participar/paciente'
    render(<App />)
    expect(await screen.findByText(/La inscripción no está abierta/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).toBeNull()
    demo.rpc('valida_dir_estudio', { clave: CLAVES_DEMO.direccion, datos: { inscripcion_pacientes_abierta: true } })
  })

  it('los dos paneles se abren por separado', async () => {
    demo.rpc('valida_dir_estudio', { clave: CLAVES_DEMO.direccion, datos: { inscripcion_abierta: false, inscripcion_pacientes_abierta: true } })
    window.location.hash = '#/participar'
    render(<App />)
    const experto = await screen.findByRole('button', { name: /Soy profesional con experiencia en dolor/ })
    const paciente = screen.getByRole('button', { name: /Tengo dolor desde hace tres meses o más/ })
    expect(experto.textContent).toMatch(/Cerrada ahora mismo/)
    expect(paciente.textContent).not.toMatch(/Cerrada ahora mismo/)
    demo.rpc('valida_dir_estudio', { clave: CLAVES_DEMO.direccion, datos: { inscripcion_abierta: true } })
  })
})

describe('código de pruebas con la inscripción cerrada', () => {
  it('crea un panelista marcado como prueba y la dirección puede borrarlo', async () => {
    demo.rpc('valida_dir_estudio', { clave: CLAVES_DEMO.direccion, datos: { inscripcion_abierta: false } })
    window.location.hash = '#/participar'
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Soy profesional con experiencia en dolor/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Tengo un código de acceso' }))
    fireEvent.change(await screen.findByLabelText(/Código de acceso/), { target: { value: 'PRUEBAS' } })
    rellenarIdentidad('prueba@ejemplo.org')
    fireEvent.change(screen.getByLabelText('Disciplina principal'), { target: { value: 'fisioterapia' } })
    fireEvent.change(screen.getByLabelText('Titulación académica máxima'), { target: { value: 'doctorado' } })
    fireEvent.click(screen.getByLabelText('Asistencial', { selector: 'input[type="checkbox"]' }))
    fireEvent.change(screen.getByLabelText(/Años de experiencia en dolor/), { target: { value: '8' } })
    fireEvent.click(screen.getByLabelText(/Avanzado: lo enseño/))
    fireEvent.click(await screen.findByLabelText(/Fundamentos del dolor/))
    fireEvent.click(screen.getByLabelText(/He leído la información, he podido preguntar/))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }))
    expect(await screen.findByText(/Solicitud aceptada/)).toBeTruthy()
    expect(screen.getByText(/Alta de/)).toBeTruthy()
    const nuevo = demo._estado.panelistas.find((p) => p.es_prueba)
    expect(nuevo).toBeTruthy()
    await demo.rpc('valida_dir_borrar_prueba', { clave: CLAVES_DEMO.direccion, codigo: nuevo.codigo })
    expect(demo._estado.panelistas.find((p) => p.codigo === nuevo.codigo)).toBeUndefined()
  })
})
