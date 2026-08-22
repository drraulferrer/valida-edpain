import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import HojaInformacion from '../src/componentes/HojaInformacion.jsx'

// La hoja de información es un documento legal: estos tests fijan lo que el RGPD obliga a
// decir, para que no se pierda en una reescritura. No comprueban estilo, comprueban contenido.
afterEach(cleanup)

const ESTUDIO = {
  investigador_principal: 'Dr. Raúl Ferrer-Peña',
  contacto_email: 'estudio@edpain.com',
  grupo_autoria: 'Grupo del Estudio EdPain',
  region_datos: 'eu-west-3 (París, Francia)',
}

function abrir(props = {}) {
  render(<HojaInformacion estudio={ESTUDIO} valor={false} onCambio={() => {}} {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Leer la información completa' }))
  return document.body.textContent || ''
}

describe('hoja de información · lo que exige el art. 13 RGPD', () => {
  it('identifica al responsable, la finalidad y la base jurídica', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/Responsable del tratamiento/)
    expect(t).toMatch(/art\. 6\.1\.a RGPD/)
    expect(t).toMatch(/art\. 9\.2\.a RGPD/)          // datos de salud: consentimiento explícito
    expect(t).toMatch(/LOPDGDD 3\/2018/)
  })

  it('dice cuánto se conservan, los derechos y la AEPD', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/cinco años/)
    expect(t).toMatch(/acceso, rectificación, supresión, limitación, portabilidad y oposición/)
    expect(t).toMatch(/retirar tu consentimiento/i)
    expect(t).toMatch(/Agencia Española de Protección de Datos/)
  })

  it('cae en el investigador principal si no se ha configurado el responsable, y usa la institución si sí', () => {
    expect(abrir({ perfil: 'paciente' })).toMatch(/Dr\. Raúl Ferrer-Peña \(investigador principal\)/)
    cleanup()
    const t = abrir({ perfil: 'paciente', estudio: { ...ESTUDIO, responsable_tratamiento: 'CSEU La Salle', dpd_contacto: 'dpd@lasalle.es' } })
    expect(t).toMatch(/CSEU La Salle/)
    expect(t).toMatch(/Delegado de protección de datos/)
  })

  it('la base está en la UE: no declara transferencia internacional', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/eu-west-3 \(París, Francia\)/)
    expect(t).not.toMatch(/transferencia internacional/)
    expect(t).toMatch(/Dentro de la Unión Europea/)
  })

  it('pero si alguien la mueve fuera del EEE, la hoja lo declara sola', () => {
    const t = abrir({ perfil: 'paciente', estudio: { ...ESTUDIO, region_datos: 'eu-west-2 (Londres, Reino Unido)' } })
    expect(t).toMatch(/transferencia internacional/)
    expect(t).toMatch(/decisión de adecuación/)
  })
})

describe('hoja de información · lo que cambia entre paciente y experto', () => {
  it('al paciente le nombra sus datos de salud y le pide consentimiento expreso', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/Datos sobre tu salud/)
    expect(t).toMatch(/categoría especial/)
    expect(t).toMatch(/expresamente, el tratamiento de los datos sobre mi salud/)
  })

  it('al paciente le dice que sobre él NO hay decisiones automáticas', () => {
    expect(abrir({ perfil: 'paciente' })).toMatch(/no se toma ninguna decisión automática/)
  })

  it('al experto le declara el rechazo automático y su derecho a revisión humana (art. 22)', () => {
    const t = abrir({ perfil: 'experto' })
    expect(t).toMatch(/rechaza la solicitud sin que intervenga una persona/)
    expect(t).toMatch(/derecho a que una persona lo revise/)
    // Y el control de reenvíos, que también es tratamiento automatizado y hay que declararlo.
    expect(t).toMatch(/varias solicitudes con el mismo correo/)
  })

  it('al paciente le dice que NO hay autoría y qué obtiene en su lugar', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/tu participación no da autoría/i)
    expect(t).not.toMatch(/Grupo del Estudio EdPain/)
    expect(t).toMatch(/se agradece la participación del/)
  })

  it('al experto sí le promete la autoría de grupo del ICMJE', () => {
    const t = abrir({ perfil: 'experto' })
    expect(t).toMatch(/Grupo del Estudio EdPain/)
    expect(t).toMatch(/ICMJE/)
  })

  it('explica que el contacto se archiva aparte y para qué sirve la huella', () => {
    const t = abrir({ perfil: 'paciente' })
    expect(t).toMatch(/nadie responde dos veces/)
    expect(t).toMatch(/huella cifrada/)
    expect(t).toMatch(/no se puede volver al correo/)
    // Y al paciente no se le pide el nombre.
    expect(t).toMatch(/No se te pide el nombre/)
  })

  it('el consentimiento del experto no arrastra la mención a datos de salud', () => {
    expect(abrir({ perfil: 'experto' })).not.toMatch(/expresamente, el tratamiento de los datos sobre mi salud/)
  })
})
