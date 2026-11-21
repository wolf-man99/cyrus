import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CyrusMark } from '@/components/brand/CyrusMark';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { PasswordField } from './PasswordField';

/** Shown after following a password-reset link. */
export function ResetPasswordPage() {
  const { updatePassword, signOut } = useAuth();
  const { show } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErrors({ password: 'Use at least 8 characters' });
    if (password !== confirm) return setErrors({ confirm: 'Passwords don’t match' });
    setBusy(true);
    try {
      await updatePassword(password);
      show({ tone: 'success', title: 'Password updated' });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Could not update password' });
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="cosmos" aria-hidden />
      <form onSubmit={submit} noValidate className="relative w-full max-w-sm space-y-4">
        <CyrusMark />
        <h1 className="font-display text-title font-semibold">Choose a new password</h1>
        <PasswordField label="New password" autoComplete="new-password" autoFocus value={password} error={errors.password} onChange={(e) => (setPassword(e.target.value), setErrors({}))} />
        <PasswordField label="Confirm password" autoComplete="new-password" value={confirm} error={errors.confirm} onChange={(e) => (setConfirm(e.target.value), setErrors({}))} />
        {errors.form && (
          <p role="alert" className="text-subhead text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" block size="lg" loading={busy}>
          Update password
        </Button>
        <Button type="button" variant="ghost" block onClick={() => void signOut()}>
          Cancel and sign out
        </Button>
      </form>
    </div>
  );
}
