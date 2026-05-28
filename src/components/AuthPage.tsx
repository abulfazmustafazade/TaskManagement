import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowRight, LayoutGrid, ShieldCheck, Users } from 'lucide-react';

export function AuthPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!fullName.trim() || !username.trim()) throw new Error(t.errors.required);
        const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanUsername) throw new Error(t.errors.required);
        const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
        if (existing) throw new Error(t.errors.usernameTaken);
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: pErr } = await supabase.from('profiles').insert({
            id: data.user.id, full_name: fullName, username: cleanUsername
          });
          if (pErr) throw pErr;
        }
      }
    } catch (e: any) {
      setErr(e.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center">
              <div className="w-3 h-3 bg-primary-foreground rounded-sm" />
            </div>
            <span className="text-xl font-semibold tracking-tight">{t.app.name}</span>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-5xl font-serif leading-tight mb-4 text-foreground">
            {t.lang.az === 'Azərbaycanca' ? 'Komandanızı bir araya gətirin.' : 'Bring your team together.'}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {t.lang.az === 'Azərbaycanca' 
              ? 'Tapşırıqları izləyin, mərhələlər təyin edin və hər addımı kontrol altında saxlayın.'
              : 'Track tasks, set milestones and keep every step under control.'}
          </p>
        </div>
        <div className="relative flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> Kanban</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {t.approvals.approve}</div>
          <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t.team.tabs.members}</div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-primary-foreground rounded-sm" />
            </div>
            <span className="text-lg font-semibold">{t.app.name}</span>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-serif mb-2">
              {mode === 'login' ? t.auth.welcomeBack : t.auth.createAccount}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? t.auth.enterEmail : t.auth.joinTeam}
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <Label>{t.auth.fullName}</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <Label>{t.auth.username}</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="john_doe" required />
                <p className="text-xs text-muted-foreground mt-1">{t.auth.usernameHint}</p>
              </div>
            )}
            <div>
              <Label>{t.auth.email}</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" required />
            </div>
            <div>
              <Label>{t.auth.password}</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{err}</div>}
            <Button type="submit" className="w-full justify-center" disabled={loading}>
              {loading && <span className="mr-2"><Loader /></span>}
              {mode === 'login' ? t.auth.login : t.auth.signup}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? t.auth.noAccount + ' ' : t.auth.hasAccount + ' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }} className="text-primary hover:underline font-medium">
              {mode === 'login' ? t.auth.registerNow : t.auth.loginNow}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
