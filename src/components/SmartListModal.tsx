import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface SmartListModalProps {
  onClose: () => void;
}

export function SmartListModal({ onClose }: SmartListModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const userProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const generateSmartList = useAction(api.ai.generateSmartList);
  const createList = useMutation(api.shoppingLists.createList);
  const addItem = useMutation(api.shoppingLists.addItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Por favor, descreva o que você precisa");
      return;
    }

    setIsLoading(true);
    try {
      // Generate smart list using AI
      const smartList = await generateSmartList({
        prompt: prompt.trim(),
        dietaryPreferences: userProfile?.profile?.dietaryPreferences,
      });

      // Create the list
      const listId = await createList({
        title: smartList.title,
        description: smartList.description,
        category: "IA Gerada",
        color: "#8B5CF6",
      });

      // Add all items to the list
      for (const item of smartList.items) {
        await addItem({
          listId,
          name: item.name,
          quantity: item.quantity,
          category: item.category,
        });
      }

      toast.success("Lista inteligente criada com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao gerar lista. Tente novamente.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Ingredientes para um churrasco para 10 pessoas",
    "Compras básicas para a semana",
    "Ingredientes para fazer um bolo de chocolate",
    "Produtos de limpeza para casa",
    "Ingredientes para uma festa de aniversário",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              ✨ Lista Inteligente
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
              Descreva o que você precisa e a IA criará sua lista
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              O que você precisa?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Ex: Ingredientes para um jantar romântico para 2 pessoas..."
              required
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sugestões:
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {isLoading ? "Gerando..." : "✨ Gerar Lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
