import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ListsGrid } from "./ListsGrid";
import { CreateListModal } from "./CreateListModal";
import { SmartListModal } from "./SmartListModal";
import { NotificationPanel } from "./NotificationPanel";
import { PendingInvites } from "./PendingInvites";

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const userProfile = useQuery(api.userProfiles.getCurrentUserProfile);
  const notifications = useQuery(api.notifications.getUserNotifications);
  const pendingInvites = useQuery(api.sharing.getPendingInvites);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const pendingCount = pendingInvites?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Olá, {userProfile?.profile?.name || "Usuário"}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gerencie suas listas de compras inteligentes
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-3 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700"
          >
            <span className="text-xl">🔔</span>
            {(unreadCount > 0 || pendingCount > 0) && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount + pendingCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowSmartModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
          >
            ✨ IA Inteligente
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            + Nova Lista
          </button>
        </div>
      </div>

      {/* Pending Invites */}
      {pendingCount > 0 && <PendingInvites />}

      {/* Lists Grid */}
      <ListsGrid />

      {/* Modals */}
      {showCreateModal && (
        <CreateListModal onClose={() => setShowCreateModal(false)} />
      )}
      
      {showSmartModal && (
        <SmartListModal onClose={() => setShowSmartModal(false)} />
      )}
      
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
