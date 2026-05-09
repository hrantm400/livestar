/**
 * Hand-curated seed list of ~170 globally famous people across categories.
 * Resolves each via Wikipedia REST `summary` endpoint to fetch the canonical
 * Wikipedia title + Wikidata QID, then writes data/celebrities.json.
 *
 * Free, no API keys, no SPARQL — only the Wikipedia REST layer
 * (which has been rock-solid throughout our testing).
 *
 * Run with:  node scripts/seed-from-wikipedia.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const OUT = `${ROOT}/data/celebrities.json`;
const UA = "stellar-seed/0.1 (https://stellar.local) contact@stellar.local";

/**
 * [name, category, ...optional [sportsdbName]]
 * `name` is the display name AND the Wikipedia search seed.
 * If a name resolves to a disambiguation page or fails, we skip it.
 */
const SEED = [
  // ── MUSIC (60) ────────────────────────────────────────────────
  ["Taylor Swift", "music"],
  ["Beyoncé", "music"],
  ["Rihanna", "music"],
  ["Drake (musician)", "music"],
  ["Ariana Grande", "music"],
  ["The Weeknd", "music"],
  ["Ed Sheeran", "music"],
  ["Justin Bieber", "music"],
  ["Eminem", "music"],
  ["Kanye West", "music"],
  ["Bruno Mars", "music"],
  ["Adele", "music"],
  ["Lady Gaga", "music"],
  ["Madonna", "music"],
  ["Britney Spears", "music"],
  ["Katy Perry", "music"],
  ["Shakira", "music"],
  ["Selena Gomez", "music"],
  ["Harry Styles", "music"],
  ["Billie Eilish", "music"],
  ["Travis Scott", "music"],
  ["Post Malone", "music"],
  ["Bad Bunny", "music"],
  ["Cardi B", "music"],
  ["Nicki Minaj", "music"],
  ["Snoop Dogg", "music"],
  ["Jay-Z", "music"],
  ["Pharrell Williams", "music"],
  ["John Legend", "music"],
  ["Sam Smith", "music"],
  ["Sia", "music"],
  ["Dua Lipa", "music"],
  ["Olivia Rodrigo", "music"],
  ["Doja Cat", "music"],
  ["Kendrick Lamar", "music"],
  ["J. Cole", "music"],
  ["Lil Wayne", "music"],
  ["50 Cent", "music"],
  ["Childish Gambino", "music"],
  ["Frank Ocean", "music"],
  ["Tyler, the Creator", "music"],
  ["Lana Del Rey", "music"],
  ["Mariah Carey", "music"],
  ["Whitney Houston", "music"],
  ["Michael Jackson", "music"],
  ["Prince (musician)", "music"],
  ["David Bowie", "music"],
  ["Freddie Mercury", "music"],
  ["Elton John", "music"],
  ["Paul McCartney", "music"],
  ["Bob Dylan", "music"],
  ["Stevie Wonder", "music"],
  ["Bruce Springsteen", "music"],
  ["Mick Jagger", "music"],
  ["J Balvin", "music"],
  ["Karol G", "music"],
  ["Anitta (singer)", "music"],
  ["Maluma", "music"],
  ["Enrique Iglesias", "music"],
  ["Ricky Martin", "music"],
  ["Jungkook", "music"],
  ["V (singer)", "music"],
  ["IU (singer)", "music"],
  ["Lisa (rapper)", "music"],
  ["Jennie (singer)", "music"],
  ["Morgan Wallen", "music"],
  ["Carrie Underwood", "music"],
  ["Dolly Parton", "music"],

  // ── FILM & TV (55) ────────────────────────────────────────────
  ["Zendaya", "film"],
  ["Timothée Chalamet", "film"],
  ["Tom Cruise", "film"],
  ["Brad Pitt", "film"],
  ["Leonardo DiCaprio", "film"],
  ["Robert Downey Jr.", "film"],
  ["Scarlett Johansson", "film"],
  ["Chris Hemsworth", "film"],
  ["Chris Evans (actor)", "film"],
  ["Chris Pratt", "film"],
  ["Margot Robbie", "film"],
  ["Ryan Gosling", "film"],
  ["Ryan Reynolds", "film"],
  ["Dwayne Johnson", "film"],
  ["Will Smith", "film"],
  ["Denzel Washington", "film"],
  ["Tom Hanks", "film"],
  ["Meryl Streep", "film"],
  ["Jennifer Lawrence", "film"],
  ["Emma Stone", "film"],
  ["Emma Watson", "film"],
  ["Daniel Radcliffe", "film"],
  ["Robert Pattinson", "film"],
  ["Anne Hathaway", "film"],
  ["Sandra Bullock", "film"],
  ["Julia Roberts", "film"],
  ["Nicole Kidman", "film"],
  ["Charlize Theron", "film"],
  ["Angelina Jolie", "film"],
  ["Jennifer Aniston", "film"],
  ["Reese Witherspoon", "film"],
  ["Cate Blanchett", "film"],
  ["Florence Pugh", "film"],
  ["Sydney Sweeney", "film"],
  ["Anya Taylor-Joy", "film"],
  ["Jacob Elordi", "film"],
  ["Pedro Pascal", "film"],
  ["Bryan Cranston", "film"],
  ["Aaron Paul", "film"],
  ["Cillian Murphy", "film"],
  ["Hugh Jackman", "film"],
  ["Christian Bale", "film"],
  ["Joaquin Phoenix", "film"],
  ["Heath Ledger", "film"],
  ["Keanu Reeves", "film"],
  ["Johnny Depp", "film"],
  ["Morgan Freeman", "film"],
  ["Samuel L. Jackson", "film"],
  ["Christopher Nolan", "film"],
  ["Steven Spielberg", "film"],
  ["Quentin Tarantino", "film"],
  ["Martin Scorsese", "film"],
  ["Greta Gerwig", "film"],
  ["Jordan Peele", "film"],
  ["Denis Villeneuve", "film"],

  // ── SPORTS (40) ──────────────────────────────────────────────
  ["Lionel Messi", "sports", "Lionel Messi"],
  ["Cristiano Ronaldo", "sports", "Cristiano Ronaldo"],
  ["LeBron James", "sports", "LeBron James"],
  ["Kylian Mbappé", "sports", "Kylian Mbappé"],
  ["Neymar", "sports", "Neymar"],
  ["Erling Haaland", "sports", "Erling Haaland"],
  ["Mohamed Salah", "sports", "Mohamed Salah"],
  ["Kevin De Bruyne", "sports", "Kevin De Bruyne"],
  ["Robert Lewandowski", "sports", "Robert Lewandowski"],
  ["Karim Benzema", "sports", "Karim Benzema"],
  ["Vinícius Júnior", "sports", "Vinícius Júnior"],
  ["Jude Bellingham", "sports", "Jude Bellingham"],
  ["Bukayo Saka", "sports", "Bukayo Saka"],
  ["Stephen Curry", "sports", "Stephen Curry"],
  ["Kevin Durant", "sports", "Kevin Durant"],
  ["Giannis Antetokounmpo", "sports", "Giannis Antetokounmpo"],
  ["Luka Dončić", "sports", "Luka Dončić"],
  ["Nikola Jokić", "sports", "Nikola Jokić"],
  ["Jayson Tatum", "sports", "Jayson Tatum"],
  ["Joel Embiid", "sports", "Joel Embiid"],
  ["Kawhi Leonard", "sports", "Kawhi Leonard"],
  ["Kyrie Irving", "sports", "Kyrie Irving"],
  ["Patrick Mahomes", "sports", "Patrick Mahomes"],
  ["Tom Brady", "sports", "Tom Brady"],
  ["Travis Kelce", "sports", "Travis Kelce"],
  ["Aaron Rodgers", "sports", "Aaron Rodgers"],
  ["Serena Williams", "sports", "Serena Williams"],
  ["Roger Federer", "sports", "Roger Federer"],
  ["Rafael Nadal", "sports", "Rafael Nadal"],
  ["Novak Djokovic", "sports", "Novak Djokovic"],
  ["Carlos Alcaraz", "sports", "Carlos Alcaraz"],
  ["Iga Świątek", "sports", "Iga Świątek"],
  ["Coco Gauff", "sports", "Coco Gauff"],
  ["Tiger Woods", "sports", "Tiger Woods"],
  ["Lewis Hamilton", "sports", "Lewis Hamilton"],
  ["Max Verstappen", "sports", "Max Verstappen"],
  ["Charles Leclerc", "sports", "Charles Leclerc"],
  ["Lando Norris", "sports", "Lando Norris"],
  ["Connor McDavid", "sports", "Connor McDavid"],
  ["Shohei Ohtani", "sports", "Shohei Ohtani"],

  // ── BUSINESS (15) ────────────────────────────────────────────
  ["Elon Musk", "business"],
  ["Jeff Bezos", "business"],
  ["Bill Gates", "business"],
  ["Mark Zuckerberg", "business"],
  ["Warren Buffett", "business"],
  ["Larry Page", "business"],
  ["Sergey Brin", "business"],
  ["Tim Cook", "business"],
  ["Sundar Pichai", "business"],
  ["Satya Nadella", "business"],
  ["Sam Altman", "business"],
  ["Jensen Huang", "business"],
  ["Bernard Arnault", "business"],
  ["Oprah Winfrey", "business"],
  ["Richard Branson", "business"],

  // ── FASHION (15) ─────────────────────────────────────────────
  ["Gigi Hadid", "fashion"],
  ["Bella Hadid", "fashion"],
  ["Kendall Jenner", "fashion"],
  ["Kylie Jenner", "fashion"],
  ["Kim Kardashian", "fashion"],
  ["Cara Delevingne", "fashion"],
  ["Naomi Campbell", "fashion"],
  ["Karlie Kloss", "fashion"],
  ["Adut Akech", "fashion"],
  ["Anna Wintour", "fashion"],
  ["Donatella Versace", "fashion"],
  ["Virgil Abloh", "fashion"],
  ["Rick Owens", "fashion"],
  ["Pharrell Williams (designer)", "fashion"],
  ["Hailey Bieber", "fashion"],

  // ╔══════════════════════════════════════════════════════════╗
  // ║  PHASE 2 — GLOBAL EXPANSION                              ║
  // ║  Filling the geographic gaps: Russia/CIS, India, China,  ║
  // ║  Korea, Japan, Africa, Middle East, Latin America, EU.   ║
  // ╚══════════════════════════════════════════════════════════╝

  // ── RUSSIAN / CIS music & entertainment ──────────────────────
  ["Alla Pugacheva", "music"],
  ["Philipp Kirkorov", "music"],
  ["Polina Gagarina", "music"],
  ["Dima Bilan", "music"],
  ["Zemfira", "music"],
  ["Sergey Lazarev", "music"],
  ["Egor Kreed", "music"],
  ["Morgenshtern", "music"],
  ["Timati", "music"],
  ["Olga Buzova", "music"],
  ["Valery Meladze", "music"],
  ["Nikolay Baskov", "music"],
  ["Denis Matsuev", "music"],
  ["Valery Gergiev", "music"],

  // ── RUSSIAN / CIS cinema ─────────────────────────────────────
  ["Andrey Zvyagintsev", "film"],
  ["Nikita Mikhalkov", "film"],
  ["Andrei Tarkovsky", "film"],
  ["Sergei Eisenstein", "film"],
  ["Sergei Bodrov Jr.", "film"],

  // ── RUSSIAN / CIS sports ─────────────────────────────────────
  ["Alexander Ovechkin", "sports", "Alexander Ovechkin"],
  ["Evgeni Malkin", "sports", "Evgeni Malkin"],
  ["Artemi Panarin", "sports", "Artemi Panarin"],
  ["Maria Sharapova", "sports", "Maria Sharapova"],
  ["Yelena Isinbayeva", "sports"],
  ["Evgeni Plushenko", "sports"],
  ["Kamila Valieva", "sports"],
  ["Garry Kasparov", "sports"],
  ["Magnus Carlsen", "sports"],

  // ── BOLLYWOOD cinema ─────────────────────────────────────────
  ["Shah Rukh Khan", "film"],
  ["Aamir Khan", "film"],
  ["Salman Khan", "film"],
  ["Amitabh Bachchan", "film"],
  ["Aishwarya Rai", "film"],
  ["Priyanka Chopra", "film"],
  ["Deepika Padukone", "film"],
  ["Hrithik Roshan", "film"],
  ["Alia Bhatt", "film"],
  ["Ranveer Singh", "film"],
  ["Kareena Kapoor", "film"],
  ["Katrina Kaif", "film"],
  ["Akshay Kumar", "film"],
  ["Saif Ali Khan", "film"],
  ["Ajay Devgn", "film"],
  ["Madhuri Dixit", "film"],
  ["Anushka Sharma", "film"],

  // ── INDIAN music ─────────────────────────────────────────────
  ["A. R. Rahman", "music"],
  ["Lata Mangeshkar", "music"],
  ["Arijit Singh", "music"],
  ["Diljit Dosanjh", "music"],
  ["Honey Singh", "music"],

  // ── INDIAN sports ────────────────────────────────────────────
  ["Sachin Tendulkar", "sports", "Sachin Tendulkar"],
  ["Virat Kohli", "sports", "Virat Kohli"],
  ["M. S. Dhoni", "sports", "MS Dhoni"],
  ["Rohit Sharma", "sports", "Rohit Sharma"],
  ["P. V. Sindhu", "sports", "PV Sindhu"],
  ["Saina Nehwal", "sports", "Saina Nehwal"],
  ["Neeraj Chopra", "sports"],

  // ── K-POP & Korean entertainment ─────────────────────────────
  ["RM (rapper)", "music"],
  ["Jin (singer)", "music"],
  ["Suga (rapper)", "music"],
  ["J-Hope", "music"],
  ["Jimin", "music"],
  ["Jisoo", "music"],
  ["Rosé (singer)", "music"],
  ["G-Dragon", "music"],
  ["Psy", "music"],
  ["Rain (entertainer)", "music"],
  ["Bong Joon-ho", "film"],
  ["Park Chan-wook", "film"],
  ["Ma Dong-seok", "film"],
  ["Lee Min-ho", "film"],
  ["Song Kang-ho", "film"],
  ["Park Seo-joon", "film"],

  // ── CHINESE cinema & music ───────────────────────────────────
  ["Jackie Chan", "film"],
  ["Bruce Lee", "film"],
  ["Jet Li", "film"],
  ["Donnie Yen", "film"],
  ["Zhang Ziyi", "film"],
  ["Fan Bingbing", "film"],
  ["Andy Lau", "film"],
  ["Tony Leung Chiu-wai", "film"],
  ["Maggie Cheung", "film"],
  ["Chow Yun-fat", "film"],
  ["John Woo", "film"],
  ["Ang Lee", "film"],
  ["Zhang Yimou", "film"],
  ["Wong Kar-wai", "film"],
  ["Jay Chou", "music"],
  ["Lay Zhang", "music"],
  ["Kris Wu", "music"],

  // ── JAPANESE cinema, anime, music ────────────────────────────
  ["Hayao Miyazaki", "film"],
  ["Akira Kurosawa", "film"],
  ["Toshiro Mifune", "film"],
  ["Ken Watanabe", "film"],
  ["Hirokazu Kore-eda", "film"],
  ["Takeshi Kitano", "film"],
  ["Hideo Kojima", "business"],
  ["Yuzuru Hanyu", "sports"],
  ["Naomi Osaka", "sports", "Naomi Osaka"],
  ["Hideki Matsuyama", "sports"],
  ["Yoshiki", "music"],

  // ── LATIN American music expansion ───────────────────────────
  ["Daddy Yankee", "music"],
  ["Ozuna", "music"],
  ["Becky G", "music"],
  ["Rosalía", "music"],
  ["Rauw Alejandro", "music"],
  ["Luis Miguel", "music"],
  ["Marc Anthony", "music"],
  ["Romeo Santos", "music"],
  ["Pitbull (rapper)", "music"],
  ["Daddy Yankee", "music"],
  ["Don Omar", "music"],
  ["Anuel AA", "music"],
  ["Manu Chao", "music"],

  // ── LATIN American cinema ────────────────────────────────────
  ["Salma Hayek", "film"],
  ["Sofía Vergara", "film"],
  ["Jennifer Lopez", "film"],
  ["Pedro Almodóvar", "film"],
  ["Penélope Cruz", "film"],
  ["Antonio Banderas", "film"],
  ["Gael García Bernal", "film"],
  ["Diego Luna", "film"],
  ["Alfonso Cuarón", "film"],
  ["Guillermo del Toro", "film"],
  ["Alejandro González Iñárritu", "film"],

  // ── AFRICAN music ────────────────────────────────────────────
  ["Wizkid", "music"],
  ["Davido", "music"],
  ["Burna Boy", "music"],
  ["Tyla", "music"],
  ["Tems", "music"],
  ["Tiwa Savage", "music"],
  ["Rema (singer)", "music"],
  ["Black Coffee (DJ)", "music"],
  ["Asake", "music"],

  // ── AFRICAN sports ───────────────────────────────────────────
  ["Sadio Mané", "sports", "Sadio Mane"],
  ["Riyad Mahrez", "sports", "Riyad Mahrez"],
  ["Pierre-Emerick Aubameyang", "sports", "Pierre-Emerick Aubameyang"],
  ["Achraf Hakimi", "sports", "Achraf Hakimi"],
  ["Didier Drogba", "sports", "Didier Drogba"],
  ["Samuel Eto'o", "sports", "Samuel Eto'o"],

  // ── MIDDLE EASTERN music ─────────────────────────────────────
  ["Amr Diab", "music"],
  ["Tamer Hosny", "music"],
  ["Nancy Ajram", "music"],
  ["Elissa (Lebanese singer)", "music"],
  ["Mohammed Assaf", "music"],
  ["Fairuz", "music"],

  // ── EUROPEAN cinema ──────────────────────────────────────────
  ["Léa Seydoux", "film"],
  ["Marion Cotillard", "film"],
  ["Vincent Cassel", "film"],
  ["Jean Reno", "film"],
  ["Audrey Tautou", "film"],
  ["Sophie Marceau", "film"],
  ["Juliette Binoche", "film"],
  ["Isabelle Huppert", "film"],
  ["Monica Bellucci", "film"],
  ["Mads Mikkelsen", "film"],
  ["Alicia Vikander", "film"],
  ["Alexander Skarsgård", "film"],
  ["Stellan Skarsgård", "film"],
  ["Bill Skarsgård", "film"],

  // ── ROCK & POP LEGENDS ───────────────────────────────────────
  ["Sting (musician)", "music"],
  ["Phil Collins", "music"],
  ["Roger Waters", "music"],
  ["David Gilmour", "music"],
  ["Bono", "music"],
  ["Keith Richards", "music"],
  ["Robert Plant", "music"],
  ["Jimmy Page", "music"],
  ["Slash (musician)", "music"],
  ["Stevie Nicks", "music"],
  ["Cher", "music"],
  ["Tina Turner", "music"],
  ["Andrea Bocelli", "music"],
  ["Eros Ramazzotti", "music"],

  // ── SPORTS LEGENDS / EXTRAS ──────────────────────────────────
  ["Diego Maradona", "sports", "Diego Maradona"],
  ["Pelé", "sports", "Pele"],
  ["Zinedine Zidane", "sports", "Zinedine Zidane"],
  ["David Beckham", "sports", "David Beckham"],
  ["Wayne Rooney", "sports", "Wayne Rooney"],
  ["Sergio Ramos", "sports", "Sergio Ramos"],
  ["Andrés Iniesta", "sports", "Andres Iniesta"],
  ["Xavi", "sports", "Xavi"],
  ["Luis Suárez", "sports", "Luis Suarez"],
  ["Mike Tyson", "sports", "Mike Tyson"],
  ["Floyd Mayweather Jr.", "sports", "Floyd Mayweather Jr"],
  ["Manny Pacquiao", "sports", "Manny Pacquiao"],
  ["Conor McGregor", "sports", "Conor McGregor"],
  ["Khabib Nurmagomedov", "sports", "Khabib Nurmagomedov"],
  ["Usain Bolt", "sports", "Usain Bolt"],
  ["Sebastian Vettel", "sports", "Sebastian Vettel"],
  ["Fernando Alonso", "sports", "Fernando Alonso"],

  // ── BUSINESS / TECH expansion ────────────────────────────────
  ["Larry Ellison", "business"],
  ["Michael Bloomberg", "business"],
  ["Carlos Slim", "business"],
  ["Mukesh Ambani", "business"],
  ["Gautam Adani", "business"],
  ["Ratan Tata", "business"],
  ["Jack Ma", "business"],
  ["Pony Ma", "business"],
  ["Masayoshi Son", "business"],
  ["Reed Hastings", "business"],
  ["Brian Chesky", "business"],
  ["Daniel Ek", "business"],

  // ── FASHION expansion ────────────────────────────────────────
  ["Karl Lagerfeld", "fashion"],
  ["Giorgio Armani", "fashion"],
  ["Tom Ford", "fashion"],
  ["Stella McCartney", "fashion"],
  ["Vera Wang", "fashion"],
  ["Marc Jacobs", "fashion"],
  ["Christian Louboutin", "fashion"],
  ["Adriana Lima", "fashion"],
  ["Heidi Klum", "fashion"],
  ["Tyra Banks", "fashion"],
  ["Linda Evangelista", "fashion"],
  ["Cindy Crawford", "fashion"],
  ["Claudia Schiffer", "fashion"],
  ["Christy Turlington", "fashion"],
  ["Kate Moss", "fashion"],
  ["Miranda Kerr", "fashion"],
  ["Alessandra Ambrosio", "fashion"],
  ["Doutzen Kroes", "fashion"],
];

