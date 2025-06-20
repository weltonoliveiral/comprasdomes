"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function ElegantSignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(true);
  const [passwordValid, setPasswordValid] = useState(true);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("flow", flow);
    
    try {
      await signIn("password", formData);
      toast.success(flow === "signIn" ? "Bem-vindo de volta!" : "Conta criada com sucesso!");
    } catch (error: any) {
      let toastTitle = "";
      if (error.message.includes("Invalid password")) {
        toastTitle = "Senha incorreta. Tente novamente.";
      } else if (error.message.includes("User not found")) {
        toastTitle = "Usuário não encontrado. Deseja criar uma conta?";
      } else if (error.message.includes("User already exists")) {
        toastTitle = "Este email já está em uso. Tente fazer login.";
      } else {
        toastTitle = flow === "signIn" 
          ? "Erro ao fazer login. Verifique suas credenciais." 
          : "Erro ao criar conta. Tente novamente.";
      }
      toast.error(toastTitle);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <span className="text-3xl">🛒</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {flow === "signIn" ? "Bem-vindo de volta!" : "Criar conta"}
          </h2>
          <p className="text-blue-100 text-sm">
            {flow === "signIn" 
              ? "Entre na sua conta para continuar" 
              : "Crie sua conta e comece a organizar suas compras"}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">📧</span>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailValid(e.target.value === "" || validateEmail(e.target.value));
                  }}
                  className={`w-full pl-12 pr-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all ${
                    emailValid 
                      ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500" 
                      : "border-red-300 dark:border-red-600 focus:ring-red-500"
                  }`}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              {!emailValid && email && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Por favor, insira um email válido
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-lg">🔒</span>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordValid(e.target.value === "" || e.target.value.length >= 6);
                  }}
                  className={`w-full pl-12 pr-12 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:border-transparent transition-all ${
                    passwordValid 
                      ? "border-gray-300 dark:border-gray-600 focus:ring-blue-500" 
                      : "border-red-300 dark:border-red-600 focus:ring-red-500"
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="text-lg">{showPassword ? "🙈" : "👁️"}</span>
                </button>
              </div>
              {!passwordValid && password && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  A senha deve ter pelo menos 6 caracteres
                </p>
              )}
              {flow === "signUp" && passwordValid && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mínimo de 6 caracteres
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !email || !password || !emailValid || !passwordValid}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {flow === "signIn" ? "Entrando..." : "Criando conta..."}
                </div>
              ) : (
                flow === "signIn" ? "Entrar" : "Criar conta"
              )}
            </button>
          </form>

          {/* Toggle Flow */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {flow === "signIn" ? "Não tem uma conta?" : "Já tem uma conta?"}
              <button
                type="button"
                onClick={() => {
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                  setEmail("");
                  setPassword("");
                }}
                className="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:underline transition-colors"
              >
                {flow === "signIn" ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            <span className="px-4 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
              ou
            </span>
            <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          {/* Anonymous Login */}
          <button
            onClick={() => void signIn("anonymous")}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="text-lg">👤</span>
            Continuar como visitante
          </button>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">✨</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  IA Inteligente
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Tempo Real
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ao continuar, você concorda com nossos{" "}
          <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">
            Termos de Uso
          </button>{" "}
          e{" "}
          <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">
            Política de Privacidade
          </button>
        </p>
      </div>
    </div>
  );
}
