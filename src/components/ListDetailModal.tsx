import { useState, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

interface ListDetailModalProps {
  listId: Id<"shoppingLists">;
  onClose: () => void;
}

export function ListDetailModal({ listId, onClose }: ListDetailModalProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState<"view" | "edit" | "admin">("edit");
  const [editingItem, setEditingItem] = useState<Id<"listItems"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const lists = useQuery(api.shoppingLists.getUserLists);
  const list = lists?.find(l => l?._id === listId);
  const items = useQuery(api.shoppingLists.getListItems, { listId });
  const shares = useQuery(api.sharing.getListShares, { listId });

  const addItem = useMutation(api.shoppingLists.addItem);
  const updateItem = useMutation(api.shoppingLists.updateItem);
  const deleteItem = useMutation(api.shoppingLists.deleteItem);
  const shareList = useMutation(api.sharing.shareList);
  const removeShare = useMutation(api.sharing.removeShare);
  const getItemSuggestions = useAction(api.ai.getItemSuggestions);
  const categorizeItem = useAction(api.ai.categorizeItem);

  if (!list) {
    return null;
  }

  const canEdit = list.accessLevel === "edit" || list.accessLevel === "admin";
  const canShare = list.accessLevel === "admin";

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const category = newItemCategory || await categorizeItem({ itemName: newItemName }) || "Outros";
      
      await addItem({
        listId,
        name: newItemName.trim(),
        quantity: newItemQuantity.trim() || undefined,
        category,
      });

      setNewItemName("");
      setNewItemQuantity("");
      setNewItemCategory("");
      setSuggestions([]);
      setShowSuggestions(false);
      toast.success("Item adicionado!");
    } catch (error) {
      toast.error("Erro ao adicionar item");
      console.error(error);
    }
  };

  const handleToggleComplete = async (itemId: Id<"listItems">, isCompleted: boolean) => {
    try {
      await updateItem({ itemId, isCompleted: !isCompleted });
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDeleteItem = async (itemId: Id<"listItems">) => {
    try {
      await deleteItem({ itemId });
      toast.success("Item removido!");
    } catch (error) {
      toast.error("Erro ao remover item");
    }
  };

  const handleEditItem = async (itemId: Id<"listItems">) => {
    try {
      await updateItem({
        itemId,
        name: editName.trim(),
        quantity: editQuantity.trim() || undefined,
      });
      setEditingItem(null);
      toast.success("Item atualizado!");
    } catch (error) {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      await shareList({
        listId,
        userEmail: shareEmail.trim(),
        accessLevel: shareAccessLevel,
      });
      setShareEmail("");
      setShowShareModal(false);
      toast.success("Lista compartilhada!");
    } catch (error) {
      toast.error("Erro ao compartilhar lista");
    }
  };

  const handleRemoveShare = async (sharedWithUserId: Id<"users">) => {
    try {
      await removeShare({ listId, sharedWithUserId });
      toast.success("Compartilhamento removido!");
    } catch (error) {
      toast.error("Erro ao remover compartilhamento");
    }
  };

  const handleInputChange = async (value: string) => {
    setNewItemName(value);
    
    if (value.length >= 2) {
      try {
        const itemSuggestions = await getItemSuggestions({
          query: value,
          listId,
        });
        setSuggestions(itemSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error getting suggestions:", error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setNewItemName(suggestion.name);
    setNewItemCategory(suggestion.category);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const completedItems = items?.filter(item => item.isCompleted) || [];
  const pendingItems = items?.filter(item => !item.isCompleted) || [];
  const progress = items?.length ? (completedItems.length / items.length) * 100 : 0;

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "Hortifruti": return "🥬";
      case "Laticínios": return "🥛";
      case "Padaria": return "🍞";
      case "Carnes": return "🥩";
      case "Limpeza": return "🧽";
      case "Higiene": return "🧴";
      case "Bebidas": return "🥤";
      default: return "📦";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {list.title}
              </h2>
              {list.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {list.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {completedItems.length} de {items?.length || 0} itens
                  </span>
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                {list.isShared && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                    Compartilhada
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canShare && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  Compartilhar
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Item Form */}
            {canEdit && (
              <div className="lg:col-span-3">
                <form onSubmit={handleAddItem} className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={newItemName}
                        onChange={(e) => handleInputChange(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Adicionar item..."
                      />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectSuggestion(suggestion)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <span>{getCategoryIcon(suggestion.category)}</span>
                              <span className="text-gray-900 dark:text-white">{suggestion.name}</span>
                              {suggestion.frequency > 0 && (
                                <span className="text-xs text-gray-500 ml-auto">
                                  Usado {suggestion.frequency}x
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      className="w-24 px-3 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Qtd"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Itens Pendentes ({pendingItems.length})
              </h3>
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <button
                      onClick={() => handleToggleComplete(item._id, item.isCompleted)}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-500 hover:border-green-500 transition-colors"
                      disabled={!canEdit}
                    />
                    <span className="text-lg">{getCategoryIcon(item.category)}</span>
                    {editingItem === item._id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded border"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 px-2 py-1 rounded border"
                          placeholder="Qtd"
                        />
                        <button
                          onClick={() => handleEditItem(item._id)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingItem(null)}
                          className="px-2 py-1 bg-gray-500 text-white rounded text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-gray-600 dark:text-gray-400 ml-2">
                              ({item.quantity})
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingItem(item._id);
                                setEditName(item.name);
                                setEditQuantity(item.quantity || "");
                              }}
                              className="p-1 text-gray-500 hover:text-blue-500"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item._id)}
                              className="p-1 text-gray-500 hover:text-red-500"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {completedItems.length > 0 && (
                <>
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-6">
                    Itens Concluídos ({completedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {completedItems.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl opacity-75"
                      >
                        <button
                          onClick={() => handleToggleComplete(item._id, item.isCompleted)}
                          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs"
                          disabled={!canEdit}
                        >
                          ✓
                        </button>
                        <span className="text-lg">{getCategoryIcon(item.category)}</span>
                        <div className="flex-1">
                          <span className="text-gray-600 dark:text-gray-400 line-through">
                            {item.name}
                          </span>
                          {item.quantity && (
                            <span className="text-gray-500 dark:text-gray-500 ml-2">
                              ({item.quantity})
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {canShare && shares && shares.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Compartilhada com
                  </h3>
                  <div className="space-y-2">
                    {shares.map((share) => (
                      <div
                        key={share._id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {share.user?.email}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {share.accessLevel}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveShare(share.sharedWithUserId)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Compartilhar Lista
              </h3>
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email do usuário
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nível de acesso
                  </label>
                  <select
                    value={shareAccessLevel}
                    onChange={(e) => setShareAccessLevel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="view">Visualização</option>
                    <option value="edit">Edição</option>
                    <option value="admin">Administração</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
                  >
                    Compartilhar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
