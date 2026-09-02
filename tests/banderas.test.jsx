import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Banderas from '../src/componentes/Banderas.jsx'

afterEach(cleanup)

// Envoltorio con estado, como lo usa el wizard: sin él, `value` nunca cambiaría.
function Enmarcado({ inicial = {} }) {
  const [v, setV] = useState(inicial)
  return (
    <>
      <Banderas valor={v} onCambio={setV} />
      <output data-testid="crudo">{JSON.stringify(v)}</output>
    </>
  )
}

const crudo = () => JSON.parse(screen.getByTestId('crudo').textContent)

describe('banderas', () => {
  it('marcar una con detalle abre su campo de texto', () => {
    render(<Enmarcado />)
    expect(screen.queryByLabelText(/Indica cuál consideras correcto/)).toBeNull()
    fireEvent.click(screen.getByLabelText(/El nivel de certeza no es el adecuado/))
    expect(screen.getByLabelText(/Indica cuál consideras correcto/)).toBeTruthy()
    // Marcada y sin texto es un estado válido: la bandera señala aunque no se explique.
    expect(crudo()).toEqual({ certeza: '' })
  })

  it('se pueden escribir varias palabras: el espacio no se come al teclear', () => {
    render(<Enmarcado />)
    fireEvent.click(screen.getByLabelText(/El nivel de certeza no es el adecuado/))
    const campo = screen.getByLabelText(/Indica cuál consideras correcto/)
    // Tecleo carácter a carácter, que es donde fallaba: el `.trim()` del value borraba el
    // espacio final en cuanto se escribía, y no se llegaba a la segunda palabra.
    let texto = ''
    for (const c of 'muy baja') {
      texto += c
      fireEvent.change(campo, { target: { value: texto } })
      expect(campo.value).toBe(texto)
    }
    expect(crudo()).toEqual({ certeza: 'muy baja' })
  })

  it('desmarcar la quita del todo, aunque tuviera texto', () => {
    render(<Enmarcado inicial={{ certeza: 'moderada' }} />)
    fireEvent.click(screen.getByLabelText(/El nivel de certeza no es el adecuado/))
    expect(crudo()).toEqual({})
  })

  it('vaciar el texto NO desmarca la bandera', () => {
    render(<Enmarcado inicial={{ certeza: 'moderada' }} />)
    fireEvent.change(screen.getByLabelText(/Indica cuál consideras correcto/), { target: { value: '' } })
    expect(crudo()).toEqual({ certeza: '' })
    expect(screen.getByLabelText(/El nivel de certeza no es el adecuado/).checked).toBe(true)
  })

  it('la de seguridad no tiene campo y vale `true`, que es lo que lee el veto', () => {
    render(<Enmarcado />)
    fireEvent.click(screen.getByLabelText(/decisión clínica insegura/))
    expect(crudo()).toEqual({ seguridad: true })
  })
})
