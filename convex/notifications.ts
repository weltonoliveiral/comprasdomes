import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getUserNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notificação não encontrada");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
  },
});

export const notifyListUpdate = internalMutation({
  args: {
    listId: v.id("shoppingLists"),
    updatedBy: v.id("users"),
    updateType: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) return;

    const updatedByUser = await ctx.db.get(args.updatedBy);
    if (!updatedByUser) return;

    // Get all collaborators
    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    // Notify all collaborators except the one who made the update
    for (const share of shares) {
      if (share.sharedWithUserId !== args.updatedBy) {
        await ctx.db.insert("notifications", {
          userId: share.sharedWithUserId,
          type: "list_updated",
          title: "Lista atualizada",
          message: `${updatedByUser.email} atualizou a lista "${list.title}"`,
          isRead: false,
          relatedListId: args.listId,
          fromUserId: args.updatedBy,
        });
      }
    }

    // Also notify the owner if they're not the one who updated
    if (list.ownerId !== args.updatedBy) {
      await ctx.db.insert("notifications", {
        userId: list.ownerId,
        type: "list_updated",
        title: "Lista atualizada",
        message: `${updatedByUser.email} atualizou a lista "${list.title}"`,
        isRead: false,
        relatedListId: args.listId,
        fromUserId: args.updatedBy,
      });
    }
  },
});

export const notifyItemAdded = internalMutation({
  args: {
    listId: v.id("shoppingLists"),
    itemName: v.string(),
    addedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) return;

    const addedByUser = await ctx.db.get(args.addedBy);
    if (!addedByUser) return;

    // Get all collaborators
    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    // Notify all collaborators except the one who added the item
    for (const share of shares) {
      if (share.sharedWithUserId !== args.addedBy) {
        await ctx.db.insert("notifications", {
          userId: share.sharedWithUserId,
          type: "item_added",
          title: "Item adicionado",
          message: `${addedByUser.email} adicionou "${args.itemName}" à lista "${list.title}"`,
          isRead: false,
          relatedListId: args.listId,
          fromUserId: args.addedBy,
        });
      }
    }

    // Also notify the owner if they're not the one who added
    if (list.ownerId !== args.addedBy) {
      await ctx.db.insert("notifications", {
        userId: list.ownerId,
        type: "item_added",
        title: "Item adicionado",
        message: `${addedByUser.email} adicionou "${args.itemName}" à lista "${list.title}"`,
        isRead: false,
        relatedListId: args.listId,
        fromUserId: args.addedBy,
      });
    }
  },
});
