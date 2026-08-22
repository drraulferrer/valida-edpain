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
  // El responsable del tratamiento suele ser la institución; si no se ha configurado, cae en
  // el investigador principal, que es lo mínimo defendible pero conviene concretar.
  const responsable = estudio.responsable_tratamiento || `${ip} (investigador principal)`
  const dpd = estudio.dpd_contacto || ''
  const region = estudio.region_datos || 'eu-west-2 (Londres, Reino Unido)'
  // Si la base no está en el EEE hay que decir que es una transferencia internacional y con
  // qué garantía se ampara. Reino Unido tiene decisión de adecuación de la Comisión Europea.
  const fueraDelEee = /reino unido|united kingdom|londres|london|estados unidos|ee\.?uu/i.test(region)
  const ruAviso = fueraDelEee
    ? ' Está fuera del Espacio Económico Europeo, así que hay una transferencia internacional de datos; se ampara en la decisión de adecuación de la Comisión Europea para ese país, que reconoce un nivel de protección equivalente al europeo.'
    : ' Dentro de la Unión Europea.'

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
              ? 'Se te invita por tu experiencia de vivir con dolor. Leerás textos escritos para personas con dolor y dirás si se entienden, cómo te dejan y si alguna frase te sienta mal o te hace sentir culpable. No tienes que saber nada de ciencia: esa parte la miran otras personas.'
              : 'Se te invita por tu formación y experiencia profesional en dolor, que se comprueban con criterios publicados (Fehring, 1987). Valorarás un bloque de conceptos, uno a uno, en tres afirmaciones (relevancia, claridad y representatividad de la evidencia) con una escala de 1 a 4, y podrás proponer redacciones alternativas.'}
          </p>
          <p>
            La participación se organiza en <b>rondas</b>. Cada ronda supone entre 2 y 4 minutos por {paciente ? 'texto' : 'concepto'},
            repartibles en varias sesiones; la plataforma guarda cada respuesta automáticamente. Entre rondas recibirás un aviso por
            correo. La duración estimada total es de {paciente ? '1 a 2 horas' : '4 a 6 horas'} a lo largo de varios meses.
          </p>

          <h3>3 · Voluntariedad</h3>
          <p>
            Participar es voluntario. Puedes dejarlo en cualquier momento y sin dar explicaciones, escribiendo a {contacto}. Si lo
            dejas, las valoraciones que ya hayas enviado se conservan de forma seudonimizada (asociadas solo a tu código) porque
            forman parte de un resultado ya calculado; <b>si prefieres que se eliminen también, pídelo y se eliminarán</b>. Retirar
            el consentimiento no tiene ninguna consecuencia para ti (apartado 6.8).
          </p>

          <h3>4 · Riesgos y beneficios</h3>
          <p>
            El estudio no incluye ninguna intervención sobre tu salud y no tiene riesgos previsibles más allá del tiempo que dedicas.
            {paciente ? ' Algunos textos hablan de dolor persistente y podrían resultarte incómodos; puedes parar cuando quieras.' : ''}{' '}
            No hay compensación económica.
          </p>

          <h3>5 · Reconocimiento y autoría</h3>
          {paciente ? (
            <>
              <p>
                Conviene decirlo claro: <b>tu participación no da autoría</b>. Los textos ya están escritos y quien los firma
                responde de ellos; lo que tú haces es decir si se entienden, que es otra cosa y por eso no lleva firma. Tampoco
                se te pide el nombre, precisamente para que tus respuestas no queden unidas a él.
              </p>
              <p>Lo que sí obtienes:</p>
              <ul>
                <li>Los textos que revises se corrigen con lo que digas, y los leerá mucha más gente que tú.</li>
                <li>
                  En la publicación se agradece la participación del <b>panel de personas con dolor</b>, como grupo y sin nombres,
                  y se dice cuántas personas lo formaron.
                </li>
                <li>Si nos lo pides en {contacto}, te mandamos los textos ya corregidos cuando el estudio termine.</li>
              </ul>
            </>
          ) : (
            <>
              <p>
                Quienes <b>completen todas las rondas</b> del estudio serán reconocidos como miembros del <b>{grupo}</b> en las
                publicaciones que se deriven, según los criterios de autoría de grupo del ICMJE (nombre y apellidos indexados como
                colaboradores del grupo). Por eso pedimos nombre, apellidos y filiación: sin ellos no es posible ese
                reconocimiento. Quien no complete las rondas, o no desee figurar, no aparecerá.
              </p>
              <p>
                Figurar es <b>opcional</b>: dilo en {contacto} y no aparecerás, sin que eso afecte a tu participación.
              </p>
            </>
          )}

          <h3>6 · Tratamiento de tus datos personales</h3>

          <h4>6.1 · Quién responde de ellos</h4>
          <p>
            <b>Responsable del tratamiento:</b> {responsable}. <b>Contacto:</b>{' '}
            <a href={`mailto:${contacto}`}>{contacto}</a>.
            {dpd && <> <b>Delegado de protección de datos:</b> <a href={`mailto:${dpd}`}>{dpd}</a>.</>}
          </p>

          <h4>6.2 · Qué datos se recogen</h4>
          <p>Se recogen tres bloques, y se guardan separados:</p>
          <ul>
            <li>
              <b>Datos que te identifican:</b>{' '}
              {paciente
                ? 'solo un correo de contacto. No se te pide el nombre.'
                : 'nombre, apellidos, correo de contacto, filiación, ORCID y los DOI que declares.'}
            </li>
            {paciente ? (
              <li>
                <b>Datos sobre tu salud:</b> fecha de nacimiento, sexo, situación laboral, cuánto tiempo llevas con dolor y con
                qué frecuencia, en qué zonas, qué diagnósticos te han dado, cuánto te duele y cuánto te limita (las siete
                preguntas de la <b>Escala de Gradación del Dolor Crónico</b>), cómo te has sentido de ánimo y de preocupación
                (cuatro preguntas del <b>PHQ-4</b>, que es un cribado y no un diagnóstico), qué tratamientos has hecho, quién te
                lleva, si te habían explicado antes cómo funciona el dolor y tres preguntas sobre información escrita de salud.
                Son <b>datos de categoría especial</b> (art. 9 RGPD) y por eso se te pide un consentimiento expreso, no basta con
                el general.
              </li>
            ) : (
              <li>
                <b>Datos profesionales:</b> disciplina, titulación, formación y años de experiencia en dolor, ámbito de trabajo,
                publicaciones e investigación. Si declaras que tú mismo tienes dolor, esa respuesta es opcional y es un dato de
                salud: puedes dejarla en blanco o marcar «prefiero no decirlo».
              </li>
            )}
            <li>
              <b>Datos de tu participación:</b> tus puntuaciones y comentarios, cuánto tardas en cada {paciente ? 'texto' : 'concepto'},
              cuándo entras y qué avisos se te han mandado.
            </li>
          </ul>

          <h4>6.3 · Para qué se usan y con qué base jurídica</h4>
          <ul>
            <li>
              <b>Gestionar tu participación</b> y avisarte de cada ronda — base: tu <b>consentimiento</b> (art. 6.1.a RGPD).
            </li>
            {paciente ? (
              <li>
                <b>Describir al grupo de personas que participó</b> y analizar si los textos se entienden — base: tu
                <b> consentimiento explícito</b> para tratar datos de salud (art. 9.2.a RGPD), en el marco de la investigación
                científica (art. 9.2.j RGPD y disposición adicional decimoséptima de la LOPDGDD 3/2018).
              </li>
            ) : (
              <li>
                <b>Comprobar los criterios de expertise</b> del protocolo y describir al panel — base: tu consentimiento
                (art. 6.1.a RGPD), en el marco de la investigación científica.
              </li>
            )}
            <li>
              <b>Comprobar que nadie responde dos veces.</b> Del correo se guarda además una <b>huella cifrada</b> —un código
              del que no se puede volver al correo— y es lo que se compara al registrarse. Sin ello, una misma persona podría
              contar como varias y las cuentas del estudio dejarían de ser ciertas — base: tu consentimiento, e interés en la
              integridad de la investigación.
            </li>
            {!paciente && (
              <li><b>Reconocer la autoría de grupo</b> si completas todas las rondas — base: tu consentimiento.</li>
            )}
          </ul>
          <p>
            No se usan para ninguna otra cosa: ni publicidad, ni perfiles comerciales, ni se cruzan con historias clínicas.
          </p>

          <h4>6.4 · Cómo se separan de tu nombre</h4>
          <p>
            Lo que te identifica se guarda en una <b>tabla distinta</b> de tus respuestas, y el conjunto que se analiza y se publica
            lleva solo tu código de panelista. Quien analiza los datos ve una fila como
            {paciente
              ? ' «PAC-07 · 45-59 años · dolor de 5 a 10 años · fibromialgia»'
              : ' «PAN-07 · fisioterapia · doctorado · 12 años»'}, nunca tu nombre. Solo la dirección del estudio puede unir el
            código con la persona, y lo hace para avisarte, para la autoría y para comprobar los datos declarados.
          </p>

          <h4>6.5 · Dónde están y quién más los trata</h4>
          <p>
            El equipo investigador es el único que accede a tus datos. Para funcionar, la plataforma se apoya en proveedores que
            actúan como <b>encargados del tratamiento</b> y no los usan para fines propios:
          </p>
          <ul>
            <li><b>Base de datos</b> (Supabase): región {region}.{ruAviso}</li>
            <li><b>Envío de los avisos por correo</b> (Resend): región eu-west-1 (Irlanda), dentro de la UE.</li>
            <li><b>Recepción del correo del estudio y DNS</b> (Cloudflare).</li>
            <li><b>Alojamiento de esta web</b> (GitHub Pages), que registra la dirección IP de quien la visita.</li>
          </ul>

          <h4>6.6 · Cuánto tiempo se conservan</h4>
          <p>
            Los datos que te identifican se conservan mientras dure el estudio y <b>cinco años</b> después de publicar los
            resultados, que es el plazo habitual para poder verificar una investigación. Las respuestas seudonimizadas —las que solo
            llevan tu código— se conservan de forma indefinida como registro del estudio, porque forman parte de un resultado ya
            calculado y publicado.
          </p>

          <h4>6.7 · Decisiones automáticas</h4>
          {paciente ? (
            <p>
              <b>Sobre ti no se toma ninguna decisión automática.</b> Al panel de personas con dolor no se le puntúa ni se le
              clasifica: solo se comprueba que lleves tres meses o más con dolor, que es el criterio de entrada del estudio.
            </p>
          ) : (
            <p>
              La plataforma <b>calcula automáticamente</b> tu puntuación de expertise a partir de lo que declaras y, si no alcanza el
              mínimo del protocolo, <b>rechaza la solicitud sin que intervenga una persona</b>. También comprueba de forma automática
              que no haya varias solicitudes con el mismo correo. Tienes derecho a que una persona lo revise y a exponer tu punto de
              vista: escribe a <a href={`mailto:${contacto}`}>{contacto}</a> y la dirección del estudio lo mira contigo.
            </p>
          )}

          <h4>6.8 · Tus derechos</h4>
          <p>
            Puedes ejercer los derechos de <b>acceso, rectificación, supresión, limitación, portabilidad y oposición</b> escribiendo
            a <a href={`mailto:${contacto}`}>{contacto}</a>. Puedes <b>retirar tu consentimiento cuando quieras</b>, sin dar
            explicaciones y sin que eso afecte a la licitud de lo que se hizo antes de retirarlo. Si crees que no se han respetado
            tus derechos, puedes reclamar ante la <b>Agencia Española de Protección de Datos</b> (
            <a href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>).
          </p>

          <h4>6.9 · ¿Estás obligado a darlos?</h4>
          <p>
            No. Darlos es voluntario, pero sin ellos no se puede participar: el correo hace falta para mandarte tu clave, para
            los avisos y para comprobar que no hay respuestas duplicadas
            {paciente ? '' : ', el nombre para el reconocimiento de autoría'}, y{' '}
            {paciente
              ? 'los datos sobre tu dolor para poder decir en la publicación a qué personas les resultaron claros estos textos —que es justamente lo que hace útil el estudio—.'
              : 'los datos profesionales para comprobar los criterios de inclusión del panel.'}{' '}
            Los campos marcados como opcionales puedes dejarlos en blanco.
          </p>

          <h3>7 · Difusión de los resultados</h3>
          <p>
            Los resultados se publicarán de forma agregada en revistas científicas y podrán presentarse en congresos. El panel se
            describirá <b>por sus características de conjunto</b>, nunca persona a persona:{' '}
            {paciente
              ? 'cuántas personas participaron, sus edades, cuánto tiempo llevaban con dolor, en qué grado les afectaba, qué diagnósticos tenían y cómo de bien se manejan con la información escrita de salud. Nunca se publicará nada que permita reconocerte, ni se citará tu texto libre si pudiera identificarte.'
              : 'profesión, titulación, años de experiencia y ámbito de trabajo.'}
          </p>

          <h3>8 · Verificación</h3>
          <p>
            {paciente
              ? 'Tus respuestas no se comprueban con nadie ni se contrastan con tu historia clínica: nos fiamos de lo que cuentas, que es exactamente lo que queremos saber.'
              : 'Para garantizar la calidad del panel, el equipo puede comprobar a posteriori los datos declarados (titulación, publicaciones mediante los DOI que indiques). Declarar datos falsos supone la exclusión del estudio.'}
          </p>
          <button type="button" className="boton fantasma pequeno" onClick={() => setAbierta(false)}>Cerrar la información</button>
        </div>
      )}

      {/* El art. 9.2.a RGPD exige consentimiento EXPRESO para datos de salud: no vale que quede
          subsumido en un «acepto participar» genérico, tiene que nombrarlos. */}
      <label className="casilla" style={{ marginTop: '1rem' }}>
        <input type="checkbox" checked={!!valor} onChange={(e) => onCambio(e.target.checked)} />
        <span>
          <b>He leído la información, he podido preguntar y acepto participar</b> en las condiciones descritas, incluido el
          tratamiento de mis datos personales para las finalidades indicadas
          {paciente && <> y, <b>expresamente, el tratamiento de los datos sobre mi salud</b> (mi dolor, mis diagnósticos y mis
            tratamientos) para describir al grupo participante y analizar si los textos se entienden</>}.
        </span>
      </label>
    </div>
  )
}
