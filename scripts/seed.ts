/**
 * Seeds the Postgres database with a demo admin account, a theater/screen,
 * a handful of movies, and showtimes over the next few days.
 *
 * Run with: npm run seed
 * Requires DATABASE_URL to be set in .env.local (see .env.example) — the
 * npm script loads it via Node's --env-file-if-exists flag.
 */
import { hashPassword } from "../src/lib/password";
import {
  createMovie,
  createScreen,
  createShowtime,
  createTheater,
  createUser,
  getUserByEmail,
  listMovies,
  listScreens,
  listTheaters,
} from "../src/lib/data";

async function main() {
  // --- Admin account ---
  const adminEmail = "admin@cinema.demo";
  if (!(await getUserByEmail(adminEmail))) {
    const passwordHash = await hashPassword("admin1234");
    await createUser({
      name: "Cinema Admin",
      email: adminEmail,
      passwordHash,
      role: "admin",
    });
    console.log(`Created admin user: ${adminEmail} / admin1234`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // --- Demo customer account ---
  const demoEmail = "demo@cinema.demo";
  if (!(await getUserByEmail(demoEmail))) {
    const passwordHash = await hashPassword("demo1234");
    await createUser({
      name: "Demo Customer",
      email: demoEmail,
      passwordHash,
      role: "customer",
    });
    console.log(`Created demo customer: ${demoEmail} / demo1234`);
  }

  // --- Theater / screens ---
  let theaters = await listTheaters();
  if (theaters.length === 0) {
    await createTheater("Main Street Cinema", "123 Main Street");
    theaters = await listTheaters();
  }
  const theater = theaters[0];

  let screens = await listScreens(theater.id);
  if (screens.length === 0) {
    await createScreen({ theaterId: theater.id, name: "Screen 1", rows: 8, cols: 10 });
    await createScreen({ theaterId: theater.id, name: "Screen 2", rows: 6, cols: 8 });
    screens = await listScreens(theater.id);
  }

  // --- Movies ---
  if ((await listMovies()).length === 0) {
    const movieData = [
      {
        title: "Nebula Drift",
        description:
          "A salvage crew stumbles on a derelict ship carrying a secret that could rewrite the history of the galaxy.",
        posterUrl: "https://picsum.photos/seed/nebula/400/600",
        durationMinutes: 128,
        genre: "Sci-Fi",
        rating: "PG-13",
      },
      {
        title: "The Last Bakery",
        description:
          "In a small coastal town, an aging baker fights to save her family's shop from a corporate takeover.",
        posterUrl: "https://picsum.photos/seed/bakery/400/600",
        durationMinutes: 104,
        genre: "Drama",
        rating: "PG",
      },
      {
        title: "Midnight Run Redux",
        description:
          "A getaway driver takes one last job that spirals into a citywide chase against the clock.",
        posterUrl: "https://picsum.photos/seed/midnight/400/600",
        durationMinutes: 112,
        genre: "Action",
        rating: "R",
      },
      {
        title: "Laugh Track",
        description:
          "A washed-up sitcom writer gets a shot at redemption when a viral clip resurrects his career.",
        posterUrl: "https://picsum.photos/seed/laugh/400/600",
        durationMinutes: 96,
        genre: "Comedy",
        rating: "PG-13",
      },
    ];

    const created = [];
    for (const m of movieData) {
      created.push(await createMovie(m));
    }
    console.log(`Created ${created.length} movies.`);

    // Schedule showtimes over the next 4 days for each movie
    const now = new Date();
    const times = [14, 17, 20]; // 2pm, 5pm, 8pm
    for (const movie of created) {
      for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
        for (const hour of times) {
          const startsAt = new Date(now);
          startsAt.setDate(startsAt.getDate() + dayOffset);
          startsAt.setHours(hour, 0, 0, 0);
          if (startsAt < now) continue;

          const screen = screens[Math.floor(Math.random() * screens.length)];
          await createShowtime({
            movieId: movie.id,
            screenId: screen.id,
            startsAt: startsAt.toISOString(),
            priceCents: 1200,
          });
        }
      }
    }
    console.log("Scheduled showtimes for the next 4 days.");
  } else {
    console.log("Movies already exist, skipping catalog seed.");
  }

  console.log("\nSeed complete.");
  console.log("Admin login:    admin@cinema.demo / admin1234");
  console.log("Customer login: demo@cinema.demo / demo1234");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
