export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border text-center">
        <div className="text-4xl mb-4">&#9993;</div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-foreground-muted">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
      </div>
    </div>
  );
}
