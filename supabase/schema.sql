-- ============================================================================
-- valida.edpain.com · esquema de la plataforma de validez de contenido
-- ============================================================================
--
-- DISEÑO DE ACCESO. No hay Supabase Auth para el panel: cada panelista tiene una
-- CLAVE de acceso (secreta, ~60 bits) y un CÓDIGO público (PAN-17). Las tablas viven
-- en el esquema `valida`, que NO está expuesto por la API: ni `anon` ni
-- `authenticated` tienen ningún permiso sobre ellas. Toda lectura y escritura pasa
-- por funciones `public.valida_*` SECURITY DEFINER que reciben la clave, la
-- comprueban contra su hash y devuelven solo lo que le toca a ese panelista.
--
-- Consecuencias que conviene tener presentes:
--   · La clave nunca se guarda en claro: solo `clave_hash = sha256(clave)`.
--   · La dirección editorial es un panelista con perfil `direccion`: misma mecánica.
--   · La importación del corpus entra por `valida_importar` con la clave de dirección,
--     así que no hace falta la clave de servicio de Supabase en ningún sitio.
--   · Los datos del panel NO se regeneran: ninguna función borra valoraciones.
--     Retirar un concepto del corpus lo marca `activo = false`; nada más.
--
-- Se ejecuta entero con:  supabase db query -f supabase/schema.sql --linked --project-ref <ref>
-- y es idempotente (CREATE IF NOT EXISTS / CREATE OR REPLACE) salvo donde se indica.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists valida;

-- ---------------------------------------------------------------------------
-- Configuración del estudio: las reglas se fijan ANTES de ver datos y quedan aquí
-- con fecha. Cambiar un umbral es editar una fila, y deja rastro.
-- ---------------------------------------------------------------------------
create table if not exists valida.estudios (
  id             smallint primary key,
  nombre         text not null,
  corpus_commit  text,
  semilla        text not null,
  fraccion       numeric(4,3) not null default 0.100,   -- proporción muestreada por dominio
  suelo          smallint not null default 8,           -- mínimo de conceptos por dominio
  k_jueces       smallint not null default 7,           -- expertos asignados por concepto
  k_paciente     smallint not null default 3,           -- personas con dolor por concepto
  capacidad      smallint not null default 80,          -- conceptos por experto (por defecto)
  capacidad_paciente smallint not null default 25,
  umbrales       jsonb not null default '{
    "icvi_n_pequeno": 1.0, "icvi_n_grande": 0.78, "n_corte_icvi": 6,
    "aiken": 0.70, "exigir_ic": true, "minimo_panel": 5, "desacuerdo": 0.30,
    "scvi_ave": 0.90, "paciente_comprension": 0.75, "minimo_paciente": 3,
    "estable_v": 0.10, "rondas_max": 3
  }'::jsonb,
  ronda_actual   smallint not null default 1,
  abierto_en     timestamptz not null default now(),
  cerrado_en     timestamptz,
  notas          text
);

-- Inscripción abierta (convocatoria pública): el servidor calcula la puntuación de Fehring del
-- perfil y solo crea el panelista si alcanza `fehring_minimo`. Dos salvaguardas: un código de
-- invitación que va en la convocatoria y un tope diario de solicitudes.
alter table valida.estudios add column if not exists inscripcion_abierta boolean not null default false;
alter table valida.estudios add column if not exists codigo_invitacion text;
alter table valida.estudios add column if not exists tope_solicitudes_dia smallint not null default 200;
alter table valida.estudios add column if not exists fehring_minimo smallint not null default 5;
alter table valida.estudios add column if not exists investigador_principal text default 'Dr. Raúl Ferrer-Peña';
alter table valida.estudios add column if not exists contacto_email text default 'estudio@edpain.com';
alter table valida.estudios add column if not exists comite_etica text;   -- dictamen, cuando lo haya
alter table valida.estudios add column if not exists grupo_autoria text default 'Grupo del Estudio EdPain';
-- Código de PRUEBAS: funciona con la inscripción CERRADA y crea panelistas marcados como prueba,
-- para ensayar el circuito completo antes de lanzar la convocatoria. Se borran de un clic.
alter table valida.estudios add column if not exists codigo_pruebas text;
-- Plazo por defecto que se le da a cada panelista desde que entra en una ronda.
alter table valida.estudios add column if not exists plazo_dias smallint not null default 10;

-- Las dimensiones del instrumento son datos, no código: cuatro hoy, cinco si se decide
-- separar corrección de representatividad. El wizard las lee de aquí.
create table if not exists valida.dimensiones (
  estudio_id   smallint not null references valida.estudios(id),
  clave        text not null,
  orden        smallint not null,
  nombre       text not null,
  afirmacion   text not null,
  ayuda        text,
  sobre_texto  text[] not null default '{}',   -- qué partes del concepto juzga
  quien        text not null default 'experto' check (quien in ('experto','paciente','ambos')),
  primary key (estudio_id, clave)
);

-- ---------------------------------------------------------------------------
-- El corpus, como proyección: lo que `pipeline/importar.py` trae de dist/kb.json.
-- Nunca se edita aquí. `hash` es Concepto.hash de kb.py; si cambia tras una
-- valoración, `cambiado_desde_valoracion` lo deja a la vista.
-- ---------------------------------------------------------------------------
create table if not exists valida.conceptos (
  id                      text primary key,              -- CPT-00001
  estudio_id              smallint not null references valida.estudios(id),
  dominio                 text not null,
  modulo                  text not null,
  titulo                  text not null,
  definicion              text,
  resumen                 text,
  explicacion_profesional text,
  explicacion_paciente    text,
  puntos_clave            text,
  advertencias            text,
  certeza                 text,
  tipo_afirmacion         text,
  exigencia_evidencia     text,                          -- PMD 8.4: qué evidencia exige este tipo
  controversia            boolean not null default false,
  nota_controversia       text,
  referencias             jsonb not null default '[]',   -- [{id, apa, nota_uso}]
  hash                    text not null,
  version                 integer,
  prn                     double precision not null,     -- número aleatorio permanente
  estratos                text[] not null default '{}',  -- aleatorio | controversia | cribado | calibracion
  senales                 jsonb not null default '[]',   -- señales de cribado (G11, A6, certeza)
  incluido                boolean not null default false,
  activo                  boolean not null default true,
  importado_en            timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),
  cambiado_desde_valoracion boolean not null default false
);
alter table valida.conceptos add column if not exists madurez text;               -- M0–M5, calculado por kb.py
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'valida' and table_name = 'conceptos' and column_name = 'conceptos_citados') then
    alter table valida.conceptos rename column conceptos_citados to entidades_citadas;
  end if;
end $$;
alter table valida.conceptos add column if not exists entidades_citadas jsonb not null default '[]';  -- [{id, nombre, tipo}]: conceptos, errores, metáforas, módulos…
create index if not exists conceptos_dom_mod on valida.conceptos (estudio_id, dominio, modulo);
create index if not exists conceptos_incluidos on valida.conceptos (estudio_id, incluido, activo);

-- Nombres de dominios y módulos, para que el wizard y el panel no enseñen «D11.M07».
create table if not exists valida.catalogo (
  id      text primary key,     -- D11 o D11.M07
  nombre  text not null,
  tipo    text not null check (tipo in ('dominio','modulo')),
  orden   integer
);
alter table valida.catalogo add column if not exists foco text;
alter table valida.catalogo add column if not exists conceptos jsonb not null default '[]';  -- módulos: [{id, titulo}] de TODO el corpus, para juzgar la exhaustividad

-- ---------------------------------------------------------------------------
-- El panel. Códigos, no nombres (PMD cap. 15). La correspondencia código↔persona
-- vive fuera de aquí, en el censo de la dirección editorial.
-- ---------------------------------------------------------------------------
create table if not exists valida.panelistas (
  id                   serial primary key,
  estudio_id           smallint not null references valida.estudios(id),
  codigo               text not null unique,             -- PAN-17 (público)
  clave_hash           text not null unique,             -- sha256(clave secreta), hex
  perfil               text not null check (perfil in ('experto','paciente','direccion')),
  disciplina           text,
  anios                smallint,
  dominios_competencia text[] not null default '{}',
  capacidad            smallint,                         -- null → la del estudio
  activo               boolean not null default true,
  perfil_completado    boolean not null default false,
  calibracion_hecha    boolean not null default false,
  alta_en              timestamptz not null default now(),
  ultimo_acceso        timestamptz,
  notas                text
);

alter table valida.panelistas add column if not exists es_prueba boolean not null default false;
alter table valida.panelistas add column if not exists plazo_dias_propio smallint;  -- null = el del estudio
alter table valida.panelistas add column if not exists perfil_datos jsonb not null default '{}';  -- expertise (Fehring/CREDES) y consentimiento; sin datos identificativos. (`perfil` es el rol)

