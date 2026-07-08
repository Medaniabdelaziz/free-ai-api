const MODELS = {
  "openai": "openai",
  "mistral": "mistral",
  "llama": "llama",
  "deepseek": "deepseek",
  "qwen": "qwen",
  "gpt-4o": "openai",
  "gpt-4": "openai",
  "gpt-3.5-turbo": "openai"
};

async function getReply(messages, model) {
  const selectedModel = MODELS[model] || "openai";
  let systemPart = "";
  let chatParts = [];

  for (const msg of messages) {
    if (msg.role === "system") systemPart = msg.content;
    else if (msg.role === "user") chatParts.push("User: " + msg.content);
    else if (msg.role === "assistant") chatParts.push("Assistant: " + msg.content);
  }

  let prompt = systemPart ? "[System]: " + systemPart + "\n\n" : "";
  prompt += chatParts.join("\n\n");

  if (!chatParts.length && messages.length > 0) {
    prompt = "User: " + messages[messages.length - 1].content;
  }

  try {
    const res = await fetch(
      "https://text.pollinations.ai/" + encodeURIComponent(prompt) + "?model=" + selectedModel
    );
    if (res.ok) {
      const text = await res.text();
      if (text.trim()) return text.trim();
    }
  } catch (e) {}

  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        model: selectedModel,
        seed: Math.floor(Math.random() * 99999)
      })
    });
    if (res.ok) {
      const text = await res.text();
      if (text.trim()) return text.trim();
    }
  } catch (e) {}

  throw new Error("فشل الاتصال");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const messages = body.messages || [];
    const model = body.model || "openai";
    const stream = body.stream || false;

    if (!messages.length) {
      return new Response(JSON.stringify({
        error: { message: "أرسل رسالة أولاً" }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const fullText = await getReply(messages, model);
            const words = fullText.split(" ");
            for (const word of words) {
              const chunk = {
                id: "chatcmpl-" + Date.now(),
                object: "chat.completion.chunk",
                model: model,
                choices: [{ index: 0, delta: { content: word + " " }, finish_reason: null }]
              };
              controller.enqueue(encoder.encode("data: " + JSON.stringify(chunk) + "\n\n"));
              await new Promise(r => setTimeout(r, 25));
            }
            const done = {
              id: "chatcmpl-" + Date.now(),
              object: "chat.completion.chunk",
              model: model,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            controller.enqueue(encoder.encode("data: " + JSON.stringify(done) + "\n\n"));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode("data: " + JSON.stringify({ error: { message: err.message } }) + "\n\n"));
            controller.close();
          }
        }
      });
      return new Response(readable, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }
      });
    }

    const reply = await getReply(messages, model);
    return new Response(JSON.stringify({
      id: "chatcmpl-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{ index: 0, message: { role: "assistant", content: reply }, finish_reason: "stop" }]
    }), { headers: { "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({
      error: { message: error.message || "خطأ داخلي" }
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
  }
