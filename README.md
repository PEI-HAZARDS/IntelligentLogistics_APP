# Intelligent Logistics - Frontend

Sistema de frontend para gestão de logística portuária, composto por duas aplicações:

## Arquitetura

```
IntelligentLogistics_APP/
├── intelligent-logistics-frontend/   # Web (React + Vite)
│   ├── Gate Operator                 # Dashboard de cancela
│   └── Logistics Manager             # Painel de gestão
│
└── intelligent-logistics-driver/     # Mobile (React Native + Expo)
    └── Driver App                    # App para motoristas
```

## Aplicações

| App | Tecnologia | Plataforma | Utilizadores |
|-----|------------|------------|--------------|
| **Web Frontend** | React + Vite + TypeScript | Browser | Operadores, Gestores |
| **Driver App** | React Native + Expo | Android/iOS | Motoristas |

## Quick Start

### Web (Gate Operator / Manager)

```bash
cd intelligent-logistics-frontend
npm install
npm run dev:gate     # ou npm run dev:manager
```

### Mobile (Driver)

```bash
cd intelligent-logistics-driver
npm install
npx expo start
```

## Stack Tecnológica

### Partilhado
- TypeScript
- Axios (HTTP)
- Zustand (Estado)

### Web
- React 19
- Vite
- TailwindCSS
- React Router
- Leaflet (Mapas)
- HLS.js (Streaming)

### Mobile
- React Native 0.81
- Expo SDK 54
- React Navigation
- React Native Maps

## Configuração API

Ambas as apps conectam ao mesmo backend. Configurar URL em:

- **Web**: `.env` → `VITE_API_URL`
- **Mobile**: `src/config/config.ts` → `API_CONFIG.baseUrl`

## Documentação

- [Web Frontend](./intelligent-logistics-frontend/README.md)
- [Driver App](./intelligent-logistics-driver/README.md)