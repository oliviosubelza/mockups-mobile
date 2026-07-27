import axios from 'axios';

import { toAppError } from './error';

/**
 * Single axios instance for the app. Base URL comes from the public Expo env
 * var (`EXPO_PUBLIC_API_URL`); it is empty in the mockup and wired later.
 */
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? '',
  timeout: 10_000,
});

/** Pluggable auth token provider — set from the auth layer when it exists. */
let accessTokenProvider: () => string | null | Promise<string | null> = () => null;

export function setAccessTokenProvider(
  provider: () => string | null | Promise<string | null>,
) {
  accessTokenProvider = provider;
}

/** Current UI language, injected as `Accept-Language`. Defaults to Spanish. */
let currentLanguage = 'es';

export function setApiLanguage(lang: string) {
  currentLanguage = lang;
}

api.interceptors.request.use(async (config) => {
  const token = await accessTokenProvider();
  if (token) config.headers.setAuthorization(`Bearer ${token}`);
  config.headers.set('Accept-Language', currentLanguage);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toAppError(error)),
);
