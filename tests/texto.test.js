import { describe, it, expect } from 'vitest'
import { aHtml, aPlano, escapar, minutosLectura, mapasDe, apaSinEnlace } from '../src/lib/texto.js'

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
  it('citas en APA 7 con autor y año, enlazadas a la referencia', () => {
    const mapas = mapasDe({ referencias: [
      { id: 'REF-0001', apa: 'Raja, S. N., et al. (2020). The revised IASP definition. _Pain_, _161_(9), 1976–1982. https://doi.org/10.1097/j.pain.0000000000001939', parentetica: 'Raja et al., 2020', narrativa: 'Raja et al. (2020)' },
      { id: 'REF-0009', apa: 'Treede, R. D., et al. (2019). Chronic pain as a symptom or a disease. _Pain_, _160_(1), 19–27.', parentetica: 'Treede et al., 2019', narrativa: 'Treede et al. (2019)' },
    ] })
    const h = aHtml('Lo define la IASP (REF-0001). Según REF-0009, es enfermedad (REF-0001, REF-0009).', mapas)
    expect(h).toContain('(<a class="ref" href="#ref-REF-0001" data-ref="REF-0001" title="Raja, S. N., et al. (2020). The revised IASP definition. _Pain_, _161_(9), 1976–1982. https://doi.org/10.1097/j.pain.0000000000001939">Raja et al., 2020</a>)')
    expect(h).toContain('Según <a class="ref" href="#ref-REF-0009" data-ref="REF-0009" title="Treede, R. D., et al. (2019). Chronic pain as a symptom or a disease. _Pain_, _160_(1), 19–27.">Treede et al. (2019)</a>')
    expect(h).toContain('>Raja et al., 2020</a>; <a class="ref" href="#ref-REF-0009"')
    expect(apaSinEnlace(mapas.refs['REF-0001'].apa)).toBe('Raja, S. N., et al. (2020). The revised IASP definition. _Pain_, _161_(9), 1976–1982.')
  })
  it('conceptos citados por su título entre comillas', () => {
    const mapas = mapasDe({ conceptos_citados: [{ id: 'CPT-00060', titulo: 'Dolor crónico primario' }] })
    expect(aHtml('Ver CPT-00060 y CPT-00061.', mapas)).toBe('<p>Ver <span class="cpt" title="CPT-00060">"Dolor crónico primario"</span> y <span class="cpt">CPT-00061</span>.</p>')
  })
  it('cursiva con guion bajo (revistas en APA)', () => {
    expect(aHtml('en _Pain_, _161_(9)')).toBe('<p>en <em>Pain</em>, <em>161</em>(9)</p>')
    expect(aHtml('`no_aplica` y snake_case')).toBe('<p><code>no_aplica</code> y snake_case</p>')
  })
  it('plano y minutos', () => {
    expect(aPlano('**a**  b\n\nc')).toBe('a b c')
    expect(minutosLectura('palabra '.repeat(400))).toBe(2)
    expect(minutosLectura('')).toBe(1)
  })
})
