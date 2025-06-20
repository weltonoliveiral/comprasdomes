import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function PendingInvites() {
  const pendingInvites = useQuery(api.sharing.getPendingInvites);
  const respondToInvite = useMutation(api.sharing.respondToInvite);

  const handleResponse = async (listId: any, response: "accepted" | "declined") => {
    try {
      await respondToInvite({ listId, response });
      toast.success(
        response === "accepted" 
          ? "Convite aceito!" 
          : "Convite recusado"
      );
    } catch (error) {
      toast.error("Erro ao responder convite");
    }
  };

  if (!pendingInvites || pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📨</span>
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
          Convites Pendentes
        </h3>
      </div>
      
      <div className="space-y-3">
        {pendingInvites.map((invite) => (
          <div
            key={invite._id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {invite.list?.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Compartilhada por {invite.sharedBy?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Nível de acesso: {invite.accessLevel}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse(invite.listId, "accepted")}
                  className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => handleResponse(invite.listId, "declined")}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  Recusar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
