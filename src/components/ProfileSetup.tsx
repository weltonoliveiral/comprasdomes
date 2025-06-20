import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileSetup() {
  const [name, setName] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProfile = useMutation(api.userProfiles.createOrUpdateProfile);
  const generateUploadUrl = useMutation(api.userProfiles.generateUploadUrl);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  const dietaryOptions = [
    "Vegetariano",
    "Vegano",
    "Sem glúten",
    "Sem lactose",
    "Diabético",
    "Low carb",
    "Keto",
    "Sem açúcar",
  ];

  const handleDietaryPreferenceToggle = (preference: string) => {
    setDietaryPreferences(prev =>
      prev.includes(preference)
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Upload failed");
      }
      
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao fazer upload da foto");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Por favor, insira seu nome");
      return;
    }

    try {
      let photoStorageId = null;
      
      if (profilePhoto) {
        photoStorageId = await handlePhotoUpload(profilePhoto);
      }

      await createProfile({
        name: name.trim(),
        dietaryPreferences,
        theme,
        ...(photoStorageId && { profilePhoto: photoStorageId }),
      });

      toast.success("Perfil criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar perfil");
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bem-vindo! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Vamos configurar seu perfil para personalizar sua experiência
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {profilePhoto ? (
                  <img
                    src={URL.createObjectURL(profilePhoto)}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  name.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 transition-colors"
                disabled={isUploading}
              >
                📷
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
              className="hidden"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clique na câmera para adicionar uma foto
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Seu nome completo"
              required
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={loggedInUser?.email || ""}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled
            />
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tema
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                  theme === "light"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">☀️</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Claro
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 p-3 rounded-xl border-2 transition-colors ${
                  theme === "dark"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🌙</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Escuro
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferências Alimentares
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Isso nos ajudará a fazer sugestões mais personalizadas
            </p>
            <div className="grid grid-cols-2 gap-2">
              {dietaryOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleDietaryPreferenceToggle(option)}
                  className={`p-3 rounded-xl border-2 text-sm transition-colors ${
                    dietaryPreferences.includes(option)
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
          >
            {isUploading ? "Configurando..." : "Finalizar Configuração"}
          </button>
        </form>
      </div>
    </div>
  );
}
