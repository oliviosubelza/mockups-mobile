import axios from 'axios';

/** Normalized application error surfaced to the UI/hooks layer. */
export class AppError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly permission?: string;

  constructor(
    message: string,
    opts: { status?: number; code?: string; permission?: string } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = opts.status;
    this.code = opts.code;
    this.permission = opts.permission;
  }
}

/** Best-effort extraction of a human message from an unknown API payload. */
export function extractApiMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = data as Record<string, unknown>;
  const candidate = d.message ?? d.error ?? d.detail;
  return typeof candidate === 'string' ? candidate : undefined;
}

/** Convert any thrown value into an AppError. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message =
      extractApiMessage(err.response?.data) ?? err.message ?? 'Request failed';
    const data = err.response?.data as Record<string, unknown> | undefined;
    return new AppError(message, {
      status,
      code: typeof data?.code === 'string' ? data.code : err.code,
      permission: typeof data?.permission === 'string' ? data.permission : undefined,
    });
  }

  if (err instanceof Error) return new AppError(err.message);
  return new AppError('Unknown error');
}
