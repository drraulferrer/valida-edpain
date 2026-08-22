import { describe, it, expect } from 'vitest'
import { aHtml, aPlano, escapar, minutosLectura } from '../src/lib/texto.js'

describe('texto', () => {
  it('escapa HTML crudo', () => {
    expect(aHtml('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
    expect(escapar('a"b')).toBe('a&quot;b')
  })
  it('negrita, cursiva, código y referencias', () => {
    const h = aHtml('Los **seis** niveles *van* de `recordar` a crear (REF-2933).')
    expect(h).toContain('<strong>seis</strong>')
    expect(h).toContain('<em>van</em>')
    expect(h).toContain('<code>recordar</code>')
    expect(h).toContain('<a class="ref" href="#ref-REF-2933" data-ref="REF-2933">REF-2933</a>')
  })
  it('listas y párrafos', () => {
    const h = aHtml('Intro.\n\n- uno\n- dos\n\n1. a\n2. b\n\nFin.')
    expect(h).toBe('<p>Intro.</p><ul><li>uno</li><li>dos</li></ul><ol><li>a</li><li>b</li></ol><p>Fin.</p>')
  })
  it('marcas internas del corpus como nota', () => {
    expect(aHtml('Texto [[CARENCIA DECLARADA: no hay RS]] aquí.')).toContain('<span class="marca">CARENCIA DECLARADA: no hay RS</span>')
  })
  it('plano y minutos', () => {
    expect(aPlano('**a**  b\n\nc')).toBe('a b c')
    expect(minutosLectura('palabra '.repeat(400))).toBe(2)
    expect(minutosLectura('')).toBe(1)
  })
})
