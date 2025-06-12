import MeiliSearch from "meilisearch";

export const meili = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});
