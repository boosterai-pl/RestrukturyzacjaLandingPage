export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const isAllowed =
      origin === env.ALLOWED_ORIGIN ||
      origin === "http://localhost:3000" ||
      origin === "http://127.0.0.1:5500";

    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowed ? origin : env.ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const { email } = await request.json();

      if (!email || !email.includes("@")) {
        return new Response(
          JSON.stringify({ error: "Invalid email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const taskData = {
        name: `Nowy lead: ${email}`,
        description: `**Email:** ${email}\n**Źródło:** Landing page - Kancelaria Restrukturyzacyjna\n**Data:** ${dateStr}`,
        status: "to do",
        priority: 2,
        notify_all: true,
      };

      const clickupResponse = await fetch(
        `https://api.clickup.com/api/v2/list/${env.CLICKUP_LIST_ID}/task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: env.CLICKUP_API_KEY,
          },
          body: JSON.stringify(taskData),
        }
      );

      if (!clickupResponse.ok) {
        const errorText = await clickupResponse.text();
        console.error("ClickUp API error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create task" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const task = await clickupResponse.json();

      return new Response(
        JSON.stringify({ success: true, taskId: task.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
