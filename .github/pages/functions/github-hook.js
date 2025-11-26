export async function onRequestGet(context) {
  return new Response(
    JSON.stringify({ ok: true, message: "Function GET active" }, null, 2),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function onRequestPost(context) {
  try {
    const request = context.request;
    const rawBody = await request.text();

    const url =
      "https://api.github.com/repos/JulioQes/POC-LAUREATE-BOARD/actions/workflows/gateway.yml/dispatches";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${context.env.GH_PAT}`,
        "User-Agent": "GitHubPagesFunction"
      },
      body: JSON.stringify({
        event_type: "azure-devops-event",
        client_payload: { body: rawBody }
      })
    });

    const result = await response.text();

    return new Response(result, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
