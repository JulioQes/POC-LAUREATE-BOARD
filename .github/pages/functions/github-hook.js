export async function onRequestPost(context) {
  const request = context.request;

  // Read raw body from Azure DevOps (the Work Item payload)
  const body = await request.text();

  // URL to forward to (GitHub workflow_dispatch)
  const url = "https://api.github.com/repos/JulioQes/POC-LAUREATE-BOARD/actions/workflows/gateway.yml/dispatches";

  // Forward the content to GitHub API
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${context.env.GH_PAT}`,
      "User-Agent": "GitHubPagesFunction"
    },
    body: body
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
}
