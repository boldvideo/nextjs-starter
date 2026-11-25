import Link from "next/link";
import { talks, getAvailable } from "@/lib/goatmire";

export const revalidate = 60;

export default async function Threshold() {
  const [on25, on26] = await Promise.all([getAvailable(2025), getAvailable(2026)]);
  const n25 = talks(2025).filter((t) => on25[t.slug]).length;
  const total26 = talks(2026).length;
  const n26 = talks(2026).filter((t) => on26[t.slug]).length;

  return (
    <main className="th">
      <Link href="/2025" className="half h25" aria-label="Goatmire Elixir 2025">
        <span className="bg curtain" />
        <span className="bg spot" />
        <span className="bg neon" />
        <span className="inner">
          <span className="date">10–12 September 2025</span>
          <img src="/goatmire/logo25.png" alt="Goatmire Elixir" className="logo" />
          <span className="sub">Goatmire Elixir &amp; NervesConf EU<br />{n25} talks</span>
        </span>
      </Link>
      <span className="seam" aria-hidden />
      <Link href="/2026" className="half h26" aria-label="Goatmire 2026">
        <span className="bg teal" />
        <span className="bg fire" />
        <span className="inner">
          <span className="date">September 28th to October 3rd, 2026</span>
          <img src="/goatmire/logo26.svg" alt="Goatmire" className="logo" />
          <img src="/goatmire/runes26.svg" alt="ᛁᛚᛁᚴᛋᛁᛦ" className="runes" />
          <span className="sub">NervesConf EU &amp; Goatmire Elixir<br />{n26 === 0 || n26 === total26 ? `${total26} talks` : `${n26} of ${total26} talks`}</span>
        </span>
      </Link>
      <p className="top">Varbergs Teater, Varberg, Sweden</p>
    </main>
  );
}
