export async function onRequestPost(context) {
  const request = context.request;

  const body = await request.text();

  const url = "https://api.github.com/repos/JulioQes/POC-LAUREATE-BOARD/actions/workflows/gateway.yml/dispatches";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${context.env.GH_PAT}`,
      "User-Agent": "GitHubPagesFunction"
    },
    body: JSON.stringify({
      event_type: "azure-devops-event",
      client_payload: { body: body }
    })
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
}