-- IDENTIDAD, APARTE. Nombre, filiación y correo viven en su propia tabla y NO salen en el
-- paquete de datos del estudio (`valida_dir_datos`) ni en las exportaciones: el conjunto de
-- análisis queda seudonimizado —solo códigos— y la identidad se consulta con una función
-- específica de la dirección, para la autoría del «Grupo del Estudio EdPain», la trazabilidad
-- y la verificación a posteriori (DOI de sus publicaciones).
create table if not exists valida.identidades (
  panelista_id  integer primary key references valida.panelistas(id) on delete cascade,
  nombre        text not null,
  apellidos     text not null,
  email         text not null,
  filiacion     text,
  orcid         text,
  dois          text[] not null default '{}',
  creada_en     timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- CALENDARIO DE RONDAS. Cada ronda tiene su apertura y su cierre; el cierre es un tope duro
-- (después no se guarda nada), y por debajo cada panelista tiene su propio plazo personal.
create table if not exists valida.rondas (
  estudio_id  smallint not null references valida.estudios(id),
  ronda       smallint not null,
  abre_en     timestamptz not null default now(),
  cierra_en   timestamptz,
  notas       text,
  primary key (estudio_id, ronda)
);

-- PLAZO PERSONAL por panelista y ronda: empieza cuando se le asigna el bloque (o cuando se
-- registra) y dura `dias`. La dirección puede ampliarlo uno a uno sin tocar a los demás.
create table if not exists valida.plazos (
  panelista_id   integer not null references valida.panelistas(id) on delete cascade,
  ronda          smallint not null,
  inicio         timestamptz not null default now(),
  dias           smallint not null,
  motivo         text,
  actualizado_en timestamptz not null default now(),
  primary key (panelista_id, ronda)
);

-- Avisos ya enviados, para no repetirlos. Los que faltan se calculan al vuelo: si el panelista
-- termina su bloque deja de haber pendientes y los avisos dejan de salir solos.
create table if not exists valida.avisos (
  panelista_id integer not null references valida.panelistas(id) on delete cascade,
  ronda        smallint not null,
  tipo         text not null check (tipo in ('mitad', 'tres_dias', 'un_dia', 'vencido')),
  enviado_en   timestamptz not null default now(),
  pendientes   smallint,
  primary key (panelista_id, ronda, tipo)
);

create table if not exists valida.asignaciones (
  panelista_id  integer not null references valida.panelistas(id) on delete cascade,
  concepto_id   text not null references valida.conceptos(id),
  ronda         smallint not null default 1,
  orden         integer not null,
  estado        text not null default 'pendiente' check (estado in ('pendiente','hecha','abstenida')),
  asignada_en   timestamptz not null default now(),
  primary key (panelista_id, concepto_id, ronda)
);
create index if not exists asignaciones_concepto on valida.asignaciones (concepto_id, ronda);

-- Lo que devuelve el panel. ES DATO: no se regenera, no se borra.
create table if not exists valida.valoraciones (
  id                 bigserial primary key,
  panelista_id       integer not null references valida.panelistas(id) on delete cascade,
  concepto_id        text not null references valida.conceptos(id),
  ronda              smallint not null default 1,
  hash_concepto      text not null,                      -- versión del texto que se juzgó
  puntuaciones       jsonb not null default '{}',        -- {"relevancia":3, ...} 1-4
  abstencion         boolean not null default false,
  motivo_abstencion  text,
  banderas           jsonb not null default '{}',        -- {"seguridad":true,"certeza":"baja",...}
  comentario         text,
  ajustes            jsonb not null default '[]',        -- [{"parte","motivo","redaccion"}]
  paciente           jsonb,                              -- {"comprension","efecto","vetos":[]}
  completa           boolean not null default false,
  tiempo_ms          integer,
  creada_en          timestamptz not null default now(),
  actualizada_en     timestamptz not null default now(),
  unique (panelista_id, concepto_id, ronda)
);
create index if not exists valoraciones_concepto on valida.valoraciones (concepto_id, ronda);

-- Exhaustividad: la pregunta que no se puede hacer por concepto, solo por módulo.
create table if not exists valida.cobertura (
  panelista_id   integer not null references valida.panelistas(id) on delete cascade,
  modulo         text not null,
  ronda          smallint not null default 1,
  exhaustividad  smallint check (exhaustividad between 1 and 4),
  falta          text,
  sobra          text,
  creada_en      timestamptz not null default now(),
  primary key (panelista_id, modulo, ronda)
);

-- Conceptos de práctica: lo que el panel «suele ver» y por qué, para calibrar.
create table if not exists valida.calibracion (
  estudio_id   smallint not null references valida.estudios(id),
  concepto_id  text not null references valida.conceptos(id),
  orden        smallint not null,
  modelo       jsonb not null,     -- {"relevancia":4,...}
  explicacion  text not null,
  primary key (estudio_id, concepto_id)
);

-- Estado de las propuestas (redacciones alternativas) desde la dirección: no edita el
-- corpus, solo registra qué se hizo con cada una.
create table if not exists valida.propuestas_estado (
  valoracion_id  bigint not null references valida.valoraciones(id) on delete cascade,
  indice         smallint not null,
  estado         text not null check (estado in ('pendiente','aplicada','descartada')),
  nota           text,
  actualizado_en timestamptz not null default now(),
  primary key (valoracion_id, indice)
);

-- Cada solicitud de inscripción, aceptada o no: describe a quién llegó la convocatoria (CREDES).
create table if not exists valida.solicitudes (
  id            bigserial primary key,
  estudio_id    smallint not null references valida.estudios(id),
  creada_en     timestamptz not null default now(),
  aceptada      boolean not null,
  puntuacion    smallint not null,
  disciplina    text,
  anios         smallint,
  perfil        jsonb not null default '{}',
  panelista_id  integer
);

create table if not exists valida.eventos (
  id            bigserial primary key,
  panelista_id  integer,
  tipo          text not null,
  detalle       jsonb,
  en            timestamptz not null default now()
);
create index if not exists eventos_tipo on valida.eventos (tipo, en);

-- ---------------------------------------------------------------------------
-- Nadie entra al esquema por la API. Esto es lo que hace que las funciones de
-- abajo sean la única puerta.
-- ---------------------------------------------------------------------------
revoke all on schema valida from anon, authenticated;
revoke all on all tables in schema valida from anon, authenticated;
revoke all on all sequences in schema valida from anon, authenticated;
alter default privileges in schema valida revoke all on tables from anon, authenticated;

-- ============================================================================
-- FUNCIONES INTERNAS (esquema valida, no expuestas)
-- ============================================================================

create or replace function valida.hash_clave(clave text) returns text
language sql immutable as $$
  select encode(extensions.digest(clave, 'sha256'), 'hex')
$$;

-- Resuelve la clave a un panelista activo o falla. Registra los intentos fallidos.
create or replace function valida.quien(clave text) returns valida.panelistas
language plpgsql as $$
declare p valida.panelistas;
begin
  if clave is null or length(clave) < 8 then
    raise exception 'clave no válida' using errcode = '28000';
  end if;
  select * into p from valida.panelistas
   where clave_hash = valida.hash_clave(clave) and activo;
  if not found then
    insert into valida.eventos (tipo, detalle) values ('intento_fallido', jsonb_build_object('len', length(clave)));
    raise exception 'clave no válida' using errcode = '28000';
  end if;
  update valida.panelistas set ultimo_acceso = now() where id = p.id;
  return p;
end $$;

create or replace function valida.direccion(clave text) returns valida.panelistas
language plpgsql as $$
declare p valida.panelistas;
begin
  p := valida.quien(clave);
  if p.perfil <> 'direccion' then
    raise exception 'solo la dirección editorial' using errcode = '42501';
  end if;
  return p;
end $$;

-- Clave nueva: 12 caracteres de un alfabeto sin ambigüedades (sin 0/O/1/I/l), ~58 bits.
create or replace function valida.clave_nueva() returns text
language plpgsql as $$
declare
  alfabeto constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  s text := '';
  b bytea := extensions.gen_random_bytes(12);
  i int;
begin
  for i in 0..11 loop
    s := s || substr(alfabeto, (get_byte(b, i) % length(alfabeto)) + 1, 1);
  end loop;
  return substr(s, 1, 4) || '-' || substr(s, 5, 4) || '-' || substr(s, 9, 4);
end $$;

-- El plazo efectivo de un panelista en una ronda: su fin personal y el cierre de la ronda.
create or replace function valida.plazo_de(pid int, r int) returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'inicio', pl.inicio, 'dias', pl.dias,
    'fin', pl.inicio + make_interval(days => pl.dias),
    'cierra_ronda', rd.cierra_en, 'abre_ronda', rd.abre_en,
    'fin_efectivo', least(pl.inicio + make_interval(days => pl.dias), coalesce(rd.cierra_en, 'infinity'::timestamptz)),
    'dias_restantes', ceil(extract(epoch from (least(pl.inicio + make_interval(days => pl.dias),
                       coalesce(rd.cierra_en, 'infinity'::timestamptz)) - now())) / 86400.0),
    'vencido', least(pl.inicio + make_interval(days => pl.dias), coalesce(rd.cierra_en, 'infinity'::timestamptz)) < now())
  from valida.plazos pl
  left join valida.panelistas p on p.id = pl.panelista_id
  left join valida.rondas rd on rd.estudio_id = p.estudio_id and rd.ronda = pl.ronda
  where pl.panelista_id = pid and pl.ronda = r
$$;

-- Abre el plazo de un panelista en una ronda si aún no lo tiene.
create or replace function valida.abrir_plazo(pid int, r int) returns void
language plpgsql as $$
declare d int;
begin
  select coalesce(p.plazo_dias_propio, e.plazo_dias) into d
    from valida.panelistas p join valida.estudios e on e.id = p.estudio_id where p.id = pid;
  insert into valida.plazos (panelista_id, ronda, dias) values (pid, r, coalesce(d, 10))
  on conflict (panelista_id, ronda) do nothing;
end $$;

-- Guarda (o actualiza) la identidad del panelista. Se llama desde `valida_perfil` y
-- `valida_solicitar` con el bloque `identidad` del perfil; si viene vacío, no hace nada.
create or replace function valida.guardar_identidad(pid int, ident jsonb) returns void
language plpgsql as $$
begin
  if ident is null or coalesce(ident->>'email', '') = '' then return; end if;
  if ident->>'email' !~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' then
    raise exception 'el correo no tiene un formato válido' using errcode = '22023';
  end if;
  insert into valida.identidades (panelista_id, nombre, apellidos, email, filiacion, orcid, dois)
  values (pid, trim(coalesce(ident->>'nombre', '')), trim(coalesce(ident->>'apellidos', '')),
          lower(trim(ident->>'email')), nullif(trim(coalesce(ident->>'filiacion', '')), ''),
          nullif(trim(coalesce(ident->>'orcid', '')), ''),
          coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(coalesce(ident->'dois', '[]'::jsonb)) x where trim(x) <> ''), '{}'))
  on conflict (panelista_id) do update set
    nombre = excluded.nombre, apellidos = excluded.apellidos, email = excluded.email,
    filiacion = excluded.filiacion, orcid = excluded.orcid, dois = excluded.dois,
    actualizada_en = now();
