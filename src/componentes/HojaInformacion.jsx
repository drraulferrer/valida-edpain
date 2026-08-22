import { useState } from 'react'

// Hoja de información al participante y consentimiento. Contenido estándar para un estudio
// observacional sin intervención (Delphi / validez de contenido): quién lo hace, para qué, qué
// se pide, voluntariedad, riesgos y beneficios, tratamiento de datos (RGPD), reconocimiento de
// autoría y contacto. Los datos concretos del estudio (investigador, contacto, comité) vienen
// de `valida.estudios`, no están escritos aquí.
export default function HojaInformacion({ estudio = {}, perfil = 'experto', valor, onCambio }) {
  const [abierta, setAbierta] = useState(false)
  const ip = estudio.investigador_principal || 'Dr. Raúl Ferrer-Peña'
  const contacto = estudio.contacto_email || 'estudio@edpain.com'
  const grupo = estudio.grupo_autoria || 'Grupo del Estudio EdPain'
  const paciente = perfil === 'paciente'

  return (
    <div className="hoja">
      <h3>Hoja de información al participante</h3>
      <div className="dato"><b>Título del estudio</b><span>Validez de contenido de una base de conocimiento sobre educación en dolor (Estudio EdPain)</span></div>
      <div className="dato"><b>Investigador principal</b><span>{ip}</span></div>
      <div className="dato"><b>Diseño</b><span>Estudio de validez de contenido con panel de personas expertas y panel de personas con dolor, por rondas (método Delphi modificado)</span></div>
      <div className="dato"><b>Contacto para dudas</b><span><a href={`mailto:${contacto}`}>{contacto}</a></span></div>
      {estudio.comite_etica && <div className="dato"><b>Comité de ética</b><span>{estudio.comite_etica}</span></div>}

      <p style={{ marginTop: '1rem' }}>
        Se te invita a participar como {paciente ? 'persona con experiencia de dolor' : 'profesional con experiencia en dolor'} en la
        validación de contenido de una base de conocimiento sobre educación en dolor. Antes de decidir, lee esta información y
        pregunta lo que necesites en {contacto}.
      </p>

      {!abierta && (
        <button type="button" className="boton secundario pequeno" onClick={() => setAbierta(true)}>Leer la información completa</button>
      )}

      {abierta && (
        <div>
          <h3>1 · Objetivo</h3>
          <p>
            Determinar en qué medida los contenidos de la base de conocimiento son {paciente ? 'comprensibles para las personas a las que van dirigidos' : 'relevantes, claros y fieles a la evidencia disponible'},
            mediante el juicio independiente de un panel. El resultado servirá para corregir los contenidos antes de publicarlos y
            para describir el procedimiento en una publicación científica.
          </p>

          <h3>2 · Por qué se te invita y en qué consiste</h3>
          <p>
            {paciente
              ? 'Se te invita por tu experiencia de vivir con dolor. Leerás textos escritos para personas con dolor y dirás si se entienden, cómo te dejan y si alguna frase te resulta invalidante. No tienes que saber nada de ciencia: esa parte la miran otras personas.'
              : 'Se te invita por tu formación y experiencia profesional en dolor, que se comprueban con criterios publicados (Fehring, 1987). Valorarás un bloque de conceptos, uno a uno, en tres afirmaciones (relevancia, claridad y representatividad de la evidencia) con una escala de 1 a 4, y podrás proponer redacciones alternativas.'}
          </p>
          <p>
            La participación se organiza en <b>rondas</b>. Cada ronda supone entre 2 y 4 minutos por concepto, repartibles en varias
            sesiones; la plataforma guarda cada respuesta automáticamente. Entre rondas recibirás un aviso por correo. La duración
            estimada total es de {paciente ? '1 a 2 horas' : '4 a 6 horas'} a lo largo de varios meses.
          </p>

          <h3>3 · Voluntariedad</h3>
          <p>
            Participar es voluntario. Puedes dejarlo en cualquier momento y sin dar explicaciones, escribiendo a {contacto}. Si lo
            dejas, las valoraciones que ya hayas enviado se conservan de forma seudonimizada (asociadas solo a tu código) porque
            forman parte de un resultado ya calculado; si prefieres que se eliminen también, pídelo y se eliminarán.
          </p>

          <h3>4 · Riesgos y beneficios</h3>
          <p>
            El estudio no incluye ninguna intervención sobre tu salud y no tiene riesgos previsibles más allá del tiempo que dedicas.
            {paciente ? ' Algunos textos hablan de dolor persistente y podrían resultarte incómodos; puedes parar cuando quieras.' : ''}
            No hay compensación económica.
          </p>

          <h3>5 · Reconocimiento y autoría</h3>
          <p>
            Quienes <b>completen todas las rondas</b> del estudio serán reconocidos como miembros del <b>{grupo}</b> en las
            publicaciones que se deriven, según los criterios de autoría de grupo del ICMJE (nombre y apellidos indexados como
            colaboradores del grupo). Por eso pedimos nombre, apellidos y filiación: sin ellos no es posible ese reconocimiento.
            Quien no complete las rondas, o no desee figurar, no aparecerá.
          </p>

          <h3>6 · Tratamiento de datos personales</h3>
          <p>
            <b>Responsable:</b> {ip}, investigador principal del estudio. <b>Finalidad:</b> gestionar tu participación, avisarte de
            cada ronda, verificar los criterios de expertise declarados y reconocer la autoría de grupo. <b>Base jurídica:</b> tu
            consentimiento (art. 6.1.a RGPD).
          </p>
          <p>
            <b>Separación de datos:</b> tus datos identificativos (nombre, apellidos, correo, filiación, ORCID y DOI declarados) se
            guardan <b>en una tabla distinta</b> de tus valoraciones. El conjunto de datos que se analiza y se publica contiene solo
            tu código de panelista ({paciente ? 'PAC-01' : 'PAN-01'}, …), nunca tu nombre. Los datos se alojan en servidores de la
            Unión Europea (Supabase, región eu-west-2, Irlanda).
          </p>
          <p>
            <b>Destinatarios:</b> solo el equipo investigador. No se ceden a terceros ni se usan con fines comerciales.
            <b> Conservación:</b> los datos identificativos se conservan hasta la publicación de los resultados y, después, durante el
            tiempo exigido para la verificación de la investigación; las valoraciones seudonimizadas se conservan indefinidamente
            como parte del registro del estudio.
          </p>
          <p>
            <b>Tus derechos:</b> acceso, rectificación, supresión, limitación, portabilidad y oposición, escribiendo a {contacto}.
            Si consideras que el tratamiento no se ajusta a la normativa, puedes reclamar ante la Agencia Española de Protección de
            Datos (www.aepd.es).
          </p>

          <h3>7 · Difusión de los resultados</h3>
          <p>
            Los resultados se publicarán de forma agregada en revistas científicas y podrán presentarse en congresos. El panel se
            describirá por sus características (profesión, titulación, años de experiencia), nunca persona a persona. Si lo deseas,
            se te enviará un resumen de los resultados al terminar.
          </p>

          <h3>8 · Verificación</h3>
          <p>
            Para garantizar la calidad del panel, el equipo puede comprobar a posteriori los datos declarados (titulación,
            publicaciones mediante los DOI que indiques). Declarar datos falsos supone la exclusión del estudio.
          </p>
          <button type="button" className="boton fantasma pequeno" onClick={() => setAbierta(false)}>Cerrar la información</button>
        </div>
      )}

      <label className="casilla" style={{ marginTop: '1rem' }}>
        <input type="checkbox" checked={!!valor} onChange={(e) => onCambio(e.target.checked)} />
        <span>
          <b>He leído la información, he podido preguntar y acepto participar</b> en las condiciones descritas, incluido el
          tratamiento de mis datos personales para las finalidades indicadas.
        </span>
      </label>
    </div>
  )
}
