/** Site-wide settings. Env vars override at build time (see .env.example). */
export const site = {
  name: "Vivian's Docs",
  /** GitHub repo, used for the header button and "Edit this page" links. */
  repoUrl: import.meta.env.PUBLIC_REPO_URL ?? "https://github.com/vivianludrick/docs",
  branch: import.meta.env.PUBLIC_REPO_BRANCH ?? "main",
};
