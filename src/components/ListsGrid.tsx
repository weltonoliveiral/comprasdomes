import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ListCard } from "./ListCard";
import { ListDetailModal } from "./ListDetailModal";
import type { Id } from "../../convex/_generated/dataModel";

export function ListsGrid() {
  const lists = useQuery(api.shoppingLists.getUserLists);
  const [selectedListId, setSelectedListId] = useState<Id<"shoppingLists"> | null>(null);

  if (lists === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Nenhuma lista ainda
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Crie sua primeira lista de compras ou use a IA para gerar uma automaticamente
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.filter(list => list !== null).map((list) => (
          <ListCard
            key={list._id}
            list={list}
            onClick={() => setSelectedListId(list._id)}
          />
        ))}
      </div>

      {selectedListId && (
        <ListDetailModal
          listId={selectedListId}
          onClose={() => setSelectedListId(null)}
        />
      )}
    </>
  );
}
