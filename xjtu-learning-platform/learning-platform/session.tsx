'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, passwordProblem } from './api-client';
export { api } from './api-client';

export type LearningUser = {
  id: string;
  name: string;
  username: string;
  role: 'teacher' | 'student';
  mustChangePassword: boolean;
  className: string;
  disabled?: boolean;
};
type Session = {
  user: LearningUser;
  logout: () => Promise<void>;
  changePassword: () => void;
};
const Context = createContext<Session | null>(null);
export const useLearning = () => useContext(Context);
export function LearningProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LearningUser | null>(null),
    [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [next, setNext] = useState(''),
    [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [changing, setChanging] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  async function refresh() {
    const result = await api<{ user: LearningUser | null }>('/me');
    setUser(result.user);
  }
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    await api('/logout', 'POST');
    setUser(null);
    setPassword('');
    setNext('');
    setConfirm('');
    setError('');
    setShowPasswords(false);
    setChanging(false);
  }
  if (loading)
    return (
      <main className="grid min-h-screen place-items-center text-brand-blue">
        正在连接课程平台……
      </main>
    );
  const reset = user?.mustChangePassword || changing;
  if (!user || reset)
    return (
      <main className="grid min-h-screen place-items-center bg-secondary/35 p-5">
        <section className="w-full max-w-md rounded-2xl border bg-card p-7 shadow-sm">
          <img
            src="/management-school-mark.webp"
            alt="西安交通大学管理学院"
            className="mx-auto mb-5 h-24 w-20 object-contain"
          />
          <p className="text-center text-sm text-muted-foreground">
            西安交通大学管理学院
          </p>
          <h1 className="mt-2 text-center text-2xl font-semibold text-brand-blue">
            智能商务分析与实践
          </h1>
          <h2 className="mb-5 mt-7 text-lg font-medium">
            {reset ? '设置个人密码' : '登录课程平台'}
          </h2>
          {reset && (
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              {user?.mustChangePassword
                ? '首次登录需要设置个人密码。当前密码请填写老师发给你的临时密码；保存后用新密码重新登录。'
                : '请输入当前密码，再设置新的个人密码。保存后所有设备都需要重新登录。'}
            </p>
          )}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              try {
                if (reset) {
                  const problem = passwordProblem(password, next, confirm);
                  if (problem) throw new Error(problem);
                  await api('/password', 'POST', {
                    currentPassword: password,
                    newPassword: next,
                  });
                  setUser(null);
                  setChanging(false);
                  setPassword('');
                  setNext('');
                  setConfirm('');
                  setShowPasswords(false);
                  setNotice('密码已更新，请使用新密码登录。');
                } else {
                  await api('/login', 'POST', {
                    username: username.trim(),
                    password,
                  });
                  setPassword('');
                  setShowPasswords(false);
                  setNotice('');
                  await refresh();
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : '连接失败。');
              } finally {
                setBusy(false);
              }
            }}
          >
            {!reset && (
              <label className="block text-sm">
                课程账号
                <Input
                  className="mt-2"
                  autoComplete="username"
                  name="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={32}
                />
              </label>
            )}
            <label className="block text-sm">
              {reset ? '当前密码（首次登录填写临时密码）' : '密码'}
              <Input
                className="mt-2"
                type={showPasswords ? 'text' : 'password'}
                name="current-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={128}
              />
            </label>
            {reset && (
              <>
                <label className="block text-sm">
                  新密码
                  <Input
                    className="mt-2"
                    type={showPasswords ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                  />
                  <span className="mt-1 block text-muted-foreground">
                    至少 12 位，建议使用多个词语组合，不要使用学号。
                  </span>
                </label>
                <label className="block text-sm">
                  再次输入新密码
                  <Input
                    className="mt-2"
                    type={showPasswords ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={12}
                    maxLength={128}
                  />
                </label>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPasswords(!showPasswords)}
              aria-pressed={showPasswords}
            >
              {showPasswords ? '隐藏密码' : '显示密码，检查粘贴内容'}
            </Button>
            {reset && next && (
              <p className="text-sm text-muted-foreground" role="status">
                {passwordProblem(password, next, confirm) ||
                  '密码长度和两次输入均符合要求。'}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-brand-blue">
                {notice}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? '正在处理……' : reset ? '保存并重新登录' : '登录'}
            </Button>
          </form>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            账号由任课教师统一分配。忘记密码或临时密码过期，请联系教师重置。
          </p>
          {user && (
            <Button
              className="mt-3"
              variant="ghost"
              onClick={() => void logout().catch((e) => setError(e.message))}
            >
              退出当前账号
            </Button>
          )}
        </section>
      </main>
    );
  return (
    <Context.Provider
      value={{
        user,
        logout,
        changePassword: () => {
          setError('');
          setNotice('');
          setShowPasswords(false);
          setChanging(true);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