function initials(name) {
  // strip parenthetical disambiguators
  const cleaned = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function slug(qid, name) {
  if (qid) return qid.toLowerCase();
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchSummary(name) {
  const slug = name.replace(/ /g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}?redirect=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  if (!existsSync(`${ROOT}/data`)) mkdirSync(`${ROOT}/data`, { recursive: true });
  const out = [];
  const seen = new Set();
  let resolved = 0,
    skipped = 0;

  for (let i = 0; i < SEED.length; i++) {
    const [name, category, sportsdb] = SEED[i];
    process.stdout.write(`[${(i + 1).toString().padStart(3)}/${SEED.length}] ${name.padEnd(34)} `);
    try {
      const data = await fetchSummary(name);
      if (!data || data.type === "disambiguation" || !data.extract) {
        console.log("skip");
        skipped++;
        continue;
      }
      const qid = data.wikibase_item || "";
      if (qid && seen.has(qid)) {
        console.log("dup");
        continue;
      }
      if (qid) seen.add(qid);

      const wiki =
        data.titles?.canonical ||
        (data.title || name).replace(/ /g, "_");
      const displayName = data.title || name.replace(/\s*\([^)]*\)\s*$/, "");

      out.push({
        id: slug(qid, displayName),
        qid,
        name: displayName,
        wiki,
        category,
        initials: initials(displayName),
        rank: 100 - Math.floor(i / 4), // rough rank — preserves seed order roughly
        searchQuery: displayName,
        ...(sportsdb ? { sportsdb } : {}),
      });
      resolved++;
      console.log(`ok   ${qid.padEnd(10)} ${displayName}`);
    } catch (err) {
      console.log(`err  ${err.message}`);
      skipped++;
    }
    await new Promise((r) => setTimeout(r, 60));
  }

  // sort by rank descending
  out.sort((a, b) => b.rank - a.rank);

  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n→ resolved ${resolved} · skipped ${skipped}`);
  console.log(`→ wrote ${out.length} entries to ${OUT}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
