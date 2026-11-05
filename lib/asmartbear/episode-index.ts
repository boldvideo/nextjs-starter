// Snapshot of the Sanity episodes (number -> slug, company, faces) so chat
// answers can turn "E10" mentions into links and cards without a fetch.
// Regenerate from Sanity when an episode is added.

export interface EpisodeRef {
  slug: string;
  youtubeId?: string | null;
  company: string;
  founders: string[];
  cohosts: string[];
  faces: string[];
}

export const EPISODE_INDEX: Record<string, EpisodeRef> = {
  "E01": {
    "slug": "e01-using-transparent-metrics-to-restart-growth-when-stuck-at-32k-mrr",
    "youtubeId": "hYBi2OAakNo",
    "company": "ScreenshotOne",
    "founders": [
      "Dmytro Krasun"
    ],
    "cohosts": [],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/37a52e17489bc8de963dd0206122a1c25fef7f6b-400x400.jpg"
    ]
  },
  "E02": {
    "slug": "e02-w-rob-walling-1m-arr-how-to-expand-into-a-new-market",
    "youtubeId": "o3oN1g8xpXY",
    "company": "DropInBlog",
    "founders": [
      "Jesse Schoberg"
    ],
    "cohosts": [
      "Rob Walling"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/0cd9521b967eb36a6b1331531c92b770b8822726-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/492802efbcf477de828dabaf69581e6781455762-400x400.jpg"
    ]
  },
  "E03": {
    "slug": "e03-w-craig-hewitt-restarting-growth-after-stuck-at-16kmo",
    "youtubeId": "4ZSfcD94DQw",
    "company": "Podsqueeze",
    "founders": [
      "Tiago Ferreira",
      "Jo\u00e3o Amaro"
    ],
    "cohosts": [
      "Craig Hewitt"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/03ce7f81350940ae4ea59417b00ce11ddb813587-317x317.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/5657335de69716fb63d44c53d02d5925295e7c3e-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/1a117c772a3430eafda239a5ca7bf8961523249c-400x400.jpg"
    ]
  },
  "E04": {
    "slug": "e04-w-dr-sherry-walling-he-built-a-great-business-but-it-doesnt-feel-like-it",
    "youtubeId": "WeqBHrKrCEI",
    "company": "appointmed",
    "founders": [
      "Patrik Inzinger"
    ],
    "cohosts": [
      "Dr. Sherry Walling"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/cc209ffc4bd00d9e4fab9179d68bce7cf7b91592-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/d0e5202f295475c33f3a61ef6280d202bb01e33b-316x316.jpg"
    ]
  },
  "E05": {
    "slug": "e05-w-laura-roeder-scared-to-commit-to-his-best-customers",
    "youtubeId": "Jg7QyAzT76Y",
    "company": "PostPlanify",
    "founders": [
      "Hasan Cagli"
    ],
    "cohosts": [
      "Laura Roeder"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/2d17cb81374a8cd85aba373c3171756af1e37eab-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/7176d3bfc16d338a790026fc99a28611462d3a42-400x400.jpg"
    ]
  },
  "E06": {
    "slug": "e06-w-bryce-adams-how-to-fix-a-saas-business-thats-not-growing",
    "youtubeId": "CdGcSk6TKqI",
    "company": "Ymir",
    "founders": [
      "Carl Alexander"
    ],
    "cohosts": [
      "Bryce Adams"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/5c698a8998cbb6fe47dd7dd51c7f607864910d8a-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/b8592dd8244b61e0e7c1c804052b0c6b834fe01f-400x400.jpg"
    ]
  },
  "E07": {
    "slug": "e07-w-dan-martell-how-do-you-scale-after-your-first-big-customer",
    "youtubeId": "AlEmh5BmNF0",
    "company": "NaiL",
    "founders": [
      "George Paladichuk"
    ],
    "cohosts": [
      "Dan Martell"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/7659977ea308a93dd2303d80c578639f8d9f7b12-400x400.jpg"
    ]
  },
  "E08": {
    "slug": "e08-creating-customer-interview-questions-before-you-have-customers",
    "youtubeId": "1QFJFCDnWGo",
    "company": "PainPointy",
    "founders": [
      "Rison Simon"
    ],
    "cohosts": [],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/fb2db5c5efdab8e2eaf1dc174cd8d3410404672a-400x400.jpg"
    ]
  },
  "E09": {
    "slug": "e09-w-jon-sturgeon-ai-changed-his-agencys-model-should-he-grow-or-sell",
    "youtubeId": "wKVKpWMNn5c",
    "company": "DevriX",
    "founders": [
      "Mario Peshev"
    ],
    "cohosts": [
      "Jon Sturgeon"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/8d7dc620c6e45b1aa1d54d103120a0270b0049b9-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/d90df37d61e63b92070bc28b0e5113e067a58096-400x400.jpg"
    ]
  },
  "E10": {
    "slug": "e10-w-jessica-malnik-how-to-find-customers-who-actually-need-your-saas",
    "youtubeId": "pfflbL_ie2Q",
    "company": "Mindstamp",
    "founders": [
      "Brett Lindenberg"
    ],
    "cohosts": [
      "Jessica Malnik"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/f2427cb584ea90ed58bbec3835ae6d88a206ce1a-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/12c251dbd88e824ac6853f976bf702824185dbe7-240x240.jpg"
    ]
  },
  "E11": {
    "slug": "e11-w-mariya-delano-how-to-fix-a-saas-trial-to-paid-conversion-problem",
    "youtubeId": "7gJvwR78ot8",
    "company": "Userlist",
    "founders": [
      "Jane Portman",
      "Benedikt Deicke"
    ],
    "cohosts": [
      "Mariya Delano"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/c6e8717a595e44d5359bdd177dd3f7cad0cc3dcb-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/d21a0bed7816553d09e7b25867ab0f47cc6884b0-400x400.jpg"
    ]
  },
  "E12": {
    "slug": "e12-wtibo-maker-how-to-find-customers-who-actually-need-your-saas",
    "youtubeId": "uTVyLYDOd1M",
    "company": "Post Bridge",
    "founders": [
      "Jack Friks"
    ],
    "cohosts": [
      "Tibo Louis-Lucas"
    ],
    "faces": [
      "https://cdn.sanity.io/images/je17v8aj/production/91b0a6753f7e7ffd8fdaa013c361ba85ab3a3d8f-400x400.jpg",
      "https://cdn.sanity.io/images/je17v8aj/production/cc046c413370e2f11159fc970848e91a81856482-400x400.jpg"
    ]
  }
};

export const EPISODE_RE = /\bE(0[1-9]|1[0-2])\b/g;

/** Episode numbers mentioned in a text, in first-mention order. */
export function mentionedEpisodes(text: string): string[] {
  const seen: string[] = [];
  const re = new RegExp(EPISODE_RE.source, "g");
  for (let m; (m = re.exec(text)); ) {
    const n = `E${m[1]}`;
    if (EPISODE_INDEX[n] && !seen.includes(n)) seen.push(n);
  }
  return seen;
}
