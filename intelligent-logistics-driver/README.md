# Intelligent Logistics - Driver App

Aplicação móvel React Native para motoristas do sistema de logística portuária.

## Requisitos

- Node.js 18+
- Expo Go (para desenvolvimento)
- Android Studio (para builds)

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
# Iniciar servidor Expo
npx expo start --clear

# Testar em Android
npx expo start --android
```

## Estrutura

```
src/
├── config/         # Configuração (API URL, etc.)
├── navigation/     # React Navigation
├── screens/        # Ecrãs (Login, Home)
├── services/       # Chamadas API
├── stores/         # Estado Zustand
├── theme/          # Cores e estilos
└── types/          # TypeScript interfaces
```

## Configuração API

Editar `src/config/config.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: 'http://SEU_IP:8000/api',
  timeout: 30000,
};
```

## Build Produção

```bash
# Android APK
npx expo build:android

# ou com EAS
npx eas build --platform android
```
