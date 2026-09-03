# OEE App Biomont

Aplicación de gestión OEE para el seguimiento de órdenes de trabajo, producción y validaciones.

## Ejecutar localmente

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Luego abre la dirección mostrada por Vite, normalmente `http://localhost:5173`.

## Configurar Supabase

El repositorio incluye el esquema inicial versionado en `supabase/migrations`.

1. Vincula este repositorio al proyecto Supabase y usa `.` como Working directory.
2. Aplica la migración `202609030001_initial_bioee_schema.sql`.
3. Copia `.env.example` como `.env.local` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Añade las mismas variables en Vercel para Production y Preview.
5. Crea los usuarios desde Supabase Authentication. El disparador crea su perfil como operario.
6. Para convertir al primer usuario en supervisor, ejecuta en SQL Editor:

```sql
update public.profiles
set role = 'supervisor'
where id = (select id from auth.users where email = 'correo@biomont.com.pe');
```

Mientras las variables no estén configuradas, BIOEE conserva el modo demostración local. Cuando estén disponibles, el acceso cambia automáticamente a correo y contraseña mediante Supabase Auth.

## Editar en línea

Abre [github.dev](https://github.dev/Mao1216/oee-app-biomont) para editar el repositorio desde VS Code en el navegador.
