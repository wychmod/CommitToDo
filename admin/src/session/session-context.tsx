import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AdminConfigError, getCloudBaseApp } from '@/lib/cloudbase';
import { AdminApiError, callAdminApi, errorMessage, type WhoAmI } from '@/lib/admin-api';
import { fixtureEmail, fixtureState, fixtureWhoAmI } from '@/lib/fixture';
import { copy } from '@/i18n';

export type GateState =
  | 'loading'
  | 'signed_out'
  | 'ready'
  | 'forbidden'
  | 'unverified'
  | 'identity_error'
  | 'config_error';

interface SessionValue {
  state: GateState;
  whoami: WhoAmI | null;
  email: string;
  error: string;
  requestId: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function authErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as { code?: string; message?: string; messageText?: string };
    if (record.code && /unverified|verify|email/i.test(record.code)) {
      return copy.login.unverified;
    }
    if (record.message) return record.message;
    if (record.messageText) return record.messageText;
  }
  return copy.login.failed;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('loading');
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');

  const check = useCallback(async () => {
    const fixture = fixtureState();
    if (fixture) {
      setWhoami(fixture === 'ready' ? fixtureWhoAmI() : null);
      setEmail(fixtureEmail());
      setError('');
      setRequestId('');
      setState(fixture);
      return;
    }
    setState('loading');
    setError('');
    setRequestId('');
    try {
      const app = getCloudBaseApp();
      const user = await app.auth().getCurrentUser();
      if (!user) {
        setWhoami(null);
        setEmail('');
        setState('signed_out');
        return;
      }
      setEmail(user.email || '');
      const result = await callAdminApi<WhoAmI>('whoami');
      setWhoami(result);
      setEmail(result.email || user.email || '');
      setState('ready');
    } catch (caught) {
      if (caught instanceof AdminConfigError) {
        setState('config_error');
        setError(copy.login.configMissing);
        return;
      }
      if (caught instanceof AdminApiError) {
        setRequestId(caught.requestId);
        if (caught.code === 'admin_unauthenticated') {
          setWhoami(null);
          setState('signed_out');
          return;
        }
        if (caught.code === 'admin_forbidden') {
          setWhoami(null);
          setState('forbidden');
          setError(caught.message);
          return;
        }
        if (caught.code === 'admin_email_unverified') {
          setWhoami(null);
          setState('unverified');
          setError(caught.message);
          return;
        }
        setState('identity_error');
        setError(caught.message);
        return;
      }
      setState('identity_error');
      setError(errorMessage(caught));
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const signIn = useCallback(async (nextEmail: string, password: string) => {
    setError('');
    setRequestId('');
    try {
      const app = getCloudBaseApp();
      const { error: signInError } = await app.auth().signInWithPassword({
        email: nextEmail.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        const message = authErrorMessage(signInError);
        if (message === copy.login.unverified) {
          setEmail(nextEmail.trim().toLowerCase());
          setState('unverified');
          setError(message);
          return;
        }
        setError(message);
        return;
      }
      await check();
    } catch (caught) {
      if (caught instanceof AdminConfigError) {
        setState('config_error');
        setError(copy.login.configMissing);
        return;
      }
      setError(authErrorMessage(caught));
    }
  }, [check]);

  const signOut = useCallback(async () => {
    try {
      await getCloudBaseApp().auth().signOut();
    } catch {
      // 本地会话已失效时忽略，继续回到登录页。
    }
    setWhoami(null);
    setEmail('');
    setError('');
    setRequestId('');
    setState('signed_out');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      state,
      whoami,
      email,
      error,
      requestId,
      signIn,
      signOut,
      retry: check,
    }),
    [state, whoami, email, error, requestId, signIn, signOut, check],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
