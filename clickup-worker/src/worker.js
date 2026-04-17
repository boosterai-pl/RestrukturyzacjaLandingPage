export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const isAllowed =
      origin === env.ALLOWED_ORIGIN ||
      origin === "https://restrukturyzacja.boosterai.pl" ||
      origin === "https://restrukturyzacja-landing-page.vercel.app" ||
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
      const body = await request.json();
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const phoneRaw = typeof body.phone === "string" ? body.phone.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      const source = typeof body.source === "string" ? body.source.trim().slice(0, 80) : "";

      // Basic validation
      const hasValidEmail = email && email.includes("@") && email.length <= 160;
      // Accept only digits, space, +, -, (, ); require min 7 digits after normalization
      const phoneDigits = phoneRaw.replace(/[^0-9]/g, "");
      const hasValidPhone = /^[\+\s0-9\-\(\)]{7,40}$/.test(phoneRaw) && phoneDigits.length >= 7;

      if (!hasValidEmail && !hasValidPhone) {
        return new Response(
          JSON.stringify({ error: "Provide a valid email or phone" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isPhoneOnlyLead = (source || "").includes("Zostaw numer") && hasValidPhone;

      const now = new Date();
      const dateStr = now.toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Task name: prefer phone (priority callback requests), then name, then email
      const taskLabel = hasValidPhone ? phoneRaw : (name || email);
      const taskName = hasValidPhone
        ? `Oddzwoń w 2h: ${taskLabel}${name ? ` (${name})` : ""}`
        : `Nowy lead: ${taskLabel}`;

      const lines = [];
      if (name)           lines.push(`**Imię:** ${name}`);
      if (hasValidPhone)  lines.push(`**Telefon:** ${phoneRaw}`);
      if (hasValidEmail && !isPhoneOnlyLead) lines.push(`**Email:** ${email}`);
      lines.push(`**Źródło:** ${source || "Landing page - Kancelaria Restrukturyzacyjna"}`);
      if (origin)         lines.push(`**Origin:** ${origin}`);
      lines.push(`**Data:** ${dateStr}`);

      const taskData = {
        name: taskName,
        description: lines.join("\n"),
        status: "to do",
        priority: hasValidPhone ? 1 : 2, // urgent gdy jest telefon (callback w 2h)
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
