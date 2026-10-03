import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue</p>
      </div>
      <LoginForm />
    </div>
  );
}

export default LoginPage;