end $$;

-- Puntuación de Fehring (1987) adaptada; la misma regla que src/lib/perfil.js (tests allí).
create or replace function valida.fehring(perfil jsonb, anios int) returns int
language sql immutable as $$
  select least(14,
    (case when perfil->>'titulacion' in ('master','doctorado') then 4 else 0 end)
    + (case when perfil->>'titulacion' = 'doctorado' then 2 else 0 end)
    + (case when coalesce((perfil->>'formacion_dolor')::boolean, false) then 2 else 0 end)
    + (case when coalesce(anios, 0) >= 1 then 1 else 0 end)
    + (case when coalesce(perfil->>'publicaciones_dolor', '0') not in ('', '0') then 2 else 0 end)
    + (case when coalesce((perfil->>'investigacion_dolor')::boolean, false) then 2 else 0 end)
    + (case when coalesce((perfil->>'formacion_dolor')::boolean, false)
                and coalesce(perfil->>'formacion_dolor_cual', '') ~* 'm[aá]ster|doctor|tesis' then 1 else 0 end))
$$;

-- Asigna a UN panelista experto hasta su capacidad: primero los conceptos de sus dominios de
-- competencia con menos jueces, después el resto si aún caben generalistas. Orden de lectura
-- agrupado por módulo, como en valida_dir_asignar.
create or replace function valida.asignar_a(pid int, max_generalistas int default 3) returns int
language plpgsql as $$
declare
  p valida.panelistas; e valida.estudios; r int; cap int; hueco int; n int := 0; c record;
begin
  select * into p from valida.panelistas where id = pid;
  select * into e from valida.estudios where id = p.estudio_id;
  r := e.ronda_actual;
  cap := coalesce(p.capacidad, e.capacidad);
  select cap - count(*) into hueco from valida.asignaciones a where a.panelista_id = pid and a.ronda = r;
  for c in
    select co.id, (co.dominio = any(p.dominios_competencia)) as competente,
           (select count(*) from valida.asignaciones a join valida.panelistas q on q.id = a.panelista_id
             where a.concepto_id = co.id and a.ronda = r and q.perfil = 'experto') as jueces,
           (select count(*) from valida.asignaciones a join valida.panelistas q on q.id = a.panelista_id
             where a.concepto_id = co.id and a.ronda = r and q.perfil = 'experto'
               and not (co.dominio = any(q.dominios_competencia))) as generalistas
      from valida.conceptos co
     where co.estudio_id = e.id and co.incluido and co.activo
       and not exists (select 1 from valida.asignaciones a where a.panelista_id = pid and a.concepto_id = co.id and a.ronda = r)
     order by (co.dominio = any(p.dominios_competencia)) desc, 3 asc, co.prn
  loop
    exit when n >= hueco;
    continue when c.jueces >= e.k_jueces;
    continue when not c.competente and c.generalistas >= max_generalistas;
    insert into valida.asignaciones (panelista_id, concepto_id, ronda, orden) values (pid, c.id, r, 0);
    n := n + 1;
  end loop;
  update valida.asignaciones a set orden = o.orden
    from (select a2.concepto_id,
                 row_number() over (order by md5(e.semilla || p.codigo || co.modulo), md5(e.semilla || p.codigo || co.id)) as orden
            from valida.asignaciones a2 join valida.conceptos co on co.id = a2.concepto_id
           where a2.panelista_id = pid and a2.ronda = r) o
   where a.panelista_id = pid and a.concepto_id = o.concepto_id and a.ronda = r;
  if n > 0 then perform valida.abrir_plazo(pid, r); end if;
  return n;
end $$;

-- ============================================================================
-- FUNCIONES PÚBLICAS (sin clave): lo que ve quien llega por la convocatoria
-- ============================================================================

create or replace function public.valida_publico(estudio int default 1) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare e valida.estudios;
begin
  select * into e from valida.estudios where id = estudio;
  if not found then raise exception 'estudio no encontrado' using errcode = '22023'; end if;
  return jsonb_build_object(
    'nombre', e.nombre, 'inscripcion_abierta', e.inscripcion_abierta and e.cerrado_en is null,
    'requiere_codigo', e.codigo_invitacion is not null and e.codigo_invitacion <> '',
    'pruebas', e.codigo_pruebas is not null and e.codigo_pruebas <> '' and e.cerrado_en is null,
    'fehring_minimo', e.fehring_minimo, 'investigador_principal', e.investigador_principal,
    'contacto_email', e.contacto_email, 'comite_etica', e.comite_etica, 'grupo_autoria', e.grupo_autoria,
    'dominios', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nombre', nombre) order by orden), '[]')
                 from valida.catalogo where tipo = 'dominio'));
end $$;

-- Solicitud de inscripción. Devuelve la clave EN CLARO una sola vez si se acepta.
create or replace function public.valida_solicitar(estudio int, codigo_invitacion text, disciplina text, anios int, dominios text[], perfil jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  e valida.estudios; puntos int; hoy int; nuevo_id int; nuevo_codigo text; nueva text; siguiente int; asignados int;
  dado text := lower(trim(coalesce(codigo_invitacion, '')));
  prueba boolean := false;
begin
  select * into e from valida.estudios where id = estudio;
  if not found or e.cerrado_en is not null then
    raise exception 'la inscripción no está abierta' using errcode = '42501';
  end if;
  -- Con la inscripción cerrada solo entra quien traiga el código de pruebas.
  if e.codigo_pruebas is not null and e.codigo_pruebas <> '' and dado = lower(trim(e.codigo_pruebas)) then
    prueba := true;
  elsif not e.inscripcion_abierta then
    raise exception 'la inscripción no está abierta' using errcode = '42501';
  elsif e.codigo_invitacion is not null and e.codigo_invitacion <> ''
     and dado <> lower(trim(e.codigo_invitacion)) then
    raise exception 'el código de invitación no es válido' using errcode = '28000';
  end if;
  select count(*) into hoy from valida.solicitudes s where s.estudio_id = e.id and s.creada_en > now() - interval '1 day';
  if hoy >= e.tope_solicitudes_dia then
    raise exception 'se ha alcanzado el máximo de solicitudes de hoy; inténtalo mañana' using errcode = '42501';
  end if;
  if coalesce((perfil->>'consentimiento')::boolean, false) is not true then
    raise exception 'falta el consentimiento' using errcode = '22023';
  end if;
  if coalesce(array_length(dominios, 1), 0) = 0 then
    raise exception 'hace falta al menos un dominio de competencia' using errcode = '22023';
  end if;
  puntos := valida.fehring(perfil, anios);

  if puntos < e.fehring_minimo then
    insert into valida.solicitudes (estudio_id, aceptada, puntuacion, disciplina, anios, perfil)
    values (e.id, false, puntos, disciplina, anios, perfil - 'consentimiento_en' - 'identidad');
    return jsonb_build_object('aceptado', false, 'puntuacion', puntos, 'minimo', e.fehring_minimo);
  end if;

  -- Código PAN-nnn correlativo; la clave se genera aquí y no se vuelve a ver.
  select coalesce(max(substring(codigo from '^PAN-(\d+)$')::int), 0) + 1 into siguiente
    from valida.panelistas where estudio_id = e.id and codigo ~ '^PAN-\d+$';
  nuevo_codigo := 'PAN-' || lpad(siguiente::text, 2, '0');
  nueva := valida.clave_nueva();
  insert into valida.panelistas (estudio_id, codigo, clave_hash, perfil, disciplina, anios, dominios_competencia,
                                 perfil_completado, notas)
  values (e.id, nuevo_codigo, valida.hash_clave(nueva), 'experto', disciplina, anios, dominios, true,
          case when prueba then 'PRUEBA · ' else 'inscripción abierta · ' end || 'Fehring ' || puntos)
  returning id into nuevo_id;
  update valida.panelistas set perfil_datos = valida_solicitar.perfil - 'identidad', es_prueba = prueba where id = nuevo_id;
  perform valida.guardar_identidad(nuevo_id, valida_solicitar.perfil->'identidad');
  insert into valida.solicitudes (estudio_id, aceptada, puntuacion, disciplina, anios, perfil, panelista_id)
  values (e.id, true, puntos, disciplina, anios, perfil - 'consentimiento_en' - 'identidad', nuevo_id);
  asignados := valida.asignar_a(nuevo_id);
  insert into valida.eventos (panelista_id, tipo, detalle) values (nuevo_id, 'inscripcion', jsonb_build_object('puntuacion', puntos, 'asignados', asignados));
  return jsonb_build_object('aceptado', true, 'codigo', nuevo_codigo, 'clave', nueva, 'puntuacion', puntos, 'asignados', asignados, 'prueba', prueba);
end $$;

-- ============================================================================
-- FUNCIONES DEL PANELISTA (public.valida_*, expuestas por la API)
-- ============================================================================

-- Entrar: devuelve quién es y cómo está configurado el estudio.
create or replace function public.valida_entrar(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  p valida.panelistas;
  e valida.estudios;
  dims jsonb;
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'clave', d.clave, 'orden', d.orden, 'nombre', d.nombre, 'afirmacion', d.afirmacion,
           'ayuda', d.ayuda, 'sobre_texto', d.sobre_texto, 'quien', d.quien) order by d.orden), '[]')
    into dims from valida.dimensiones d where d.estudio_id = e.id;
  insert into valida.eventos (panelista_id, tipo) values (p.id, 'entrada');
  return jsonb_build_object(
    'codigo', p.codigo, 'perfil', p.perfil, 'disciplina', p.disciplina, 'anios', p.anios,
    'dominios_competencia', p.dominios_competencia, 'perfil_datos', p.perfil_datos,
    'plazo', valida.plazo_de(p.id, e.ronda_actual),
    'perfil_completado', p.perfil_completado, 'calibracion_hecha', p.calibracion_hecha,
    'estudio', jsonb_build_object('id', e.id, 'nombre', e.nombre, 'ronda_actual', e.ronda_actual,
                                  'umbrales', e.umbrales, 'dimensiones', dims,
                                  'investigador_principal', e.investigador_principal, 'contacto_email', e.contacto_email,
                                  'comite_etica', e.comite_etica, 'grupo_autoria', e.grupo_autoria,
                                  'cerrado', e.cerrado_en is not null));
