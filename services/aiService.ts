import { StockItem, ChatMessage, AIResponse, Warehouse } from '../types';

const API_KEY = "ddc-a4f-8e8a9d12c0f14791bbbeafe9ec18fbc7";
const API_URL = "https://api.a4f.co/v1/chat/completions";
const MODEL = "provider-1/gpt-oss-20b";

export const sendMessageToAI = async (
  messages: ChatMessage[],
  context: { inventory: StockItem[], warehouses: Warehouse[], currentWarehouseId?: string }
): Promise<string> => {
  
  // Create a context summary for the AI
  const warehouse = context.warehouses.find(w => w.id === context.currentWarehouseId);
  const relevantStock = context.currentWarehouseId 
    ? context.inventory.filter(i => i.warehouseId === context.currentWarehouseId)
    : context.inventory;

  // Limit context size to avoid token limits
  const stockSummary = relevantStock.slice(0, 50).map(item => {
    const whName = !context.currentWarehouseId 
      ? `(${context.warehouses.find(w => w.id === item.warehouseId)?.name || 'Unknown'})` 
      : '';
    return `- ${item.name} ${whName}: ${item.quantity} units @ $${item.price}`;
  }).join('\n');

  const systemContent = `You are StockMaster AI.
    
  **Context:**
  Location: ${warehouse ? warehouse.name : "Global Overview"}
  Warehouses: ${context.warehouses.map(w => w.name).join(", ")}
  Current Warehouse ID: ${context.currentWarehouseId || "NONE"}
  
  **Stock Sample:**
  ${stockSummary}

  **Instructions:**
  1. Reply in **Hinglish** (Hindi + English).
  2. If the user wants to **ADD** an item and you have a Current Warehouse ID, you MUST append a specific JSON command at the end of your response.
  
  **JSON Format for Adding Items:**
  ||JSON||
  {
    "action": "add",
    "item": {
      "name": "Item Name",
      "quantity": 10,
      "price": 100,
      "category": "General",
      "minThreshold": 5,
      "description": "Added by AI"
    }
  }
  ||END||

  **Rules:**
  - ONLY output the JSON if the user explicitly asks to add stock.
  - If no warehouse is selected (Global View), ask the user to select a warehouse first.
  - Keep the conversation part natural. Example: "Theek hai, main 50 Mouse add kar raha hu." followed by the JSON block.
  `;

  const systemMessage = {
    role: "system",
    content: systemContent
  };

  const apiMessages = [
    systemMessage,
    ...messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: AIResponse = await response.json();
    return data.choices[0]?.message?.content || "No response.";

  } catch (error) {
    console.error("Error calling AI:", error);
    return "Error: Server se connect nahi ho pa raha hai.";
  }
};
