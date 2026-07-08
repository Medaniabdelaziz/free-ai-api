export async function GET() {
  return new Response(JSON.stringify({
    object: "list",
    data: [
      { id: "openai", object: "model", owned_by: "pollinations" },
      { id: "mistral", object: "model", owned_by: "pollinations" },
      { id: "llama", object: "model", owned_by: "pollinations" },
      { id: "deepseek", object: "model", owned_by: "pollinations" },
      { id: "qwen", object: "model", owned_by: "pollinations" }
    ]
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
