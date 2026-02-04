export const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'youtube.com',
  'pinterest.com',
];

interface SiteDisplayInfo {
  name: string;
  icon: string;
}

const siteNameMap: Record<string, SiteDisplayInfo> = {
  'facebook.com': { name: 'Facebook', icon: '📘' },
  'twitter.com': { name: 'Twitter / X', icon: '🐦' },
  'x.com': { name: 'Twitter / X', icon: '🐦' },
  'instagram.com': { name: 'Instagram', icon: '📷' },
  'tiktok.com': { name: 'TikTok', icon: '🎵' },
  'reddit.com': { name: 'Reddit', icon: '🤖' },
  'youtube.com': { name: 'YouTube', icon: '▶️' },
  'snapchat.com': { name: 'Snapchat', icon: '👻' },
  'linkedin.com': { name: 'LinkedIn', icon: '💼' },
  'pinterest.com': { name: 'Pinterest', icon: '📌' },
  'tumblr.com': { name: 'Tumblr', icon: '📝' },
  'discord.com': { name: 'Discord', icon: '💬' },
};

export function getDisplayName(domain: string): SiteDisplayInfo {
  const info = siteNameMap[domain];
  if (info) {
    return info;
  }

  // Default: use domain name with first letter capitalized
  const name = domain.split('.')[0];
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    icon: '🌐',
  };
}

export function getDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
