# PsicoGestión — Sistema de Gestión Clínica

Sistema completo de gestión para consultorio psicológico.
Stack: React + Supabase.

---

## ⚡ Cómo correr el sistema en tu computadora

### Paso 1 — Crear cuenta y proyecto en Supabase (gratis)

1. Ir a [supabase.com](https://supabase.com) y crear una cuenta gratuita
2. Hacer clic en **"New Project"**
3. Elegir nombre del proyecto (ej: `psicoerp`), crear contraseña y seleccionar región **South America (São Paulo)**
4. Esperar ~2 minutos a que se cree el proyecto

### Paso 2 — Crear las tablas

1. En tu proyecto de Supabase, ir al menú **SQL Editor**
2. Hacer clic en **"New query"**
3. Copiar y pegar todo el contenido del archivo `supabase_schema.sql`
4. Hacer clic en **"Run"** (el botón verde)
5. Deberías ver "Success" — las tablas ya están creadas con seguridad activada

### Paso 3 — Crear tu usuario (psicóloga)

1. En Supabase, ir a **Authentication → Users**
2. Hacer clic en **"Invite user"** o **"Add user"**
3. Ingresar tu email y una contraseña segura
4. Guardar los datos

### Paso 4 — Obtener tus credenciales

1. En Supabase, ir a **Settings → API**
2. Copiar:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public key** (el JWT largo)

### Paso 5 — Configurar el proyecto

1. Abrí la carpeta `psicoerp` en tu computadora
2. Copiá el archivo `.env.example` y renombralo a `.env.local`
3. Abrilo con el Bloc de notas y completá con tus datos:

```
REACT_APP_SUPABASE_URL=https://TU_PROYECTO.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJ...tu_clave
```

### Paso 6 — Instalar y correr

Necesitás tener **Node.js** instalado. Si no lo tenés:
👉 Descargar de [nodejs.org](https://nodejs.org) (versión LTS)

Luego, abrí una terminal (símbolo del sistema) en la carpeta del proyecto y ejecutá:

```bash
# Instalar dependencias (solo la primera vez)
npm install

# Iniciar la aplicación
npm start
```

Se abrirá automáticamente en tu navegador en `http://localhost:3000`

---

## 📁 Estructura del proyecto

```
psicoerp/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── Layout.js        ← Sidebar y navegación
│   ├── hooks/
│   │   └── useAuth.js           ← Autenticación
│   ├── lib/
│   │   └── supabase.js          ← Cliente de base de datos
│   ├── pages/
│   │   ├── Login.js             ← Pantalla de login
│   │   ├── Dashboard.js         ← Panel principal
│   │   ├── Pacientes.js         ← Gestión de pacientes
│   │   ├── Agenda.js            ← Calendario y turnos
│   │   ├── Fichas.js            ← Sesiones clínicas
│   │   └── Facturacion.js       ← Cobros y pagos
│   ├── App.js                   ← Rutas
│   ├── index.js                 ← Punto de entrada
│   └── index.css                ← Estilos globales
├── supabase_schema.sql          ← Base de datos completa
├── .env.example                 ← Plantilla de configuración
└── package.json
```

---

## 🔐 Seguridad incluida

- **Login con contraseña** — nadie puede entrar sin credenciales
- **Row Level Security (RLS)** — cada psicóloga solo ve SUS datos
- **Datos encriptados** — Supabase usa encriptación en tránsito y en reposo
- **Rutas protegidas** — si no estás logueada, te redirige al login

---

## 🧩 Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | Turnos del día, estadísticas, alertas |
| Agenda | Calendario mensual, crear/editar/cancelar turnos |
| Pacientes | Registro completo, historial, búsqueda y filtros |
| Fichas de sesión | Notas clínicas cronológicas, estado emocional |
| Facturación | Registro de cobros, estados, totales |

---

## 🛠️ Próximas mejoras sugeridas

- [ ] Recordatorios automáticos por WhatsApp (vía Twilio)
- [ ] Recordatorios por email (vía Resend)
- [ ] Carga de archivos adjuntos (estudios, informes)
- [ ] Portal para pacientes (ver turnos propios)
- [ ] Multi-profesional con agendas separadas
- [ ] Exportación a PDF de fichas
- [ ] Backup manual descargable