end $$;

drop function if exists public.valida_perfil(text, text, integer, text[]);
create or replace function public.valida_perfil(clave text, disciplina text, anios int, dominios text[], perfil jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare p valida.panelistas;
begin
  p := valida.quien(clave);
  if coalesce((perfil->>'consentimiento')::boolean, false) is not true then
    raise exception 'falta el consentimiento' using errcode = '22023';
  end if;
  update valida.panelistas
     set disciplina = valida_perfil.disciplina, anios = valida_perfil.anios,
         dominios_competencia = coalesce(dominios, '{}'), perfil_completado = true,
         perfil_datos = coalesce(valida_perfil.perfil, '{}'::jsonb) - 'identidad'
   where id = p.id;
  perform valida.guardar_identidad(p.id, valida_perfil.perfil->'identidad');
  insert into valida.eventos (panelista_id, tipo) values (p.id, 'perfil');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.valida_calibracion_hecha(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare p valida.panelistas;
begin
  p := valida.quien(clave);
  update valida.panelistas set calibracion_hecha = true where id = p.id;
  insert into valida.eventos (panelista_id, tipo) values (p.id, 'calibracion');
  return jsonb_build_object('ok', true);
end $$;

-- Los conceptos de práctica, con su modelo. Solo para el perfil experto.
create or replace function public.valida_calibracion(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare p valida.panelistas;
begin
  p := valida.quien(clave);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'orden', k.orden, 'modelo', k.modelo, 'explicacion', k.explicacion,
      'concepto', valida.concepto_json(c, p.perfil)) order by k.orden), '[]')
    from valida.calibracion k join valida.conceptos c on c.id = k.concepto_id
    where k.estudio_id = p.estudio_id);
end $$;

-- Un concepto, recortado según el perfil: el panel de paciente NO recibe el texto
-- profesional (requisito metodológico, no ahorro de bytes).
create or replace function valida.concepto_json(c valida.conceptos, perfil text) returns jsonb
language sql stable as $$
  select case when perfil = 'paciente' then
    jsonb_build_object('id', c.id, 'dominio', c.dominio, 'modulo', c.modulo, 'titulo', c.titulo,
                       'explicacion_paciente', c.explicacion_paciente, 'hash', c.hash)
  else
    jsonb_build_object('id', c.id, 'dominio', c.dominio, 'modulo', c.modulo, 'titulo', c.titulo,
                       'definicion', c.definicion, 'resumen', c.resumen,
                       'explicacion_profesional', c.explicacion_profesional,
                       'explicacion_paciente', c.explicacion_paciente,
                       'puntos_clave', c.puntos_clave, 'advertencias', c.advertencias,
                       'certeza', c.certeza, 'tipo_afirmacion', c.tipo_afirmacion,
                       'exigencia_evidencia', c.exigencia_evidencia,
                       'controversia', c.controversia, 'nota_controversia', c.nota_controversia,
                       'referencias', c.referencias, 'estratos', c.estratos, 'hash', c.hash,
                       'madurez', c.madurez, 'entidades_citadas', c.entidades_citadas)
  end
$$;

-- El bloque del panelista en la ronda actual: lista ligera (sin textos) + módulos.
create or replace function public.valida_bloque(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  p valida.panelistas;
  e valida.estudios;
  items jsonb; mods jsonb; cob jsonb;
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'dominio', c.dominio, 'modulo', c.modulo, 'titulo', c.titulo,
      'orden', a.orden, 'estado', a.estado,
      'completa', coalesce(v.completa, false), 'abstencion', coalesce(v.abstencion, false),
      'cambiado', c.cambiado_desde_valoracion and v.id is not null and v.hash_concepto <> c.hash
    ) order by a.orden), '[]') into items
    from valida.asignaciones a
    join valida.conceptos c on c.id = a.concepto_id
    left join valida.valoraciones v on v.panelista_id = a.panelista_id
         and v.concepto_id = a.concepto_id and v.ronda = a.ronda
   where a.panelista_id = p.id and a.ronda = e.ronda_actual and c.activo;
  select coalesce(jsonb_object_agg(k.id, k.nombre), '{}') into mods from valida.catalogo k;
  select coalesce(jsonb_agg(jsonb_build_object('modulo', modulo, 'exhaustividad', exhaustividad,
                  'falta', falta, 'sobra', sobra)), '[]') into cob
    from valida.cobertura where panelista_id = p.id and ronda = e.ronda_actual;
  return jsonb_build_object('ronda', e.ronda_actual, 'items', items, 'nombres', mods, 'cobertura', cob,
                            'plazo', valida.plazo_de(p.id, e.ronda_actual));
end $$;

