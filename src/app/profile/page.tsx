"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (response.ok) {
      setMessage("Profile updated successfully.");
      await update();
    } else {
      const data = await response.json();
      setMessage(data.error || "Failed to update profile.");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes("success")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            Profile changes are versioned. Your previous profile data is
            retained for audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
