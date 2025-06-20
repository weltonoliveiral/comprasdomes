import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    profilePhoto: v.optional(v.id("_storage")),
    dietaryPreferences: v.array(v.string()),
    theme: v.union(v.literal("light"), v.literal("dark")),
  }).index("by_user", ["userId"]),

  shoppingLists: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    isTemplate: v.boolean(),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
  }).index("by_owner", ["ownerId"])
    .index("by_template", ["isTemplate"]),

  listItems: defineTable({
    listId: v.id("shoppingLists"),
    name: v.string(),
    quantity: v.optional(v.string()),
    notes: v.optional(v.string()),
    category: v.optional(v.string()),
    isCompleted: v.boolean(),
    addedBy: v.id("users"),
    order: v.number(),
  }).index("by_list", ["listId"])
    .index("by_list_order", ["listId", "order"]),

  listShares: defineTable({
    listId: v.id("shoppingLists"),
    sharedWithUserId: v.id("users"),
    sharedByUserId: v.id("users"),
    accessLevel: v.union(
      v.literal("view"),
      v.literal("edit"),
      v.literal("admin")
    ),
    inviteStatus: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
  }).index("by_list", ["listId"])
    .index("by_shared_with", ["sharedWithUserId"])
    .index("by_shared_by", ["sharedByUserId"]),

  aiSuggestions: defineTable({
    userId: v.id("users"),
    itemName: v.string(),
    category: v.string(),
    frequency: v.number(),
    lastSuggested: v.number(),
    context: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_user_frequency", ["userId", "frequency"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("list_shared"),
      v.literal("item_added"),
      v.literal("list_updated"),
      v.literal("ai_suggestion")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedListId: v.optional(v.id("shoppingLists")),
    fromUserId: v.optional(v.id("users")),
  }).index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
