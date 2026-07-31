# San Sebastián Transporte

App de cotización y gestión operativa para Transportes San Sebastián.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Supabase (Auth + Postgres)
- Leaflet / OSRM (rutas)

## Setup local

1. Copiá variables de entorno (desde el dashboard de Supabase):

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

2. Instalá e iniciá:

```bash
npm install
npm run dev
```

Con acceso desde la red local:

```bash
npm run dev -- --host
```

## Migraciones SQL (en orden, SQL Editor de Supabase)

- `schema.sql` (o base ya existente)
- `supabase/migration_operativa.sql`
- `supabase/functions_operativas.sql`
- `supabase/sync_chofer_estado.sql` (estado automático de choferes + finalizar viaje)

4. Usuarios demo (opcional):

```bash
npm run setup:supabase
```

Credenciales típicas:

- `admin@sansebastian.com` / `SanSebastian2026!`
- `operador@sansebastian.com` / `Operador2026!`

## Deep-links

La app usa hash routing:

- `#/home`
- `#/cotizador`
- `#/cotizaciones`
- `#/agenda`
- `#/flota`
- `#/clientes`
- `#/choferes`
- `#/facturacion`
- `#/cuenta`

## Smoke checklist

- [ ] Login admin y operador
- [ ] Cotizar origen→destino con mapa visible
- [ ] Emitir PDF / WhatsApp (número correlativo)
- [ ] Agenda: lista del día (móvil) y timeline (desktop)
- [ ] Reserva directa + detalle/pago/cancelación (admin)
- [ ] Alertas de docs en Inicio / Flota
- [ ] Clientes: búsqueda + alta con solo nombre/teléfono
- [ ] Facturación: cobros en cards (móvil) y caja
- [ ] Deep-link `#/agenda` recarga en la misma vista

## Build

```bash
npm run build
```
