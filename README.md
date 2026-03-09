# EuroChat AI

Landing page inicial de **EuroChat AI**, un SaaS de asistente financiero impulsado por IA para usar desde WhatsApp.

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

## Estructura inicial

```text
.
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── landing/
│       ├── DemoChat.tsx
│       ├── PricingCard.tsx
│       └── SectionTitle.tsx
├── lib/
│   └── content.ts
├── .env.example
├── tailwind.config.ts
└── ...
```

## Cómo ejecutar en local

1. Instala dependencias:

```bash
npm install
```

2. Copia variables de entorno:

```bash
cp .env.example .env.local
```

3. Levanta el entorno de desarrollo:

```bash
npm run dev
```

4. Abre `http://localhost:3000`.

## Scripts disponibles

- `npm run dev`: entorno de desarrollo
- `npm run build`: build de producción
- `npm run start`: correr build en modo producción
- `npm run lint`: lint con configuración de Next.js
- `npm run typecheck`: validación de TypeScript
- `npm run clean`: limpia artefactos temporales (`.next`, `out`, cache)

## Qué incluye esta primera fase

- Landing page demo-first en español con estética fintech + AI.
- Secciones clave: hero, demo estilo WhatsApp, beneficios, preview de precios, FAQ y CTA final.
- Componentes reutilizables para escalar el sistema de diseño.

## Preparado para siguientes pasos

La base deja listos los puntos de extensión para futuras iteraciones:

- `lib/content.ts` centraliza copy y datos estáticos para migrar luego a CMS o API.
- `.env.example` contempla claves para OpenAI, WhatsApp y pagos sin activar integración real.
- Estructura modular en `components/landing` para evolucionar el home sin deuda técnica.
- App Router listo para añadir rutas de producto, onboarding y panel interno.

