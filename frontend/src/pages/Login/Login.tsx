import { type FormEvent, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../../api/auth";
import { useThemeStore } from "../../store/themeStore";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const loginMutation = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    loginMutation.mutate(
      { username, password },
      {
        onSuccess: (data) => {
          localStorage.setItem("jwt", data.access_token);
          navigate("/dashboard");
        },
        onError: (err) => {
          const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
          setError(detail ?? "Username atau password salah");
        },
      },
    );
  }

  return (
    <div className="relative flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
        className="absolute right-6 top-6 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h1 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Login</h1>

        <label
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          htmlFor="username"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          autoComplete="username"
        />

        <label
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          autoComplete="current-password"
        />

        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loginMutation.isPending ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
