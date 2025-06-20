import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const getUserLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get owned lists
    const ownedLists = await ctx.db
      .query("shoppingLists")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // Get shared lists
    const sharedListAccess = await ctx.db
      .query("listShares")
      .withIndex("by_shared_with", (q) => q.eq("sharedWithUserId", userId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    const sharedLists = await Promise.all(
      sharedListAccess.map(async (share) => {
        const list = await ctx.db.get(share.listId);
        return list ? { ...list, accessLevel: share.accessLevel, isShared: true } : null;
      })
    );

    const validSharedLists = sharedLists.filter(Boolean);

    return [
      ...ownedLists.map(list => ({ ...list, accessLevel: "admin" as const, isShared: false })),
      ...validSharedLists
    ];
  },
});

export const createList = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    return await ctx.db.insert("shoppingLists", {
      title: args.title,
      description: args.description,
      ownerId: userId,
      isTemplate: false,
      category: args.category,
      color: args.color,
    });
  },
});

export const updateList = mutation({
  args: {
    listId: v.id("shoppingLists"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    // Check if user has edit access
    const hasAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.or(
              q.eq(q.field("accessLevel"), "edit"),
              q.eq(q.field("accessLevel"), "admin")
            )
          )
        )
        .first();

    if (!hasAccess) throw new Error("Sem permissão para editar esta lista");

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.listId, updates);

    // Send notification to collaborators
    await ctx.scheduler.runAfter(0, internal.notifications.notifyListUpdate, {
      listId: args.listId,
      updatedBy: userId,
      updateType: "list_updated",
    });

    return args.listId;
  },
});

export const deleteList = mutation({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    if (list.ownerId !== userId) {
      throw new Error("Apenas o proprietário pode excluir a lista");
    }

    // Delete all items in the list
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete all shares
    const shares = await ctx.db
      .query("listShares")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    // Delete the list
    await ctx.db.delete(args.listId);
  },
});

export const getListItems = query({
  args: { listId: v.id("shoppingLists") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check access
    const list = await ctx.db.get(args.listId);
    if (!list) return [];

    const hasAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted")
          )
        )
        .first();

    if (!hasAccess) return [];

    return await ctx.db
      .query("listItems")
      .withIndex("by_list_order", (q) => q.eq("listId", args.listId))
      .collect();
  },
});

export const addItem = mutation({
  args: {
    listId: v.id("shoppingLists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    // Check edit access
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    const hasEditAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.or(
              q.eq(q.field("accessLevel"), "edit"),
              q.eq(q.field("accessLevel"), "admin")
            )
          )
        )
        .first();

    if (!hasEditAccess) throw new Error("Sem permissão para editar esta lista");

    // Get next order
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list", (q) => q.eq("listId", args.listId))
      .collect();

    const maxOrder = Math.max(...items.map(item => item.order), -1);

    const itemId = await ctx.db.insert("listItems", {
      listId: args.listId,
      name: args.name,
      quantity: args.quantity,
      notes: args.notes,
      category: args.category,
      isCompleted: false,
      addedBy: userId,
      order: maxOrder + 1,
    });

    // Update AI suggestions
    await ctx.scheduler.runAfter(0, internal.ai.updateItemFrequency, {
      userId,
      itemName: args.name,
      category: args.category || "Outros",
    });

    // Notify collaborators
    await ctx.scheduler.runAfter(0, internal.notifications.notifyItemAdded, {
      listId: args.listId,
      itemName: args.name,
      addedBy: userId,
    });

    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("listItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item não encontrado");

    // Check edit access
    const list = await ctx.db.get(item.listId);
    if (!list) throw new Error("Lista não encontrada");

    const hasEditAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", item.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.or(
              q.eq(q.field("accessLevel"), "edit"),
              q.eq(q.field("accessLevel"), "admin")
            )
          )
        )
        .first();

    if (!hasEditAccess) throw new Error("Sem permissão para editar esta lista");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.quantity !== undefined) updates.quantity = args.quantity;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.category !== undefined) updates.category = args.category;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;

    await ctx.db.patch(args.itemId, updates);
    return args.itemId;
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("listItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item não encontrado");

    // Check edit access
    const list = await ctx.db.get(item.listId);
    if (!list) throw new Error("Lista não encontrada");

    const hasEditAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", item.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.or(
              q.eq(q.field("accessLevel"), "edit"),
              q.eq(q.field("accessLevel"), "admin")
            )
          )
        )
        .first();

    if (!hasEditAccess) throw new Error("Sem permissão para editar esta lista");

    await ctx.db.delete(args.itemId);
  },
});

export const reorderItems = mutation({
  args: {
    listId: v.id("shoppingLists"),
    itemOrders: v.array(v.object({
      itemId: v.id("listItems"),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    // Check edit access
    const list = await ctx.db.get(args.listId);
    if (!list) throw new Error("Lista não encontrada");

    const hasEditAccess = list.ownerId === userId || 
      await ctx.db
        .query("listShares")
        .withIndex("by_list", (q) => q.eq("listId", args.listId))
        .filter((q) => 
          q.and(
            q.eq(q.field("sharedWithUserId"), userId),
            q.eq(q.field("inviteStatus"), "accepted"),
            q.or(
              q.eq(q.field("accessLevel"), "edit"),
              q.eq(q.field("accessLevel"), "admin")
            )
          )
        )
        .first();

    if (!hasEditAccess) throw new Error("Sem permissão para editar esta lista");

    // Update all item orders
    for (const { itemId, order } of args.itemOrders) {
      await ctx.db.patch(itemId, { order });
    }
  },
});
