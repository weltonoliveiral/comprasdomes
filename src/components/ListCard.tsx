import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface ListCardProps {
  list: {
    _id: Id<"shoppingLists">;
    title: string;
    description?: string;
    category?: string;
    color?: string;
    accessLevel: "view" | "edit" | "admin";
    isShared: boolean;
    _creationTime: number;
  };
  onClick: () => void;
}

export function ListCard({ list, onClick }: ListCardProps) {
  const items = useQuery(api.shoppingLists.getListItems, { listId: list._id });

  const completedItems = items?.filter(item => item.isCompleted) || [];
  const totalItems = items?.length || 0;
  const progress = totalItems > 0 ? (completedItems.length / totalItems) * 100 : 0;

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "Supermercado": return "🛒";
      case "Farmácia": return "💊";
      case "Casa e Jardim": return "🏠";
      case "Eletrônicos": return "📱";
      case "Roupas": return "👕";
      case "Livros": return "📚";
      case "IA Gerada": return "✨";
      default: return "📝";
    }
  };

  const getAccessLevelText = (level: string) => {
    switch (level) {
      case "view": return "Visualização";
      case "edit": return "Edição";
      case "admin": return "Admin";
      default: return level;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: list.color + "20" }}
          >
            {getCategoryIcon(list.category)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {list.title}
            </h3>
            {list.category && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {list.category}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          {list.isShared && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              {getAccessLevelText(list.accessLevel)}
            </span>
          )}
        </div>
      </div>

      {list.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {list.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {completedItems.length} de {totalItems} itens
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: list.color || "#3B82F6",
            }}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Criada em {new Date(list._creationTime).toLocaleDateString("pt-BR")}
          </span>
          {list.isShared && (
            <span className="flex items-center gap-1">
              🔗 Compartilhada
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
