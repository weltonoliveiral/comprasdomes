import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return {
      user,
      profile,
    };
  },
});

export const createOrUpdateProfile = mutation({
  args: {
    name: v.string(),
    dietaryPreferences: v.array(v.string()),
    theme: v.union(v.literal("light"), v.literal("dark")),
    profilePhoto: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        name: args.name,
        dietaryPreferences: args.dietaryPreferences,
        theme: args.theme,
        ...(args.profilePhoto && { profilePhoto: args.profilePhoto }),
      });
      return existingProfile._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        name: args.name,
        dietaryPreferences: args.dietaryPreferences,
        theme: args.theme,
        ...(args.profilePhoto && { profilePhoto: args.profilePhoto }),
      });
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");
    
    return await ctx.storage.generateUploadUrl();
  },
});

export const getProfilePhotoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
