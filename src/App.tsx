import { useGoogleAuth } from './hooks/useGoogleAuth';
import { InventoryView } from './components/inventory/InventoryView';

export default function App() {
  const { user, loading, error, signIn, signOut } = useGoogleAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-400">Authentication error</p>
        <button onClick={signIn} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
        <h1 className="text-2xl font-bold tracking-tight">SmartInventory</h1>
        <button onClick={signIn} className="btn-primary">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <h1 className="text-lg font-semibold">SmartInventory</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{user.email}</span>
          <button onClick={signOut} className="btn-ghost text-xs">
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <InventoryView />
      </main>
    </div>
  );
}
