import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const generateSmartList = action({
  args: {
    prompt: v.string(),
    dietaryPreferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Usuário não autenticado");

    const dietaryInfo = args.dietaryPreferences?.length 
      ? `Preferências alimentares: ${args.dietaryPreferences.join(", ")}. ` 
      : "";

    const systemPrompt = `Você é um assistente especializado em listas de compras brasileiras. 
    ${dietaryInfo}
    Crie uma lista de compras baseada no pedido do usuário. 
    Responda APENAS com um JSON válido no formato:
    {
      "title": "Título da lista",
      "description": "Descrição opcional",
      "items": [
        {
          "name": "Nome do item",
          "quantity": "Quantidade (opcional)",
          "category": "Categoria (Hortifruti, Laticínios, Padaria, Carnes, Limpeza, Higiene, Bebidas, Outros)"
        }
      ]
    }
    
    Use nomes de produtos brasileiros e quantidades realistas.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.prompt }
        ],
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Resposta vazia da IA");

      const parsedResponse = JSON.parse(content);
      
      // Validate response structure
      if (!parsedResponse.title || !Array.isArray(parsedResponse.items)) {
        throw new Error("Formato de resposta inválido");
      }

      return parsedResponse;
    } catch (error) {
      console.error("Erro ao gerar lista inteligente:", error);
      throw new Error("Erro ao gerar lista. Tente novamente.");
    }
  },
});

export const getItemSuggestions = action({
  args: {
    query: v.string(),
    listId: v.optional(v.id("shoppingLists")),
  },
  handler: async (ctx, args): Promise<Array<{name: string, category: string, frequency: number}>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get user's AI suggestions
    const userSuggestions: Array<{name: string, category: string, frequency: number}> = await ctx.runQuery(internal.ai.getUserSuggestions, {
      userId,
      query: args.query,
    });

    // If we have enough suggestions from history, return them
    if (userSuggestions.length >= 5) {
      return userSuggestions.slice(0, 8);
    }

    // Otherwise, use AI to generate suggestions
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de lista de compras brasileiro. 
            Sugira itens de supermercado que começam com ou são relacionados ao texto fornecido.
            Responda APENAS com um array JSON de strings com nomes de produtos brasileiros.
            Máximo 8 sugestões. Exemplo: ["Leite integral", "Leite desnatado", "Leite condensado"]`
          },
          {
            role: "user",
            content: args.query
          }
        ],
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) return userSuggestions;

      const aiSuggestions = JSON.parse(content);
      
      // Combine user suggestions with AI suggestions
      const combined = [...userSuggestions];
      for (const suggestion of aiSuggestions) {
        if (combined.length >= 8) break;
        if (!combined.some(s => s.name.toLowerCase() === suggestion.toLowerCase())) {
          combined.push({
            name: suggestion,
            category: "Outros",
            frequency: 0,
          });
        }
      }

      return combined.slice(0, 8);
    } catch (error) {
      console.error("Erro ao obter sugestões de IA:", error);
      return userSuggestions;
    }
  },
});

export const getUserSuggestions = internalQuery({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const suggestions = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_user_frequency", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.gte(q.field("frequency"), 1)
      )
      .order("desc")
      .take(20);

    // Filter by query
    const filtered = suggestions.filter(s => 
      s.itemName.toLowerCase().includes(args.query.toLowerCase())
    );

    return filtered.map(s => ({
      name: s.itemName,
      category: s.category,
      frequency: s.frequency,
    }));
  },
});

export const updateItemFrequency = internalMutation({
  args: {
    userId: v.id("users"),
    itemName: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiSuggestions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("itemName"), args.itemName))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        frequency: existing.frequency + 1,
        lastSuggested: Date.now(),
        category: args.category,
      });
    } else {
      await ctx.db.insert("aiSuggestions", {
        userId: args.userId,
        itemName: args.itemName,
        category: args.category,
        frequency: 1,
        lastSuggested: Date.now(),
      });
    }
  },
});

export const categorizeItem = action({
  args: { itemName: v.string() },
  handler: async (ctx, args) => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `Categorize o item de supermercado brasileiro fornecido em uma das seguintes categorias:
            - Hortifruti
            - Laticínios
            - Padaria
            - Carnes
            - Limpeza
            - Higiene
            - Bebidas
            - Outros
            
            Responda APENAS com o nome da categoria.`
          },
          {
            role: "user",
            content: args.itemName
          }
        ],
        temperature: 0.1,
      });

      const category = response.choices[0].message.content?.trim();
      const validCategories = ["Hortifruti", "Laticínios", "Padaria", "Carnes", "Limpeza", "Higiene", "Bebidas", "Outros"];
      
      return validCategories.includes(category || "") ? category : "Outros";
    } catch (error) {
      console.error("Erro ao categorizar item:", error);
      return "Outros";
    }
  },
});

export const getWeeklySuggestions = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    try {
      const userSuggestions = await ctx.runQuery(internal.ai.getTopUserItems, {
        userId,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `Baseado no histórico de compras do usuário, sugira itens que ele pode ter esquecido de comprar esta semana.
            Considere itens básicos e essenciais para uma casa brasileira.
            Responda com um JSON no formato:
            {
              "suggestions": [
                {
                  "name": "Nome do item",
                  "reason": "Motivo da sugestão",
                  "category": "Categoria"
                }
              ]
            }
            Máximo 5 sugestões.`
          },
          {
            role: "user",
            content: `Histórico de itens frequentes: ${userSuggestions.map((s: any) => s.itemName).join(", ")}`
          }
        ],
        temperature: 0.5,
      });

      const content = response.choices[0].message.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro ao obter sugestões semanais:", error);
      return [];
    }
  },
});

export const getTopUserItems = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiSuggestions")
      .withIndex("by_user_frequency", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(10);
  },
});
