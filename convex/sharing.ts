import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const shareList = mutation({
  args: {
    listId: v.id("shoppingLists"),
    userEmail: v.string(),
    accessLevel: v.union(v.literal("view"), v.literal("edit"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    // Check if user has admin access
    const hasAdminAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.eq(q.field("accessLevel"), "admin")
          )
        )
        .first();

    if (!hasAdminAccess) throw new Error("Sem permissão para compartilhar esta lista");

    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.userEmail))
      .first();

    if (!targetUser) throw new Error("Usuário não encontrado");

    // Check if already shared
    const existingShare = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("sharedWithUserId"), targetUser._id))
      .first();

    if (existingShare) {
      // Update existing share
      await ctx.db.patch(existingShare._id, {
        accessLevel: args.accessLevel,
        inviteStatus: "pending",
      });
      return existingShare._id;
    } else {
      // Create new share
      return await ctx.db.insert("listShares", {
        listId: args.listId,
        sharedWithUserId: targetUser._id,
        sharedByUserId: userId,
        accessLevel: args.accessLevel,
        inviteStatus: "pending",
      });
    }
  },
});

export const getListShares = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const list = await ctx.db.get(args.listId);
    if (!list) return [];

    // Check if user has admin access
    const hasAdminAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.eq(q.field("accessLevel"), "admin")
          )
        )
        .first();

    if (!hasAdminAccess) return [];

    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    return await Promise.all(
      shares.map(async (share) => {
        const user = await ctx.db.get(share.sharedWithUserId);
        return {
          ...share,
          user,
        };
      })
    );
  },
});

export const getPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const pendingShares = await ctx.db
      .query("listShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", userId))
      .filter((q) => q.eq(q.field("inviteStatus"), "pending"))
      .collect();

    return await Promise.all(
      pendingShares.map(async (share) => {
        const list = await ctx.db.get(share.listId);
        const sharedBy = await ctx.db.get(share.sharedByUserId);
        return {
          ...share,
          list,
          sharedBy,
        };
      })
    );
  },
});

export const respondToInvite = mutation({
  args: {
    listId: v.id("shoppingLists"),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const share = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .filter((q) => 
        q.and(
          q.eq(q.field("sharedWithUserId"), userId),
          q.eq(q.field("inviteStatus"), "pending")
        )
      )
      .first();

    if (!share) throw new Error("Convite não encontrado");

    if (args.response === "declined") {
      await ctx.db.delete(share._id);
    } else {
      await ctx.db.patch(share._id, { inviteStatus: "accepted" });
    }
  },
});

export const removeShare = mutation({
  args: {
    listId: v.id("shoppingLists"),
    sharedWithUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    // Check if user has admin access
    const hasAdminAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.eq(q.field("accessLevel"), "admin")
          )
        )
        .first();

    if (!hasAdminAccess) throw new Error("Sem permissão para remover compartilhamento");

    const share = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("sharedWithUserId"), args.sharedWithUserId))
      .first();

    if (share) {
      await ctx.db.delete(share._id);
    }
  },
});
