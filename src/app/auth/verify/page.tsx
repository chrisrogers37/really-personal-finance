export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">
        <div className="text-4xl mb-4">&#9993;</div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-600">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
      </div>
    </div>
  );
}
