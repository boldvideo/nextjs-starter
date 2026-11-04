// Smart Bear Live episode index. Copy comes from the episode descriptions on
// youtube.com/@asmartbear. `crux` is Jason's own line, verbatim from the
// episode intro (E01/E11: from his episode description). `videoId` is the Bold
// video slug in bt_asmartbear.

export interface Episode {
  number: string;
  founder: string;
  company: string;
  cohost?: string;
  crux: string;
  videoId: string;
}

export const episodes: Episode[] = [
  {
    number: "E12",
    founder: "Jack Friks",
    company: "Post Bridge",
    cohost: "Tibo Louis-Lucas",
    crux: "Almost every dollar he adds gets eaten by a dollar walking out the door.",
    videoId: "",
  },
  {
    number: "E11",
    founder: "Jane Portman & Benedikt Deicke",
    company: "Userlist",
    cohost: "Mariya Delano",
    crux: "About half of Userlist’s paying customers never fully set up the email automation they paid for.",
    videoId: "",
  },
  {
    number: "E10",
    founder: "Brett Lindenberg",
    company: "Mindstamp",
    cohost: "Jessica Malnik",
    crux: "He sees two completely opposite ways of restarting growth. And who knows, maybe the best way is neither one of those.",
    videoId: "",
  },
  {
    number: "E09",
    founder: "Mario Peshev",
    company: "DevriX",
    cohost: "Jon Sturgeon",
    crux: "A lot of people say they want to do that. He actually cracked it.",
    videoId: "",
  },
  {
    number: "E08",
    founder: "Rison Simon",
    company: "PainPointy",
    crux: "He sold his last startup the same week he launched it. But his current startup is stuck with basically no customers at all.",
    videoId: "",
  },
  {
    number: "E07",
    founder: "George Paladichuk",
    company: "NaiL",
    cohost: "Dan Martell",
    crux: "Almost all that revenue comes from a single customer, big customer.",
    videoId: "",
  },
  {
    number: "E06",
    founder: "Carl Alexander",
    company: "Ymir",
    cohost: "Bryce Adams",
    crux: "Customers love it. … But nobody else wants it.",
    videoId: "",
  },
  {
    number: "E05",
    founder: "Hasan Cagli",
    company: "PostPlanify",
    cohost: "Laura Roeder",
    crux: "The customers who love the product and never leave are agencies, and he’s having trouble landing more of them.",
    videoId: "",
  },
  {
    number: "E04",
    founder: "Patrik Inzinger",
    company: "appointmed",
    cohost: "Dr. Sherry Walling",
    crux: "The mission is complete. … So what is it all for?",
    videoId: "",
  },
  {
    number: "E03",
    founder: "Tiago Ferreira & João Amaro",
    company: "Podsqueeze",
    cohost: "Craig Hewitt",
    crux: "Turned down an acquisition offer last year. That’s a pretty strong move. I like that. But … growth has already plateaued.",
    videoId: "",
  },
  {
    number: "E02",
    founder: "Jesse Schoberg",
    company: "DropInBlog",
    cohost: "Rob Walling",
    crux: "A flat growth curve and a potential new juicy market segment, but he’s not quite sure how to go to there.",
    videoId: "",
  },
  {
    number: "E01",
    founder: "Dmytro Krasun",
    company: "ScreenshotOne",
    crux: "He opened his entire dashboard and let me poke at all of it.",
    videoId: "",
  },
];

export const chapters: { number: string; title: string; promise: string }[] = [
  { number: "1", title: "The Profit Whale’s Tail", promise: "Double profits by reshaping just 1% of your customer relationships." },
  { number: "2", title: "Carol Loves You For You", promise: "Win your target market by embracing your strengths and weaknesses." },
  { number: "3", title: "Speaking Carol Into Existence", promise: "Pinpoint the customers who are excited to buy today and stay for years." },
  { number: "4", title: "A Rose By Any Other Name", promise: "Products don’t sell themselves; your words do." },
  { number: "5", title: "Price Is Just a Number", promise: "Double profits from small pricing changes." },
  { number: "6", title: "Price Is Not Just a Number", promise: "Earn customers who want you to raise prices." },
  { number: "7", title: "And After All That, They Left", promise: "Outrun the churn that is quietly capping your growth." },
  { number: "8", title: "Splitting the Surplus", promise: "Accelerate growth from the customers you already have." },
  { number: "9", title: "Your False-Positives Factory", promise: "Design winning ideas using principled experiments, not guesswork." },
  { number: "10", title: "A Multiplier of One’s Own", promise: "Unearth your company’s unique multipliers." },
  { number: "11", title: "To Thine Own Self Be True", promise: "Win at life by playing games you are built to win, flaws and all." },
];

export const blurbs: { quote: string; name: string; role: string }[] = [
  {
    quote: "This is the book that founders need. The chapters on pricing and churn alone are worth the price of the book. Read it with a pen.",
    name: "Lenny Rachitsky",
    role: "Lenny’s Newsletter & Podcast",
  },
  {
    quote: "Jason’s advice on growth was key to scaling Kit past $50M in ARR. I’m glad he finally put it in a book you can read.",
    name: "Nathan Barry",
    role: "Founder, Kit",
  },
  {
    quote: "I’m angry. Angry that Jason’s written such an astonishingly useful book just eight short years after I desperately needed it.",
    name: "Rand Fishkin",
    role: "Cofounder, SparkToro",
  },
];

export const BOOK_URL = "https://hiddenmultipliers.com";
export const SHOW_URL = "https://smartbearlive.com";
export const LONGFORM_URL = "https://longform.asmartbear.com";
export const SKILLS_URL = "https://skills.asmartbear.com";