-- Un concepto con la valoración propia (si la hay) y, en ronda ≥ 2, la devolución del grupo.
create or replace function public.valida_concepto(clave text, concepto_id text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  p valida.panelistas;
  e valida.estudios;
  c valida.conceptos;
  v valida.valoraciones;
  grupo jsonb := null;
  previa jsonb := null;
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  if not exists (select 1 from valida.asignaciones a
                  where a.panelista_id = p.id and a.concepto_id = valida_concepto.concepto_id
                    and a.ronda = e.ronda_actual) then
    raise exception 'concepto no asignado' using errcode = '42501';
  end if;
  select * into c from valida.conceptos where id = valida_concepto.concepto_id;
  select * into v from valida.valoraciones
   where panelista_id = p.id and valoraciones.concepto_id = valida_concepto.concepto_id and ronda = e.ronda_actual;

  if e.ronda_actual >= 2 then
    -- Histograma del grupo en la ronda anterior, por dimensión, y la respuesta propia.
    select jsonb_object_agg(dim, hist) into grupo from (
      select d.key as dim,
             jsonb_build_object('n', count(*),
               'h', jsonb_build_object('1', count(*) filter (where d.value::int = 1),
                                       '2', count(*) filter (where d.value::int = 2),
                                       '3', count(*) filter (where d.value::int = 3),
                                       '4', count(*) filter (where d.value::int = 4)),
               'mediana', percentile_cont(0.5) within group (order by d.value::int)) as hist
        from valida.valoraciones vv, jsonb_each_text(vv.puntuaciones) d
       where vv.concepto_id = c.id and vv.ronda = e.ronda_actual - 1 and not vv.abstencion and vv.completa
       group by d.key) h;
    select to_jsonb(pv) - 'id' - 'panelista_id' into previa from valida.valoraciones pv
     where pv.panelista_id = p.id and pv.concepto_id = c.id and pv.ronda = e.ronda_actual - 1;
  end if;

  insert into valida.eventos (panelista_id, tipo, detalle) values (p.id, 'abre_concepto', jsonb_build_object('id', c.id));
  return jsonb_build_object(
    'concepto', valida.concepto_json(c, p.perfil),
    'valoracion', case when v.id is null then null else to_jsonb(v) - 'panelista_id' end,
    'grupo', grupo, 'previa', previa, 'ronda', e.ronda_actual);
end $$;

-- Guardar (crear o actualizar) la valoración de un concepto asignado. Valida rangos.
create or replace function public.valida_guardar(clave text, concepto_id text, datos jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
#variable_conflict use_column
declare
  p valida.panelistas;
  e valida.estudios;
  c valida.conceptos;
  v valida.valoraciones;
  punt jsonb := coalesce(datos->'puntuaciones', '{}'::jsonb);
  abst boolean := coalesce((datos->>'abstencion')::boolean, false);
  k text; val text;
  completa boolean;
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  if e.cerrado_en is not null then
    raise exception 'el estudio está cerrado' using errcode = '42501';
  end if;
  if coalesce((valida.plazo_de(p.id, e.ronda_actual)->>'vencido')::boolean, false) then
    raise exception 'tu plazo para esta ronda ha terminado; escribe a la dirección del estudio si necesitas una ampliación' using errcode = '42501';
  end if;
  if not exists (select 1 from valida.asignaciones a
                  where a.panelista_id = p.id and a.concepto_id = valida_guardar.concepto_id and a.ronda = e.ronda_actual) then
    raise exception 'concepto no asignado' using errcode = '42501';
  end if;
  select * into c from valida.conceptos where id = valida_guardar.concepto_id;

  -- Rango 1-4 en cada dimensión que venga informada.
  for k, val in select * from jsonb_each_text(punt) loop
    if val !~ '^[1-4]$' then
      raise exception 'puntuación fuera de rango en %', k using errcode = '22023';
    end if;
  end loop;

  -- Completa = abstención, o todas las dimensiones de su perfil puntuadas (experto),
  -- o las tres respuestas del instrumento de paciente.
  if p.perfil = 'paciente' then
    completa := abst or (datos->'paciente'->>'comprension') is not null and (datos->'paciente'->>'efecto') is not null;
  else
    completa := abst or not exists (
      select 1 from valida.dimensiones d
       where d.estudio_id = e.id and d.quien in ('experto','ambos') and punt->>d.clave is null);
  end if;
  -- Si algo está en 1 o 2, hace falta al menos un ajuste o comentario (branching del wizard).
  if completa and not abst and p.perfil <> 'paciente' then
    if exists (select 1 from jsonb_each_text(punt) x where x.value::int <= 2)
       and coalesce(jsonb_array_length(datos->'ajustes'), 0) = 0
       and coalesce(datos->>'comentario', '') = '' then
      completa := false;
    end if;
  end if;

  insert into valida.valoraciones as vv
      (panelista_id, concepto_id, ronda, hash_concepto, puntuaciones, abstencion, motivo_abstencion,
       banderas, comentario, ajustes, paciente, completa, tiempo_ms)
  values (p.id, c.id, e.ronda_actual, c.hash, punt, abst, datos->>'motivo_abstencion',
          coalesce(datos->'banderas', '{}'::jsonb), datos->>'comentario',
          coalesce(datos->'ajustes', '[]'::jsonb), datos->'paciente', completa,
          nullif(datos->>'tiempo_ms', '')::int)
  on conflict (panelista_id, concepto_id, ronda) do update set
      hash_concepto = excluded.hash_concepto, puntuaciones = excluded.puntuaciones,
      abstencion = excluded.abstencion, motivo_abstencion = excluded.motivo_abstencion,
      banderas = excluded.banderas, comentario = excluded.comentario, ajustes = excluded.ajustes,
      paciente = excluded.paciente, completa = excluded.completa,
      tiempo_ms = coalesce(vv.tiempo_ms, 0) + coalesce(excluded.tiempo_ms, 0),
      actualizada_en = now()
  returning * into v;

  update valida.asignaciones set estado = case when abst then 'abstenida' when completa then 'hecha' else 'pendiente' end
   where panelista_id = p.id and asignaciones.concepto_id = c.id and ronda = e.ronda_actual;

  return jsonb_build_object('ok', true, 'completa', completa, 'id', v.id);
end $$;

create or replace function public.valida_cobertura(clave text, modulo text, exhaustividad int, falta text, sobra text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
#variable_conflict use_column
declare p valida.panelistas; e valida.estudios;
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  if exhaustividad is not null and exhaustividad not between 1 and 4 then
    raise exception 'exhaustividad fuera de rango' using errcode = '22023';
  end if;
  if not exists (select 1 from valida.asignaciones a join valida.conceptos c on c.id = a.concepto_id
                  where a.panelista_id = p.id and a.ronda = e.ronda_actual and c.modulo = valida_cobertura.modulo) then
    raise exception 'módulo no asignado' using errcode = '42501';
  end if;
  insert into valida.cobertura (panelista_id, modulo, ronda, exhaustividad, falta, sobra)
  values (p.id, modulo, e.ronda_actual, exhaustividad, falta, sobra)
  on conflict (panelista_id, modulo, ronda) do update
     set exhaustividad = excluded.exhaustividad, falta = excluded.falta, sobra = excluded.sobra;
  return jsonb_build_object('ok', true);
end $$;

-- El módulo entero —nombre, foco y TODOS sus títulos— para la pregunta de exhaustividad: con
-- uno o dos conceptos muestreados no se puede juzgar si falta algo. Solo títulos, no texto.
create or replace function public.valida_modulo(clave text, modulo text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare p valida.panelistas; e valida.estudios; k valida.catalogo; asignados text[];
begin
  p := valida.quien(clave);
  select * into e from valida.estudios where id = p.estudio_id;
  if not exists (select 1 from valida.asignaciones a join valida.conceptos c on c.id = a.concepto_id
                  where a.panelista_id = p.id and a.ronda = e.ronda_actual and c.modulo = valida_modulo.modulo) then
    raise exception 'módulo no asignado' using errcode = '42501';
  end if;
  select * into k from valida.catalogo where id = valida_modulo.modulo;
  select coalesce(array_agg(a.concepto_id), '{}') into asignados
    from valida.asignaciones a where a.panelista_id = p.id and a.ronda = e.ronda_actual;
  return jsonb_build_object(
    'id', valida_modulo.modulo, 'nombre', coalesce(k.nombre, valida_modulo.modulo), 'foco', k.foco,
    'dominio', split_part(valida_modulo.modulo, '.', 1),
    'dominio_nombre', (select nombre from valida.catalogo where id = split_part(valida_modulo.modulo, '.', 1)),
    'conceptos', (select coalesce(jsonb_agg(jsonb_build_object('id', x->>'id', 'titulo', x->>'titulo',
                                  'en_tu_bloque', (x->>'id') = any(asignados))), '[]')
                  from jsonb_array_elements(coalesce(k.conceptos, '[]'::jsonb)) x));
end $$;

create or replace function public.valida_evento(clave text, tipo text, detalle jsonb) returns void
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare p valida.panelistas;
begin
  p := valida.quien(clave);
  if tipo !~ '^[a-z_]{2,40}$' then return; end if;
  insert into valida.eventos (panelista_id, tipo, detalle) values (p.id, tipo, detalle);
end $$;

-- ============================================================================
-- FUNCIONES DE LA DIRECCIÓN EDITORIAL
-- ============================================================================

-- Importar conceptos (desde pipeline/importar.py). Upsert por id; nunca borra.
-- Si el hash cambia y ya hay valoraciones, marca `cambiado_desde_valoracion`.
create or replace function public.valida_importar(clave text, estudio int, conceptos jsonb, catalogo jsonb, retirar text[]) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  d valida.panelistas;
  fila jsonb;
  n_nuevos int := 0; n_cambiados int := 0; n_iguales int := 0; n_retirados int := 0;
  existente valida.conceptos;
begin
  d := valida.direccion(clave);
  for fila in select * from jsonb_array_elements(coalesce(catalogo, '[]'::jsonb)) loop
    insert into valida.catalogo (id, nombre, tipo, orden, foco, conceptos)
    values (fila->>'id', fila->>'nombre', fila->>'tipo', (fila->>'orden')::int, fila->>'foco', coalesce(fila->'conceptos', '[]'::jsonb))
    on conflict (id) do update set nombre = excluded.nombre, orden = excluded.orden, foco = excluded.foco, conceptos = excluded.conceptos;
  end loop;

  for fila in select * from jsonb_array_elements(conceptos) loop
    select * into existente from valida.conceptos where id = fila->>'id';
    if not found then
      n_nuevos := n_nuevos + 1;
    elsif existente.hash <> (fila->>'hash') then
      n_cambiados := n_cambiados + 1;
    else
      n_iguales := n_iguales + 1;
    end if;
    insert into valida.conceptos as c (id, estudio_id, dominio, modulo, titulo, definicion, resumen,
        explicacion_profesional, explicacion_paciente, puntos_clave, advertencias, certeza,
        tipo_afirmacion, exigencia_evidencia, controversia, nota_controversia, referencias, hash,
        version, prn, estratos, senales, incluido, activo, madurez, entidades_citadas)
    values (fila->>'id', estudio, fila->>'dominio', fila->>'modulo', fila->>'titulo',
        fila->>'definicion', fila->>'resumen', fila->>'explicacion_profesional',
        fila->>'explicacion_paciente', fila->>'puntos_clave', fila->>'advertencias',
        fila->>'certeza', fila->>'tipo_afirmacion', fila->>'exigencia_evidencia',
        coalesce((fila->>'controversia')::boolean, false), fila->>'nota_controversia',
        coalesce(fila->'referencias', '[]'::jsonb), fila->>'hash', (fila->>'version')::int,
        (fila->>'prn')::double precision,
        coalesce((select array_agg(x) from jsonb_array_elements_text(fila->'estratos') x), '{}'),
        coalesce(fila->'senales', '[]'::jsonb), coalesce((fila->>'incluido')::boolean, false), true,
        fila->>'madurez', coalesce(fila->'entidades_citadas', '[]'::jsonb))
    on conflict (id) do update set
        dominio = excluded.dominio, modulo = excluded.modulo, titulo = excluded.titulo,
        definicion = excluded.definicion, resumen = excluded.resumen,
        explicacion_profesional = excluded.explicacion_profesional,
        explicacion_paciente = excluded.explicacion_paciente, puntos_clave = excluded.puntos_clave,
        advertencias = excluded.advertencias, certeza = excluded.certeza,
        tipo_afirmacion = excluded.tipo_afirmacion, exigencia_evidencia = excluded.exigencia_evidencia,
        controversia = excluded.controversia, nota_controversia = excluded.nota_controversia,
        referencias = excluded.referencias, version = excluded.version,
        estratos = excluded.estratos, senales = excluded.senales,
        madurez = excluded.madurez, entidades_citadas = excluded.entidades_citadas,
        -- incluido solo sube: un concepto ya incluido no se excluye por una reimportación
        incluido = c.incluido or excluded.incluido,
        activo = true,
        cambiado_desde_valoracion = c.cambiado_desde_valoracion
            or (c.hash <> excluded.hash and exists (select 1 from valida.valoraciones v where v.concepto_id = c.id)),
        hash = excluded.hash, actualizado_en = case when c.hash <> excluded.hash then now() else c.actualizado_en end;
  end loop;

  if retirar is not null then
    update valida.conceptos set activo = false where id = any(retirar) and activo;
    get diagnostics n_retirados = row_count;
  end if;

  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'importacion',
    jsonb_build_object('nuevos', n_nuevos, 'cambiados', n_cambiados, 'iguales', n_iguales, 'retirados', n_retirados));
  return jsonb_build_object('nuevos', n_nuevos, 'cambiados', n_cambiados, 'iguales', n_iguales, 'retirados', n_retirados);
end $$;

-- Configurar el estudio (crear o actualizar) y sus dimensiones.
create or replace function public.valida_dir_estudio(clave text, datos jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; fila jsonb; eid int := (datos->>'id')::int;
begin
  d := valida.direccion(clave);
  update valida.estudios set
      nombre = coalesce(datos->>'nombre', nombre), corpus_commit = coalesce(datos->>'corpus_commit', corpus_commit),
      fraccion = coalesce((datos->>'fraccion')::numeric, fraccion), suelo = coalesce((datos->>'suelo')::int, suelo),
      k_jueces = coalesce((datos->>'k_jueces')::int, k_jueces), k_paciente = coalesce((datos->>'k_paciente')::int, k_paciente),
      capacidad = coalesce((datos->>'capacidad')::int, capacidad),
     plazo_dias_propio = case when datos ? 'plazo_dias_propio' then nullif(datos->>'plazo_dias_propio', '')::int else plazo_dias_propio end,
      capacidad_paciente = coalesce((datos->>'capacidad_paciente')::int, capacidad_paciente),
      umbrales = coalesce(datos->'umbrales', umbrales), notas = coalesce(datos->>'notas', notas),
      inscripcion_abierta = coalesce((datos->>'inscripcion_abierta')::boolean, inscripcion_abierta),
      codigo_invitacion = case when datos ? 'codigo_invitacion' then nullif(trim(datos->>'codigo_invitacion'), '') else codigo_invitacion end,
      tope_solicitudes_dia = coalesce((datos->>'tope_solicitudes_dia')::int, tope_solicitudes_dia),
      fehring_minimo = coalesce((datos->>'fehring_minimo')::int, fehring_minimo),
      investigador_principal = coalesce(datos->>'investigador_principal', investigador_principal),
      contacto_email = coalesce(datos->>'contacto_email', contacto_email),
      comite_etica = case when datos ? 'comite_etica' then nullif(trim(datos->>'comite_etica'), '') else comite_etica end,
      grupo_autoria = coalesce(datos->>'grupo_autoria', grupo_autoria),
      plazo_dias = coalesce((datos->>'plazo_dias')::int, plazo_dias)
   where id = eid;
  if datos ? 'dimensiones' then
    delete from valida.dimensiones where estudio_id = eid;
    for fila in select * from jsonb_array_elements(datos->'dimensiones') loop
      insert into valida.dimensiones (estudio_id, clave, orden, nombre, afirmacion, ayuda, sobre_texto, quien)
      values (eid, fila->>'clave', (fila->>'orden')::int, fila->>'nombre', fila->>'afirmacion', fila->>'ayuda',
              coalesce((select array_agg(x) from jsonb_array_elements_text(fila->'sobre_texto') x), '{}'),
              coalesce(fila->>'quien', 'experto'));
    end loop;
  end if;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'estudio_config', datos - 'dimensiones');
  return jsonb_build_object('ok', true);
end $$;

-- Alta de panelista: devuelve la clave EN CLARO una sola vez. No se vuelve a poder leer.
create or replace function public.valida_dir_alta(clave text, codigo text, perfil text, disciplina text, dominios text[], capacidad int, notas text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; nueva text; nuevo_id int;
begin
  d := valida.direccion(clave);
  if codigo !~ '^[A-Z]{2,4}-[0-9]{2,3}$' then
    raise exception 'código con formato PAN-17' using errcode = '22023';
  end if;
  nueva := valida.clave_nueva();
  insert into valida.panelistas (estudio_id, codigo, clave_hash, perfil, disciplina, dominios_competencia, capacidad, notas)
  values (d.estudio_id, codigo, valida.hash_clave(nueva), perfil, disciplina, coalesce(dominios, '{}'), capacidad, notas)
  returning id into nuevo_id;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'alta_panelista', jsonb_build_object('codigo', codigo, 'perfil', perfil));
  return jsonb_build_object('id', nuevo_id, 'codigo', codigo, 'clave', nueva);
end $$;

-- Regenerar la clave de un panelista (si la perdió). La anterior deja de valer.
create or replace function public.valida_dir_reclave(clave text, codigo text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; nueva text;
begin
  d := valida.direccion(clave);
  nueva := valida.clave_nueva();
  update valida.panelistas set clave_hash = valida.hash_clave(nueva) where panelistas.codigo = valida_dir_reclave.codigo;
  if not found then raise exception 'panelista no encontrado' using errcode = '22023'; end if;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'reclave', jsonb_build_object('codigo', codigo));
  return jsonb_build_object('codigo', codigo, 'clave', nueva);
end $$;

create or replace function public.valida_dir_panelista(clave text, codigo text, datos jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas;
begin
  d := valida.direccion(clave);
  update valida.panelistas set
     activo = coalesce((datos->>'activo')::boolean, activo),
     capacidad = coalesce((datos->>'capacidad')::int, capacidad),
     plazo_dias_propio = case when datos ? 'plazo_dias_propio' then nullif(datos->>'plazo_dias_propio', '')::int else plazo_dias_propio end,
     dominios_competencia = coalesce((select array_agg(x) from jsonb_array_elements_text(datos->'dominios_competencia') x), dominios_competencia),
     disciplina = coalesce(datos->>'disciplina', disciplina),
     notas = coalesce(datos->>'notas', notas)
   where panelistas.codigo = valida_dir_panelista.codigo;
  return jsonb_build_object('ok', found);
end $$;

-- ---------------------------------------------------------------------------
-- ASIGNACIÓN: bloques incompletos equilibrados.
--
-- Para cada concepto incluido y activo que tenga menos de k jueces en la ronda, se
-- eligen los que faltan entre los panelistas activos del perfil con capacidad libre,
-- prefiriendo a quien declara competencia en el dominio (máximo `max_generalistas`
-- sin competencia por concepto), después a quien lleva menos carga, y después un
-- desempate determinista (md5 de concepto+código) para que sea reproducible.
--
-- El orden dentro del bloque de cada panelista agrupa por módulo (orden aleatorio
-- de módulos, determinista por semilla) y aleatoriza dentro del módulo: el panelista
-- lee conceptos vecinos seguidos, pero el cansancio no cae siempre en el mismo sitio.
-- ---------------------------------------------------------------------------
-- Borra un panelista DE PRUEBA con todo su rastro. Solo funciona con `es_prueba`: los datos
-- del panel real no se borran nunca desde la plataforma.
create or replace function public.valida_dir_borrar_prueba(clave text, codigo text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; pid int;
begin
  d := valida.direccion(clave);
  select id into pid from valida.panelistas p where p.codigo = valida_dir_borrar_prueba.codigo and p.estudio_id = d.estudio_id and p.es_prueba;
  if pid is null then
    raise exception 'no hay ningún panelista de prueba con ese código' using errcode = '22023';
  end if;
  delete from valida.cobertura where panelista_id = pid;
  delete from valida.valoraciones where panelista_id = pid;
  delete from valida.asignaciones where panelista_id = pid;
  delete from valida.identidades where panelista_id = pid;
  delete from valida.solicitudes where panelista_id = pid;
  delete from valida.eventos where panelista_id = pid;
  delete from valida.panelistas where id = pid;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'borrado_prueba', jsonb_build_object('codigo', codigo));
  return jsonb_build_object('ok', true, 'codigo', codigo);
end $$;

create or replace function public.valida_dir_asignar(clave text, perfil_objetivo text, max_generalistas int default 3) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare
  d valida.panelistas;
  e valida.estudios;
  c record;
  cand record;
  k int; faltan int; generalistas_ya int;
  n_asignadas int := 0;
  r int;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  r := e.ronda_actual;
  if perfil_objetivo not in ('experto','paciente') then
    raise exception 'perfil debe ser experto o paciente' using errcode = '22023';
  end if;
  k := case when perfil_objetivo = 'paciente' then e.k_paciente else e.k_jueces end;

  -- Carga actual por panelista, en una tabla temporal que se actualiza sobre la marcha.
  -- Tabla temporal nueva en cada llamada. Sin `delete from carga`: Supabase activa
  -- pg_safeupdate para los roles de la API y un DELETE sin WHERE falla incluso aquí.
  drop table if exists carga;
  create temp table carga (panelista_id int primary key, n int, cap int) on commit drop;
  insert into carga
    select p.id, count(a.concepto_id), coalesce(p.capacidad, case when perfil_objetivo = 'paciente' then e.capacidad_paciente else e.capacidad end)
      from valida.panelistas p
      left join valida.asignaciones a on a.panelista_id = p.id and a.ronda = r
     where p.estudio_id = e.id and p.perfil = perfil_objetivo and p.activo
     group by p.id, p.capacidad;

  for c in
    select co.id, co.dominio, co.modulo,
           (select count(*) from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id
             where a.concepto_id = co.id and a.ronda = r and p.perfil = perfil_objetivo) as ya
      from valida.conceptos co
     where co.estudio_id = e.id and co.incluido and co.activo
       and (perfil_objetivo = 'experto' or coalesce(co.explicacion_paciente, '') <> '')
     order by co.prn
  loop
    faltan := k - c.ya;
    if faltan <= 0 then continue; end if;
    select count(*) into generalistas_ya
      from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id
     where a.concepto_id = c.id and a.ronda = r and p.perfil = perfil_objetivo
       and not (c.dominio = any(p.dominios_competencia));

    for cand in
      select p.id, (c.dominio = any(p.dominios_competencia)) as competente, g.n, g.cap
        from valida.panelistas p join carga g on g.panelista_id = p.id
       where g.n < g.cap
         and not exists (select 1 from valida.asignaciones a where a.panelista_id = p.id and a.concepto_id = c.id and a.ronda = r)
       order by (c.dominio = any(p.dominios_competencia)) desc, g.n asc, md5(c.id || p.codigo)
    loop
      exit when faltan <= 0;
      if not cand.competente and perfil_objetivo = 'experto' then
        if generalistas_ya >= max_generalistas then continue; end if;
        generalistas_ya := generalistas_ya + 1;
      end if;
      insert into valida.asignaciones (panelista_id, concepto_id, ronda, orden)
      values (cand.id, c.id, r, 0);
      perform valida.abrir_plazo(cand.id, r);
      update carga set n = n + 1 where panelista_id = cand.id;
      faltan := faltan - 1;
      n_asignadas := n_asignadas + 1;
    end loop;
  end loop;

  -- Orden de lectura: módulos barajados por panelista, conceptos barajados dentro.
  update valida.asignaciones a set orden = o.orden
    from (
      select a2.panelista_id, a2.concepto_id,
             row_number() over (partition by a2.panelista_id
                                order by md5(e.semilla || p.codigo || co.modulo), md5(e.semilla || p.codigo || co.id)) as orden
        from valida.asignaciones a2
        join valida.conceptos co on co.id = a2.concepto_id
        join valida.panelistas p on p.id = a2.panelista_id
       where a2.ronda = r and p.perfil = perfil_objetivo
    ) o
   where a.panelista_id = o.panelista_id and a.concepto_id = o.concepto_id and a.ronda = r;

  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'asignacion',
    jsonb_build_object('perfil', perfil_objetivo, 'ronda', r, 'nuevas', n_asignadas));
  return jsonb_build_object('asignadas', n_asignadas, 'ronda', r,
    'sin_jueces_suficientes', (
      select count(*) from valida.conceptos co
       where co.estudio_id = e.id and co.incluido and co.activo
         and (select count(*) from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id
               where a.concepto_id = co.id and a.ronda = r and p.perfil = perfil_objetivo) < k));
end $$;

-- Abrir la ronda siguiente para una lista de conceptos (los «revisar» que decide la
-- dirección tras ver el consenso), con los MISMOS panelistas que los vieron.
create or replace function public.valida_dir_ronda(clave text, conceptos text[]) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; e valida.estudios; n int;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  if e.ronda_actual >= (e.umbrales->>'rondas_max')::int then
    raise exception 'se alcanzó el máximo de rondas' using errcode = '22023';
  end if;
  insert into valida.asignaciones (panelista_id, concepto_id, ronda, orden)
    select a.panelista_id, a.concepto_id, e.ronda_actual + 1, a.orden
      from valida.asignaciones a
     where a.ronda = e.ronda_actual and a.concepto_id = any(conceptos)
  on conflict do nothing;
  get diagnostics n = row_count;
  update valida.estudios set ronda_actual = ronda_actual + 1 where id = e.id;
  insert into valida.rondas (estudio_id, ronda) values (e.id, e.ronda_actual + 1) on conflict do nothing;
  -- Cada panelista de la nueva ronda arranca su propio plazo desde cero.
  perform valida.abrir_plazo(x.panelista_id, e.ronda_actual + 1)
     from (select distinct panelista_id from valida.asignaciones where ronda = e.ronda_actual + 1) x;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'ronda_nueva',
    jsonb_build_object('ronda', e.ronda_actual + 1, 'conceptos', coalesce(array_length(conceptos, 1), 0), 'asignaciones', n));
  return jsonb_build_object('ronda', e.ronda_actual + 1, 'asignaciones', n);
end $$;

create or replace function public.valida_dir_cerrar(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas;
begin
  d := valida.direccion(clave);
  update valida.estudios set cerrado_en = now() where id = d.estudio_id;
  insert into valida.eventos (panelista_id, tipo) values (d.id, 'estudio_cerrado');
  return jsonb_build_object('ok', true);
end $$;

-- Todo lo que necesita el panel de dirección, en una llamada: estudio, panelistas con
-- progreso, conceptos incluidos (sin textos largos) y TODAS las valoraciones. Con
-- 600 conceptos × 7 jueces son ~4.000 filas: cabe, y el cálculo de consenso se hace en
-- el cliente con `src/lib/metricas.js`, que es donde están los tests.
create or replace function public.valida_dir_datos(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; e valida.estudios; dims jsonb;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.orden), '[]') into dims from valida.dimensiones x where x.estudio_id = e.id;
  return jsonb_build_object(
    'estudio', to_jsonb(e) || jsonb_build_object('dimensiones', dims),
    'catalogo', (select coalesce(jsonb_object_agg(id, jsonb_build_object('nombre', nombre, 'tipo', tipo, 'orden', orden)), '{}') from valida.catalogo),
    'panelistas', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'codigo', p.codigo, 'perfil', p.perfil, 'disciplina', p.disciplina, 'anios', p.anios,
        'dominios_competencia', p.dominios_competencia, 'capacidad', p.capacidad, 'activo', p.activo,
        'perfil_datos', p.perfil_datos, 'es_prueba', p.es_prueba, 'perfil_completado', p.perfil_completado, 'calibracion_hecha', p.calibracion_hecha,
        'alta_en', p.alta_en, 'ultimo_acceso', p.ultimo_acceso, 'notas', p.notas,
        'asignadas', (select count(*) from valida.asignaciones a where a.panelista_id = p.id and a.ronda = e.ronda_actual),
        'hechas', (select count(*) from valida.asignaciones a where a.panelista_id = p.id and a.ronda = e.ronda_actual and a.estado = 'hecha'),
        'abstenidas', (select count(*) from valida.asignaciones a where a.panelista_id = p.id and a.ronda = e.ronda_actual and a.estado = 'abstenida'),
        'tiempo_medio_ms', (select avg(v.tiempo_ms) from valida.valoraciones v where v.panelista_id = p.id and v.completa and v.tiempo_ms > 0)
      ) order by p.codigo), '[]') from valida.panelistas p where p.estudio_id = e.id),
    'conceptos', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'dominio', c.dominio, 'modulo', c.modulo, 'titulo', c.titulo, 'certeza', c.certeza,
        'tipo_afirmacion', c.tipo_afirmacion, 'controversia', c.controversia, 'estratos', c.estratos,
        'senales', c.senales, 'prn', c.prn, 'hash', c.hash, 'activo', c.activo, 'madurez', c.madurez,
        'cambiado', c.cambiado_desde_valoracion, 'tiene_paciente', coalesce(c.explicacion_paciente, '') <> '',
        'jueces', (select count(*) from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id
                    where a.concepto_id = c.id and a.ronda = e.ronda_actual and p.perfil = 'experto'),
        'pacientes', (select count(*) from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id
                    where a.concepto_id = c.id and a.ronda = e.ronda_actual and p.perfil = 'paciente')
      ) order by c.id), '[]') from valida.conceptos c where c.estudio_id = e.id and c.incluido),
    'valoraciones', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id, 'panelista', p.codigo, 'perfil', p.perfil, 'concepto_id', v.concepto_id, 'ronda', v.ronda,
        'hash_concepto', v.hash_concepto, 'puntuaciones', v.puntuaciones, 'abstencion', v.abstencion,
        'motivo_abstencion', v.motivo_abstencion, 'banderas', v.banderas, 'comentario', v.comentario,
        'ajustes', v.ajustes, 'paciente', v.paciente, 'completa', v.completa, 'tiempo_ms', v.tiempo_ms,
        'actualizada_en', v.actualizada_en
      ) order by v.concepto_id, v.ronda, p.codigo), '[]')
      from valida.valoraciones v join valida.panelistas p on p.id = v.panelista_id where p.estudio_id = e.id),
    'asignaciones', (select coalesce(jsonb_agg(jsonb_build_object('panelista', p.codigo, 'concepto_id', a.concepto_id,
        'ronda', a.ronda, 'orden', a.orden, 'estado', a.estado) order by p.codigo, a.ronda, a.orden), '[]')
      from valida.asignaciones a join valida.panelistas p on p.id = a.panelista_id where p.estudio_id = e.id),
    'cobertura', (select coalesce(jsonb_agg(jsonb_build_object('panelista', p.codigo, 'modulo', cb.modulo, 'ronda', cb.ronda,
        'exhaustividad', cb.exhaustividad, 'falta', cb.falta, 'sobra', cb.sobra)), '[]')
      from valida.cobertura cb join valida.panelistas p on p.id = cb.panelista_id where p.estudio_id = e.id),
    'propuestas_estado', (select coalesce(jsonb_agg(to_jsonb(pe)), '[]') from valida.propuestas_estado pe),
    'rondas', (select coalesce(jsonb_agg(jsonb_build_object('ronda', r.ronda, 'abre_en', r.abre_en, 'cierra_en', r.cierra_en, 'notas', r.notas) order by r.ronda), '[]')
      from valida.rondas r where r.estudio_id = e.id),
    'plazos', (select coalesce(jsonb_agg(jsonb_build_object('panelista', p.codigo, 'ronda', pl.ronda,
        'inicio', pl.inicio, 'dias', pl.dias, 'motivo', pl.motivo,
        'fin', pl.inicio + make_interval(days => pl.dias),
        'dias_restantes', ceil(extract(epoch from (pl.inicio + make_interval(days => pl.dias) - now())) / 86400.0))), '[]')
      from valida.plazos pl join valida.panelistas p on p.id = pl.panelista_id where p.estudio_id = e.id),
    'avisos', (select coalesce(jsonb_agg(jsonb_build_object('panelista', p.codigo, 'ronda', av.ronda, 'tipo', av.tipo,
        'enviado_en', av.enviado_en, 'pendientes', av.pendientes) order by av.enviado_en desc), '[]')
      from valida.avisos av join valida.panelistas p on p.id = av.panelista_id where p.estudio_id = e.id),
    'solicitudes', (select jsonb_build_object(
        'total', count(*), 'aceptadas', count(*) filter (where aceptada), 'rechazadas', count(*) filter (where not aceptada),
        'hoy', count(*) filter (where creada_en > now() - interval '1 day'),
        'ultimas', (select coalesce(jsonb_agg(jsonb_build_object('creada_en', x.creada_en, 'aceptada', x.aceptada, 'puntuacion', x.puntuacion,
                        'disciplina', x.disciplina, 'anios', x.anios) order by x.creada_en desc), '[]')
                    from (select * from valida.solicitudes where estudio_id = e.id order by creada_en desc limit 30) x))
      from valida.solicitudes where estudio_id = e.id),
    'eventos_recientes', (select coalesce(jsonb_agg(jsonb_build_object('tipo', ev.tipo, 'en', ev.en, 'panelista_id', ev.panelista_id, 'detalle', ev.detalle) order by ev.en desc), '[]')
      from (select * from valida.eventos order by en desc limit 200) ev)
  );
