export const DEFAULT_BLOCKED_SITES = [
  "facebook.com",
  "x.com",
  "instagram.com",
  "tiktok.com",
  "reddit.com",
  "youtube.com",
  "pinterest.com",
];

interface SiteDisplayInfo {
  name: string;
}

const siteNameMap: Record<string, SiteDisplayInfo> = {
  "facebook.com": { name: "Facebook" },
  "twitter.com": { name: "Twitter / X" },
  "x.com": { name: "Twitter / X" },
  "instagram.com": { name: "Instagram" },
  "tiktok.com": { name: "TikTok" },
  "reddit.com": { name: "Reddit" },
  "youtube.com": { name: "YouTube" },
  "snapchat.com": { name: "Snapchat" },
  "linkedin.com": { name: "LinkedIn" },
  "pinterest.com": { name: "Pinterest" },
  "tumblr.com": { name: "Tumblr" },
  "discord.com": { name: "Discord" },
};

export function getDisplayName(domain: string): SiteDisplayInfo {
  const info = siteNameMap[domain];
  if (info) {
    return info;
  }

  // Default: use domain name with first letter capitalized
  const name = domain;
  return {
    name: name,
  };
}

export function getDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
