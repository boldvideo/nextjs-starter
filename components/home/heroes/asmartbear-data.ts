// Smart Bear Live episode index. Copy comes from the episode descriptions on
// youtube.com/@asmartbear; `videoId` is the Bold video id in bt_asmartbear.

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
    crux: "20% of customers leave every month. Who should he build for?",
    videoId: "",
  },
  {
    number: "E11",
    founder: "Jane Portman & Benedikt Deicke",
    company: "Userlist",
    cohost: "Mariya Delano",
    crux: "Half the paying customers never finish setup. Charge for onboarding?",
    videoId: "",
  },
  {
    number: "E10",
    founder: "Brett Lindenberg",
    company: "Mindstamp",
    cohost: "Jessica Malnik",
    crux: "Six figures of profit, flat growth. Niche down or stay general?",
    videoId: "",
  },
  {
    number: "E09",
    founder: "Mario Peshev",
    company: "DevriX",
    cohost: "Jon Sturgeon",
    crux: "AI cut the agency from 60 to 30 people. Grow it, or sell it?",
    videoId: "",
  },
  {
    number: "E08",
    founder: "Rison Simon",
    company: "PainPointy",
    crux: "Never more than six customers. What do you ask in the interviews?",
    videoId: "",
  },
  {
    number: "E07",
    founder: "George Paladichuk",
    company: "NaiL",
    cohost: "Dan Martell",
    crux: "90% of revenue from one client. How do you get the next 100?",
    videoId: "",
  },
  {
    number: "E06",
    founder: "Carl Alexander",
    company: "Ymir",
    cohost: "Bryce Adams",
    crux: "Customers never leave, nobody new signs up, and everyone pays $39.",
    videoId: "",
  },
  {
    number: "E05",
    founder: "Hasan Cagli",
    company: "PostPlanify",
    cohost: "Laura Roeder",
    crux: "Agencies stay, everyone else churns. Scared to commit to them.",
    videoId: "",
  },
  {
    number: "E04",
    founder: "Patrik Inzinger",
    company: "appointmed",
    cohost: "Dr. Sherry Walling",
    crux: "€2M ARR, 1% churn, calm and profitable. Why doesn't it feel like enough?",
    videoId: "",
  },
  {
    number: "E03",
    founder: "Tiago Ferreira & João Amaro",
    company: "Podsqueeze",
    cohost: "Craig Hewitt",
    crux: "Flat at €16K a month for two years. The 5x price test.",
    videoId: "",
  },
  {
    number: "E02",
    founder: "Jesse Schoberg",
    company: "DropInBlog",
    cohost: "Rob Walling",
    crux: "$1M ARR, big companies visiting, nothing to sell them.",
    videoId: "",
  },
  {
    number: "E01",
    founder: "Dmytro Krasun",
    company: "ScreenshotOne",
    crux: "$32K MRR, 9% churn, and a ceiling around $40K. Push, pivot, or sell?",
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
