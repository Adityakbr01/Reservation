import { RegisterForm } from "../components/RegisterForm";

export function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Create admin account</h1>
        <p className="text-sm text-muted-foreground">Get started in seconds</p>
      </div>
      <RegisterForm />
    </div>
  );
}

export default RegisterPage;