end $$;

-- El texto completo de un concepto, para leerlo desde el panel de dirección.
-- Las identidades, solo bajo petición explícita de la dirección: para la autoría del grupo,
-- la trazabilidad y la verificación de los DOI declarados. Nunca viaja con los datos del estudio.
create or replace function public.valida_dir_identidades(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas;
begin
  d := valida.direccion(clave);
  insert into valida.eventos (panelista_id, tipo) values (d.id, 'consulta_identidades');
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'codigo', p.codigo, 'perfil', p.perfil, 'nombre', i.nombre, 'apellidos', i.apellidos,
      'email', i.email, 'filiacion', i.filiacion, 'orcid', i.orcid, 'dois', i.dois,
      'disciplina', p.disciplina, 'activo', p.activo, 'creada_en', i.creada_en,
      'asignadas', (select count(*) from valida.asignaciones a where a.panelista_id = p.id),
      'hechas', (select count(*) from valida.asignaciones a where a.panelista_id = p.id and a.estado = 'hecha'),
      'rondas', (select coalesce(array_agg(distinct v.ronda order by v.ronda), '{}') from valida.valoraciones v where v.panelista_id = p.id and v.completa)
    ) order by p.codigo), '[]')
    from valida.identidades i join valida.panelistas p on p.id = i.panelista_id
   where p.estudio_id = d.estudio_id);
