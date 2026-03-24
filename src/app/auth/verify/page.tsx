import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth rounded-2xl border border-border shadow-sm relative text-center animate-scale-in">
        <Mail className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-foreground-muted">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
      </div>
    </div>
  );
}
