# Intelligent Logistics - Web Frontend

Aplicação web React + Vite para operadores de cancela e gestores logísticos.

## Requisitos

- Node.js 18+

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
# Gate Operator
npm run dev:gate

# Logistics Manager
npm run dev:manager
```

## Build Produção

```bash
npm run build:gate
npm run build:manager
```

## Estrutura

```
src/
├── components/
│   ├── common/         # Componentes partilhados
│   ├── gate-operator/  # Dashboard, modais, cards
│   └── layout/         # Layouts por role
├── pages/
│   ├── Login/
│   ├── gate-operator/
│   └── logistics-manager/
├── services/           # Chamadas API (axios)
└── types/              # TypeScript interfaces
```

## Configuração API

Criar ficheiro `.env`:

```env
VITE_API_URL=http://SEU_IP:8000/api
```

## Modos

| Modo | Comando | Rota |
|------|---------|------|
| Gate Operator | `npm run dev:gate` | `/gate` |
| Manager | `npm run dev:manager` | `/manager` |

## Notas

- A app do **Driver** foi movida para projeto separado: `intelligent-logistics-driver/` (React Native)