end $$;

-- AVISOS QUE TOCA MANDAR AHORA. Se calculan al vuelo: un panelista sale aquí solo si le
-- quedan conceptos pendientes, así que en cuanto termina su bloque los avisos dejan de
-- aparecer sin que nadie los cancele. Tipos: mitad del plazo, 3 días, 1 día y vencido.
-- Devuelve el texto listo para enviar (asunto y cuerpo) y a quién.
create or replace function public.valida_dir_avisos(clave text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; e valida.estudios;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  return (
    with base as (
      select p.id, p.codigo, p.perfil, p.es_prueba, i.nombre, i.apellidos, i.email,
             pl.dias, pl.inicio,
             (valida.plazo_de(p.id, e.ronda_actual)->>'fin_efectivo')::timestamptz as fin,
             (valida.plazo_de(p.id, e.ronda_actual)->>'dias_restantes')::numeric as restantes,
             (select count(*) from valida.asignaciones a
               where a.panelista_id = p.id and a.ronda = e.ronda_actual and a.estado = 'pendiente') as pendientes,
             (select count(*) from valida.asignaciones a
               where a.panelista_id = p.id and a.ronda = e.ronda_actual) as total
        from valida.panelistas p
        join valida.plazos pl on pl.panelista_id = p.id and pl.ronda = e.ronda_actual
        left join valida.identidades i on i.panelista_id = p.id
       where p.estudio_id = e.id and p.activo and p.perfil <> 'direccion'
    ), conAviso as (
      select b.*, case
          when b.restantes <= 0 then 'vencido'
          when b.restantes <= 1 then 'un_dia'
          when b.restantes <= 3 then 'tres_dias'
          when b.restantes <= b.dias / 2.0 then 'mitad'
        end as tipo
        from base b
       where b.pendientes > 0
    )
    select coalesce(jsonb_agg(jsonb_build_object(
        'codigo', c.codigo, 'nombre', c.nombre, 'apellidos', c.apellidos, 'email', c.email,
        'perfil', c.perfil, 'es_prueba', c.es_prueba, 'tipo', c.tipo, 'ronda', e.ronda_actual,
        'pendientes', c.pendientes, 'total', c.total, 'hechas', c.total - c.pendientes,
        'fin', c.fin, 'dias_restantes', c.restantes,
        'asunto', case c.tipo
            when 'vencido' then 'Tu plazo en el estudio EdPain ha terminado'
            when 'un_dia' then 'Último día para tu bloque del estudio EdPain'
            when 'tres_dias' then 'Te quedan 3 días para tu bloque del estudio EdPain'
            else 'Vas por la mitad del plazo del estudio EdPain' end,
        'cuerpo', concat(
            'Hola', case when c.nombre is not null then ' ' || c.nombre else '' end, ':', chr(10), chr(10),
            case c.tipo
              when 'vencido' then concat('El plazo para valorar tu bloque terminó el ', to_char(c.fin, 'DD/MM/YYYY'), '. Te quedaron ', c.pendientes, ' conceptos sin valorar de ', c.total, '.', chr(10), 'Si quieres seguir participando, responde a este correo y te ampliamos el plazo.')
              when 'un_dia' then concat('Mañana se cierra tu plazo para valorar el bloque de la ronda ', e.ronda_actual, '. Te faltan ', c.pendientes, ' conceptos de ', c.total, '.')
              when 'tres_dias' then concat('Te quedan 3 días para terminar tu bloque de la ronda ', e.ronda_actual, '. Llevas ', c.total - c.pendientes, ' de ', c.total, ' y te faltan ', c.pendientes, '.')
              else concat('Vas por la mitad del plazo de la ronda ', e.ronda_actual, '. Llevas ', c.total - c.pendientes, ' conceptos de ', c.total, ' y te faltan ', c.pendientes, '. El plazo termina el ', to_char(c.fin, 'DD/MM/YYYY'), '.') end,
            chr(10), chr(10),
            'Entra con tu clave en https://valida.edpain.com/ y sigue donde lo dejaste; todo se guarda solo.', chr(10), chr(10),
            'Si ya lo has terminado, ignora este mensaje.', chr(10),
            'Dudas: ', e.contacto_email, chr(10),
            e.investigador_principal, ', investigador principal del estudio.')
      ) order by c.restantes), '[]')
      from conAviso c
     where c.tipo is not null
       and not exists (select 1 from valida.avisos av
                        where av.panelista_id = c.id and av.ronda = e.ronda_actual and av.tipo = c.tipo));
end $$;

-- Deja constancia de los avisos ya enviados para no repetirlos.
create or replace function public.valida_dir_marcar_avisos(clave text, codigos text[], tipo text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; e valida.estudios; n int;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  insert into valida.avisos (panelista_id, ronda, tipo, pendientes)
    select p.id, e.ronda_actual, valida_dir_marcar_avisos.tipo,
           (select count(*) from valida.asignaciones a where a.panelista_id = p.id and a.ronda = e.ronda_actual and a.estado = 'pendiente')
      from valida.panelistas p where p.codigo = any(codigos) and p.estudio_id = e.id
  on conflict (panelista_id, ronda, tipo) do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'marcados', n);
end $$;

-- Ampliar (o recortar) el plazo de un panelista en la ronda actual.
create or replace function public.valida_dir_plazo(clave text, codigo text, dias int, motivo text default null) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; e valida.estudios; pid int;
begin
  d := valida.direccion(clave);
  select * into e from valida.estudios where id = d.estudio_id;
  select id into pid from valida.panelistas p where p.codigo = valida_dir_plazo.codigo and p.estudio_id = e.id;
  if pid is null then raise exception 'no existe ese panelista' using errcode = '22023'; end if;
  if dias < 1 or dias > 365 then raise exception 'el plazo va de 1 a 365 días' using errcode = '22023'; end if;
  insert into valida.plazos (panelista_id, ronda, dias, motivo) values (pid, e.ronda_actual, dias, motivo)
  on conflict (panelista_id, ronda) do update set dias = excluded.dias, motivo = excluded.motivo, actualizado_en = now();
  -- Al ampliar, los avisos ya mandados dejan de valer: se vuelven a calcular con el plazo nuevo.
  delete from valida.avisos where panelista_id = pid and ronda = e.ronda_actual;
  insert into valida.eventos (panelista_id, tipo, detalle) values (d.id, 'plazo', jsonb_build_object('codigo', codigo, 'dias', dias, 'motivo', motivo));
  return valida.plazo_de(pid, e.ronda_actual);
end $$;

-- Calendario: apertura y cierre de una ronda.
create or replace function public.valida_dir_ronda_fechas(clave text, ronda int, abre_en text, cierra_en text, notas text default null) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas;
begin
  d := valida.direccion(clave);
  insert into valida.rondas (estudio_id, ronda, abre_en, cierra_en, notas)
  values (d.estudio_id, ronda, coalesce(nullif(abre_en, '')::timestamptz, now()), nullif(cierra_en, '')::timestamptz, notas)
  on conflict (estudio_id, ronda) do update set
      abre_en = coalesce(nullif(valida_dir_ronda_fechas.abre_en, '')::timestamptz, valida.rondas.abre_en),
      cierra_en = case when valida_dir_ronda_fechas.cierra_en is null then valida.rondas.cierra_en
                       else nullif(valida_dir_ronda_fechas.cierra_en, '')::timestamptz end,
      notas = coalesce(valida_dir_ronda_fechas.notas, valida.rondas.notas);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.valida_dir_concepto(clave text, concepto_id text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; c valida.conceptos;
begin
  d := valida.direccion(clave);
  select * into c from valida.conceptos where id = valida_dir_concepto.concepto_id;
  if not found then raise exception 'no existe' using errcode = '22023'; end if;
  return valida.concepto_json(c, 'direccion');
end $$;

create or replace function public.valida_dir_propuesta(clave text, valoracion_id bigint, indice int, estado text, nota text) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
#variable_conflict use_column
declare d valida.panelistas;
begin
  d := valida.direccion(clave);
  insert into valida.propuestas_estado (valoracion_id, indice, estado, nota)
  values (valoracion_id, indice, estado, nota)
  on conflict (valoracion_id, indice) do update set estado = excluded.estado, nota = excluded.nota, actualizado_en = now();
  return jsonb_build_object('ok', true);
end $$;

-- Calibración: definir los conceptos de práctica (el concepto debe estar importado).
create or replace function public.valida_dir_calibracion(clave text, items jsonb) returns jsonb
language plpgsql security definer set search_path = valida, public, pg_temp as $$
declare d valida.panelistas; fila jsonb;
begin
  d := valida.direccion(clave);
  delete from valida.calibracion where estudio_id = d.estudio_id;
  for fila in select * from jsonb_array_elements(items) loop
    insert into valida.calibracion (estudio_id, concepto_id, orden, modelo, explicacion)
    values (d.estudio_id, fila->>'concepto_id', (fila->>'orden')::int, fila->'modelo', fila->>'explicacion');
    update valida.conceptos set estratos = array_append(array_remove(estratos, 'calibracion'), 'calibracion')
     where id = fila->>'concepto_id';
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- Permisos: solo las funciones public.valida_* son ejecutables por la API.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.proname, pg_get_function_identity_arguments(p.oid) as args
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'valida\_%' escape '\'
  loop
    execute format('revoke all on function public.%I(%s) from public', f.proname, f.args);
    execute format('grant execute on function public.%I(%s) to anon, authenticated', f.proname, f.args);
  end loop;
end $$;

-- Las funciones internas de `valida` no son ejecutables desde fuera.
revoke all on all functions in schema valida from public, anon, authenticated;
