-- ============================================================
-- PSICOERP — Schema completo para Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: pacientes
-- ============================================================
create table pacientes (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date,
  edad int generated always as (
    date_part('year', age(fecha_nacimiento))::int
  ) stored,
  dni text,
  telefono text,
  email text,
  direccion text,
  obra_social text,
  nro_afiliado text,
  motivo_consulta text,
  diagnostico text,
  estado text default 'activo' check (estado in ('activo', 'en_pausa', 'alta', 'nuevo')),
  notas_generales text,
  psicologo_id uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: sesiones (fichas clínicas)
-- ============================================================
create table sesiones (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  paciente_id uuid references pacientes(id) on delete cascade not null,
  psicologo_id uuid references auth.users(id),
  fecha date not null default current_date,
  hora time,
  duracion_minutos int default 60,
  tipo text default 'presencial' check (tipo in ('presencial', 'virtual')),
  nota_clinica text,
  estado_emocional text check (estado_emocional in ('muy_bien', 'bien', 'estable', 'fluctuante', 'mal', 'crisis')),
  objetivos text,
  tarea_asignada text,
  privada boolean default true,
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: turnos (agenda)
-- ============================================================
create table turnos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  paciente_id uuid references pacientes(id) on delete cascade not null,
  psicologo_id uuid references auth.users(id),
  fecha date not null,
  hora time not null,
  duracion_minutos int default 60,
  tipo text default 'presencial' check (tipo in ('presencial', 'virtual')),
  estado text default 'pendiente' check (estado in ('pendiente', 'confirmado', 'cancelado', 'realizado', 'ausente')),
  notas text,
  recordatorio_enviado boolean default false,
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: pagos
-- ============================================================
create table pagos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  paciente_id uuid references pacientes(id) on delete cascade not null,
  sesion_id uuid references sesiones(id),
  turno_id uuid references turnos(id),
  psicologo_id uuid references auth.users(id),
  fecha date not null default current_date,
  monto decimal(10,2) not null,
  tipo_servicio text default 'sesion_individual' check (
    tipo_servicio in ('sesion_individual', 'pack_sesiones', 'evaluacion', 'informe', 'otro')
  ),
  metodo_pago text default 'efectivo' check (
    metodo_pago in ('efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'otro')
  ),
  estado text default 'pendiente' check (estado in ('pendiente', 'pagado', 'vencido')),
  notas text,
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: archivos adjuntos
-- ============================================================
create table archivos (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamptz default now(),
  paciente_id uuid references pacientes(id) on delete cascade not null,
  sesion_id uuid references sesiones(id),
  nombre text not null,
  tipo text,
  url text not null,
  tamanio int,
  subido_por uuid references auth.users(id)
);

-- ============================================================
-- TABLA: perfiles de psicólogos (extiende auth.users)
-- ============================================================
create table perfiles (
  id uuid references auth.users(id) primary key,
  created_at timestamptz default now(),
  nombre text,
  apellido text,
  telefono text,
  especialidad text,
  matricula text,
  rol text default 'psicologo' check (rol in ('admin', 'psicologo')),
  avatar_url text
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table pacientes enable row level security;
alter table sesiones enable row level security;
alter table turnos enable row level security;
alter table pagos enable row level security;
alter table archivos enable row level security;
alter table perfiles enable row level security;

-- Políticas: cada psicólogo solo ve sus propios datos
-- Admin ve todo

create policy "Psicologos ven sus pacientes" on pacientes
  for all using (
    psicologo_id = auth.uid() or
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Psicologos ven sus sesiones" on sesiones
  for all using (
    psicologo_id = auth.uid() or
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Psicologos ven sus turnos" on turnos
  for all using (
    psicologo_id = auth.uid() or
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Psicologos ven sus pagos" on pagos
  for all using (
    psicologo_id = auth.uid() or
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Psicologos ven sus archivos" on archivos
  for all using (
    subido_por = auth.uid() or
    exists (select 1 from perfiles where id = auth.uid() and rol = 'admin')
  );

create policy "Cada uno ve su perfil" on perfiles
  for all using (id = auth.uid());

-- ============================================================
-- FUNCIÓN: auto-crear perfil al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, rol)
  values (new.id, new.email, 'psicologo');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DATOS DE EJEMPLO (opcional, comentar si no querés)
-- ============================================================
-- Correr después de crear el primer usuario en tu app
-- Los pacientes de ejemplo se asignarán al primer usuario admin
