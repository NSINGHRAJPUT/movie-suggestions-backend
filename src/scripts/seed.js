/**
 * Idempotent seed script for CineGraph.
 *
 * Populates CognoDB Cloud with a realistic, densely-interconnected movie
 * graph: directors, actors, genres, languages, countries, movies and 8
 * fictional users with overlapping LIKES / WATCHED / FOLLOWS relationships
 * engineered so every recommendation signal (social, director, actor,
 * genre) returns meaningful, non-empty results.
 *
 * Safe to re-run: every write uses MERGE, never CREATE, keyed on a stable
 * slug `id`.
 *
 * Usage: npm run seed
 */
import "dotenv/config";
import neo4j from "neo4j-driver";
import driver, { closeDriver } from "../config/db.js";

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const GENRES = [
  "Sci-Fi",
  "Drama",
  "Thriller",
  "Crime",
  "Mystery",
  "Action",
  "Psychological",
];
const LANGUAGES = ["English", "Korean"];
const COUNTRIES = ["USA", "UK", "South Korea"];

const DIRECTORS = [
  "Christopher Nolan",
  "Denis Villeneuve",
  "David Fincher",
  "Bong Joon-ho",
  "Damien Chazelle",
  "Matt Reeves",
  "Lana and Lilly Wachowski",
  "Todd Phillips",
  "Frank Darabont",
];

const MOVIES = [
  {
    title: "Inception",
    year: 2010,
    rating: 8.8,
    duration: 148,
    overview:
      "A skilled thief who steals corporate secrets through dream-sharing technology is offered a chance at redemption if he can accomplish the impossible: inception.",
    director: "Christopher Nolan",
    genres: ["Sci-Fi", "Thriller", "Action"],
    language: "English",
    country: "USA",
    actors: [
      "Leonardo DiCaprio",
      "Cillian Murphy",
      "Tom Hardy",
      "Elliot Page",
      "Joseph Gordon-Levitt",
    ],
  },
  {
    title: "Interstellar",
    year: 2014,
    rating: 8.6,
    duration: 169,
    overview:
      "A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
    director: "Christopher Nolan",
    genres: ["Sci-Fi", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_.jpg",
    actors: ["Matthew McConaughey", "Anne Hathaway", "Michael Caine"],
  },
  {
    title: "The Dark Knight",
    year: 2008,
    rating: 9.0,
    duration: 152,
    overview:
      "When the menace known as the Joker wreaks havoc on Gotham, Batman must confront one of the greatest psychological tests of his ability to fight injustice.",
    director: "Christopher Nolan",
    genres: ["Action", "Crime", "Thriller"],
    language: "English",
    country: "UK",
    actors: ["Christian Bale", "Michael Caine", "Cillian Murphy"],
  },
  {
    title: "Oppenheimer",
    year: 2023,
    rating: 8.4,
    duration: 180,
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    director: "Christopher Nolan",
    genres: ["Drama", "Thriller", "Mystery"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Oppenheimer_%28film%29.jpg/250px-Oppenheimer_%28film%29.jpg",
    actors: ["Cillian Murphy", "Robert Downey Jr."],
  },
  {
    title: "Tenet",
    year: 2020,
    rating: 7.3,
    duration: 150,
    overview:
      "Armed with only one word, Tenet, a protagonist journeys through a twilight world of international espionage to prevent an attack that threatens the world.",
    director: "Christopher Nolan",
    genres: ["Sci-Fi", "Action", "Thriller"],
    language: "English",
    country: "USA",
    actors: ["Robert Pattinson", "John David Washington", "Elizabeth Debicki"],
  },
  {
    title: "The Prestige",
    year: 2006,
    rating: 8.5,
    duration: 130,
    overview:
      "Two stage magicians engage in a competitive rivalry to create the ultimate stage illusion, with tragic consequences.",
    director: "Christopher Nolan",
    genres: ["Drama", "Mystery", "Thriller"],
    language: "English",
    country: "UK",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/d/d2/Prestige_poster.jpg",
    actors: ["Christian Bale", "Michael Caine", "Hugh Jackman", "Guy Pearce"],
  },
  {
    title: "Memento",
    year: 2000,
    rating: 8.4,
    duration: 113,
    overview:
      "A man with short-term memory loss attempts to track down his wife's murderer using an intricate system of notes and tattoos.",
    director: "Christopher Nolan",
    genres: ["Mystery", "Thriller", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMGQ3Y2Q4NjktN2E4Ny00Y2Q2LTliZDUtZTNiNjRhY2I0NGIyXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    actors: ["Guy Pearce"],
  },
  {
    title: "Dune",
    year: 2021,
    rating: 8.0,
    duration: 155,
    overview:
      "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset on a hostile desert planet.",
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Action", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Dune_%282021_film%29.jpg/250px-Dune_%282021_film%29.jpg",
    actors: ["Timothée Chalamet", "Zendaya", "Oscar Isaac"],
  },
  {
    title: "Arrival",
    year: 2016,
    rating: 7.9,
    duration: 116,
    overview:
      "A linguist is recruited by the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Drama", "Mystery"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMTExMzU0ODcxNDheQTJeQWpwZ15BbWU4MDE1OTI4MzAy._V1_FMjpg_UX1000_.jpg",
    actors: ["Amy Adams", "Jeremy Renner"],
  },
  {
    title: "Blade Runner 2049",
    year: 2017,
    rating: 8.0,
    duration: 164,
    overview:
      "A young blade runner unearths a long-buried secret that leads him to track down former blade runner Rick Deckard, missing for thirty years.",
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Drama", "Action"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/9/9b/Blade_Runner_2049_poster.png",
    actors: ["Ryan Gosling", "Harrison Ford"],
  },
  {
    title: "Sicario",
    year: 2015,
    rating: 7.6,
    duration: 121,
    overview:
      "An idealistic FBI agent is enlisted by a government task force to aid in the escalating war against drugs at the border area between the U.S. and Mexico.",
    director: "Denis Villeneuve",
    genres: ["Crime", "Thriller", "Action"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMjA5NjM3NTk1M15BMl5BanBnXkFtZTgwMzg1MzU2NjE@._V1_.jpg",
    actors: ["Josh Brolin", "Emily Blunt"],
  },
  {
    title: "Se7en",
    year: 1995,
    rating: 8.6,
    duration: 127,
    overview:
      "Two detectives hunt a serial killer who uses the seven deadly sins as his motives.",
    director: "David Fincher",
    genres: ["Crime", "Thriller", "Mystery", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8OUhV4IoOEDCeLJsyjma1hUHpAGnX2B9vL7RrvXyODw&s=10",
    actors: ["Brad Pitt", "Morgan Freeman"],
  },
  {
    title: "Fight Club",
    year: 1999,
    rating: 8.8,
    duration: 139,
    overview:
      "An insomniac office worker and a soap salesman build a global organization to help vent male aggression.",
    director: "David Fincher",
    genres: ["Drama", "Thriller", "Psychological"],
    language: "English",
    country: "USA",
    poster: "https://m.media-amazon.com/images/I/81D+KJkO4SL.jpg",
    actors: ["Brad Pitt", "Edward Norton"],
  },
  {
    title: "The Social Network",
    year: 2010,
    rating: 7.8,
    duration: 120,
    overview:
      "The founding of Facebook and the resulting lawsuits that unfolded between the co-founders.",
    director: "David Fincher",
    genres: ["Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/8c/The_Social_Network_film_poster.png",
    actors: ["Jesse Eisenberg", "Andrew Garfield"],
  },
  {
    title: "Gone Girl",
    year: 2014,
    rating: 8.1,
    duration: 149,
    overview:
      "With his wife's disappearance having become the focus of an intense media circus, a man sees the spotlight turned on him when it's suspected that he may have killed her.",
    director: "David Fincher",
    genres: ["Thriller", "Mystery", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMTk0MDQ3MzAzOV5BMl5BanBnXkFtZTgwNzU1NzE3MjE@._V1_.jpg",
    actors: ["Ben Affleck", "Rosamund Pike"],
  },
  {
    title: "Zodiac",
    year: 2007,
    rating: 7.7,
    duration: 157,
    overview:
      "Between 1968 and 1983, a San Francisco cartoonist becomes an amateur detective obsessed with tracking down the elusive Zodiac Killer.",
    director: "David Fincher",
    genres: ["Crime", "Mystery", "Thriller"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BNDFkMTRkZmQtM2I0NC00NjJjLWJlMDctNTNiZWYxYzhjZDZiXkEyXkFqcGc@._V1_.jpg",
    actors: ["Jake Gyllenhaal", "Robert Downey Jr."],
  },
  {
    title: "Parasite",
    year: 2019,
    rating: 8.5,
    duration: 132,
    overview:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    director: "Bong Joon-ho",
    genres: ["Drama", "Thriller", "Crime"],
    language: "Korean",
    country: "South Korea",
    poster:
      "https://m.media-amazon.com/images/M/MV5BYjk1Y2U4MjQtY2ZiNS00OWQyLWI3MmYtZWUwNmRjYWRiNWNhXkEyXkFqcGc@._V1_.jpg",
    actors: ["Song Kang-ho"],
  },
  {
    title: "Snowpiercer",
    year: 2013,
    rating: 7.1,
    duration: 126,
    overview:
      "On a train carrying the last remnants of humanity after a failed climate-change experiment kills all life except those on board, a class system emerges.",
    director: "Bong Joon-ho",
    genres: ["Sci-Fi", "Action", "Thriller"],
    language: "English",
    country: "South Korea",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMTQ3NzA1MTY3MV5BMl5BanBnXkFtZTgwNzE2Mzg5MTE@._V1_FMjpg_UX1000_.jpg",
    actors: ["Song Kang-ho", "Chris Evans"],
  },
  {
    title: "Memories of Murder",
    year: 2003,
    rating: 8.1,
    duration: 132,
    overview:
      "In a small Korean province in 1986, three detectives struggle with the case of multiple young women being found raped and murdered.",
    director: "Bong Joon-ho",
    genres: ["Crime", "Mystery", "Drama"],
    language: "Korean",
    country: "South Korea",
    poster:
      "https://m.media-amazon.com/images/S/pv-target-images/6776fadcc772f3bad30390c9372d9aafd5901a4962716542a2c5761173f89b04.jpg",
    actors: ["Song Kang-ho"],
  },
  {
    title: "Whiplash",
    year: 2014,
    rating: 8.5,
    duration: 106,
    overview:
      "A promising young drummer enrolls at a cutthroat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
    director: "Damien Chazelle",
    genres: ["Drama", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMDFjOWFkYzktYzhhMC00NmYyLTkwY2EtYjViMDhmNzg0OGFkXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    actors: ["Miles Teller", "J.K. Simmons"],
  },
  {
    title: "La La Land",
    year: 2016,
    rating: 8.0,
    duration: 128,
    overview:
      "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
    director: "Damien Chazelle",
    genres: ["Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/thumb/a/ab/La_La_Land_%28film%29.png/250px-La_La_Land_%28film%29.png",
    actors: ["Emma Stone", "Ryan Gosling"],
  },
  {
    title: "The Batman",
    year: 2022,
    rating: 7.8,
    duration: 176,
    overview:
      "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption.",
    director: "Matt Reeves",
    genres: ["Action", "Crime", "Mystery", "Thriller"],
    language: "English",
    country: "UK",
    actors: ["Robert Pattinson", "Zoe Kravitz", "Colin Farrell"],
  },
  {
    title: "War for the Planet of the Apes",
    year: 2017,
    rating: 7.4,
    duration: 140,
    overview:
      "Caesar and his apes are forced into a deadly conflict with an army of humans led by a ruthless colonel.",
    director: "Matt Reeves",
    genres: ["Sci-Fi", "Action", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BMzNhMzNiZDYtMzYxYy00YTYwLTkxNmYtNTJhOGU1Yjg5ODI5XkEyXkFqcGc@._V1_.jpg",
    actors: ["Andy Serkis", "Woody Harrelson"],
  },
  {
    title: "The Matrix",
    year: 1999,
    rating: 8.7,
    duration: 136,
    overview:
      "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    director: "Lana and Lilly Wachowski",
    genres: ["Sci-Fi", "Action"],
    language: "English",
    country: "USA",
    poster:
      "https://m.media-amazon.com/images/M/MV5BN2NmN2VhMTQtMDNiOS00NDlhLTliMjgtODE2ZTY0ODQyNDRhXkEyXkFqcGc@._V1_.jpg",
    actors: ["Keanu Reeves", "Carrie-Anne Moss", "Laurence Fishburne"],
  },
  {
    title: "Joker",
    year: 2019,
    rating: 8.4,
    duration: 122,
    overview:
      "In Gotham City, mentally troubled comedian Arthur Fleck is disregarded and mistreated, setting him on a path of chaos and rebellion against a corrupt society.",
    director: "Todd Phillips",
    genres: ["Drama", "Crime", "Psychological", "Thriller"],
    language: "English",
    country: "USA",
    actors: ["Joaquin Phoenix", "Robert De Niro"],
  },
  {
    title: "Shawshank Redemption",
    year: 1994,
    rating: 9.3,
    duration: 142,
    overview:
      "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    director: "Frank Darabont",
    genres: ["Drama", "Crime"],
    language: "English",
    country: "USA",
    poster:
      "https://mediaproxy.tvtropes.org/width/1200/https://static.tvtropes.org/pmwiki/pub/images/6fa79a3251cbf9c1c929aaec71ebb1309c57566a61d490045de285525914f285_ur12002c1600_ri__waifu2x_art_noise1.png",
    actors: ["Tim Robbins", "Morgan Freeman"],
  },
  {
    title: "The Godfather",
    year: 1972,
    rating: 9.2,
    duration: 175,
    overview:
      "The aging patriarch of an organized crime dynasty transfers control of his empire to his reluctant son.",
    director: "Francis Ford Coppola",
    genres: ["Crime", "Drama"],
    language: "English",
    country: "USA",
    poster: "https://upload.wikimedia.org/wikipedia/en/1/1c/Godfather_ver1.jpg",
    actors: ["Marlon Brando", "Al Pacino", "James Caan"],
  },
  {
    title: "The Godfather Part II",
    year: 1974,
    rating: 9.0,
    duration: 202,
    overview:
      "The early life of Vito Corleone and the expansion of the Corleone family empire under Michael.",
    director: "Francis Ford Coppola",
    genres: ["Crime", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/0/03/Godfather_part_ii.jpg",
    actors: ["Al Pacino", "Robert De Niro", "Robert Duvall"],
  },
  {
    title: "Pulp Fiction",
    year: 1994,
    rating: 8.9,
    duration: 154,
    overview:
      "The lives of two mob hitmen, a boxer, and others intertwine in four tales of violence and redemption.",
    director: "Quentin Tarantino",
    genres: ["Crime", "Drama", "Thriller"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/82/Pulp_Fiction_cover.jpg",
    actors: ["John Travolta", "Samuel L. Jackson", "Uma Thurman"],
  },
  {
    title: "Django Unchained",
    year: 2012,
    rating: 8.5,
    duration: 165,
    overview:
      "A freed slave teams up with a bounty hunter to rescue his wife from a brutal plantation owner.",
    director: "Quentin Tarantino",
    genres: ["Drama", "Western"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/8b/Django_Unchained_Poster.jpg",
    actors: ["Jamie Foxx", "Christoph Waltz", "Leonardo DiCaprio"],
  },
  {
    title: "Inglourious Basterds",
    year: 2009,
    rating: 8.4,
    duration: 153,
    overview:
      "A group of Jewish soldiers plot revenge against the Nazi regime in occupied France.",
    director: "Quentin Tarantino",
    genres: ["War", "Drama", "Thriller"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/c/c3/Inglourious_Basterds_poster.jpg",
    actors: ["Brad Pitt", "Christoph Waltz", "Michael Fassbender"],
  },
  {
    title: "The Departed",
    year: 2006,
    rating: 8.5,
    duration: 151,
    overview:
      "An undercover cop and a police informant attempt to identify each other while infiltrating an Irish gang.",
    director: "Martin Scorsese",
    genres: ["Crime", "Thriller", "Drama"],
    language: "English",
    country: "USA",
    poster: "https://upload.wikimedia.org/wikipedia/en/5/50/Departed234.jpg",
    actors: ["Leonardo DiCaprio", "Matt Damon", "Jack Nicholson"],
  },
  {
    title: "The Wolf of Wall Street",
    year: 2013,
    rating: 8.2,
    duration: 180,
    overview:
      "Based on the true story of stockbroker Jordan Belfort and his rise and fall.",
    director: "Martin Scorsese",
    genres: ["Drama", "Crime"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/1/15/The_Wolf_of_Wall_Street_%282013%29.png",
    actors: ["Leonardo DiCaprio", "Jonah Hill", "Margot Robbie"],
  },
  {
    title: "Shutter Island",
    year: 2010,
    rating: 8.2,
    duration: 138,
    overview:
      "A U.S. Marshal investigates the disappearance of a patient from a psychiatric facility on a remote island.",
    director: "Martin Scorsese",
    genres: ["Mystery", "Thriller", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/7/76/Shutterislandposter.jpg",
    actors: ["Leonardo DiCaprio", "Mark Ruffalo", "Ben Kingsley"],
  },
  {
    title: "The Irishman",
    year: 2019,
    rating: 7.8,
    duration: 209,
    overview:
      "An aging mob hitman recalls his involvement with the Bufalino crime family.",
    director: "Martin Scorsese",
    genres: ["Crime", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/4/48/The_Irishman_poster.jpg",
    actors: ["Robert De Niro", "Al Pacino", "Joe Pesci"],
  },
  {
    title: "Prisoners",
    year: 2013,
    rating: 8.1,
    duration: 153,
    overview:
      "A father takes matters into his own hands after his daughter and her friend go missing.",
    director: "Denis Villeneuve",
    genres: ["Thriller", "Crime", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/6/63/Prisoners2013Poster.jpg",
    actors: ["Hugh Jackman", "Jake Gyllenhaal", "Paul Dano"],
  },
  {
    title: "Enemy",
    year: 2013,
    rating: 6.9,
    duration: 91,
    overview:
      "A man discovers his exact double and becomes obsessed with tracking him down.",
    director: "Denis Villeneuve",
    genres: ["Psychological", "Thriller", "Mystery"],
    language: "English",
    country: "Canada",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/7/70/Enemy2013Poster.jpg",
    actors: ["Jake Gyllenhaal", "Mélanie Laurent"],
  },
  {
    title: "Dune: Part Two",
    year: 2024,
    rating: 8.6,
    duration: 166,
    overview:
      "Paul Atreides unites with the Fremen and begins a spiritual and military journey to become Muad'Dib.",
    director: "Denis Villeneuve",
    genres: ["Sci-Fi", "Action", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg",
    actors: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"],
  },
  {
    title: "No Country for Old Men",
    year: 2007,
    rating: 8.2,
    duration: 122,
    overview:
      "Violence and fate collide after a hunter discovers a drug deal gone wrong in the Texas desert.",
    director: "Coen Brothers",
    genres: ["Crime", "Thriller", "Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/d/de/No_Country_for_Old_Men_poster.jpg",
    actors: ["Javier Bardem", "Tommy Lee Jones", "Josh Brolin"],
  },
  {
    title: "There Will Be Blood",
    year: 2007,
    rating: 8.2,
    duration: 158,
    overview:
      "A ruthless oil prospector pursues wealth and power in early 20th-century California.",
    director: "Paul Thomas Anderson",
    genres: ["Drama"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/d/d8/There_Will_Be_Blood_Poster.jpg",
    actors: ["Daniel Day-Lewis", "Paul Dano"],
  },
  {
    title: "The Truman Show",
    year: 1998,
    rating: 8.2,
    duration: 103,
    overview:
      "A man gradually discovers that his entire life has been a television show.",
    director: "Peter Weir",
    genres: ["Drama", "Sci-Fi"],
    language: "English",
    country: "USA",
    poster: "https://upload.wikimedia.org/wikipedia/en/c/c3/TheTrumanShow.jpg",
    actors: ["Jim Carrey", "Laura Linney", "Ed Harris"],
  },
  {
    title: "Eternal Sunshine of the Spotless Mind",
    year: 2004,
    rating: 8.3,
    duration: 108,
    overview:
      "After a painful breakup, a couple undergoes a procedure to erase each other from their memories.",
    director: "Michel Gondry",
    genres: ["Drama", "Sci-Fi", "Romance"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/a/a4/Eternal_Sunshine_of_the_Spotless_Mind.png",
    actors: ["Jim Carrey", "Kate Winslet"],
  },
  {
    title: "Her",
    year: 2013,
    rating: 8.0,
    duration: 126,
    overview:
      "A lonely writer develops a deep relationship with an advanced artificial intelligence operating system.",
    director: "Spike Jonze",
    genres: ["Drama", "Sci-Fi", "Romance"],
    language: "English",
    country: "USA",
    poster: "https://upload.wikimedia.org/wikipedia/en/4/44/Her2013Poster.jpg",
    actors: ["Joaquin Phoenix", "Scarlett Johansson", "Amy Adams"],
  },
  {
    title: "Ex Machina",
    year: 2014,
    rating: 7.7,
    duration: 108,
    overview:
      "A programmer is invited to administer a Turing test to an intelligent humanoid robot.",
    director: "Alex Garland",
    genres: ["Sci-Fi", "Psychological", "Thriller"],
    language: "English",
    country: "UK",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/b/ba/Ex-machina-uk-poster.jpg",
    actors: ["Alicia Vikander", "Oscar Isaac", "Domhnall Gleeson"],
  },
  {
    title: "The Revenant",
    year: 2015,
    rating: 8.0,
    duration: 156,
    overview:
      "A frontiersman fights for survival after being left for dead following a bear attack.",
    director: "Alejandro G. Iñárritu",
    genres: ["Drama", "Adventure"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/b/b6/The_Revenant_2015_film_poster.jpg",
    actors: ["Leonardo DiCaprio", "Tom Hardy"],
  },
  {
    title: "Mad Max: Fury Road",
    year: 2015,
    rating: 8.1,
    duration: 120,
    overview:
      "In a post-apocalyptic wasteland, Max joins forces with Furiosa in a desperate escape across the desert.",
    director: "George Miller",
    genres: ["Action", "Sci-Fi"],
    language: "English",
    country: "Australia",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/6/6e/Mad_Max_Fury_Road.jpg",
    actors: ["Tom Hardy", "Charlize Theron"],
  },
  {
    title: "1917",
    year: 2019,
    rating: 8.2,
    duration: 119,
    overview:
      "Two British soldiers are sent on a dangerous mission across enemy territory during World War I.",
    director: "Sam Mendes",
    genres: ["War", "Drama"],
    language: "English",
    country: "UK",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/f/fe/1917_%282019%29_Film_Poster.jpeg",
    actors: ["George MacKay", "Dean-Charles Chapman"],
  },
  {
    title: "Ford v Ferrari",
    year: 2019,
    rating: 8.1,
    duration: 152,
    overview:
      "American car designer Carroll Shelby and driver Ken Miles challenge Ferrari at Le Mans.",
    director: "James Mangold",
    genres: ["Drama", "Sports"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/3/33/Ford_v._Ferrari_%282019_film_poster%29.png",
    actors: ["Matt Damon", "Christian Bale"],
  },
  {
    title: "Knives Out",
    year: 2019,
    rating: 7.9,
    duration: 130,
    overview:
      "A detective investigates the death of a wealthy crime novelist surrounded by a dysfunctional family.",
    director: "Rian Johnson",
    genres: ["Mystery", "Crime", "Comedy"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/1/1f/Knives_Out_poster.jpeg",
    actors: ["Daniel Craig", "Chris Evans", "Ana de Armas"],
  },
  {
    title: "Glass Onion: A Knives Out Mystery",
    year: 2022,
    rating: 7.1,
    duration: 139,
    overview:
      "Detective Benoit Blanc travels to Greece to unravel a new mystery involving a tech billionaire and his friends.",
    director: "Rian Johnson",
    genres: ["Mystery", "Crime", "Comedy"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/d/d5/Glass_Onion_poster.jpg",
    actors: ["Daniel Craig", "Edward Norton", "Janelle Monáe"],
  },
  {
    title: "The Grand Budapest Hotel",
    year: 2014,
    rating: 8.1,
    duration: 99,
    overview:
      "The adventures of a legendary concierge and his lobby boy at a famous European hotel.",
    director: "Wes Anderson",
    genres: ["Comedy", "Drama"],
    language: "English",
    country: "UK",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/a/a6/The_Grand_Budapest_Hotel_Poster.jpg",
    actors: ["Ralph Fiennes", "Tony Revolori", "Saoirse Ronan"],
  },
  {
    title: "The Lighthouse",
    year: 2019,
    rating: 7.4,
    duration: 109,
    overview:
      "Two lighthouse keepers descend into paranoia and madness while isolated on a remote island.",
    director: "Robert Eggers",
    genres: ["Psychological", "Drama", "Thriller"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/1/16/The_Lighthouse_%282019_film%29.png",
    actors: ["Robert Pattinson", "Willem Dafoe"],
  },
  {
    title: "The Green Mile",
    year: 1999,
    rating: 8.6,
    duration: 189,
    overview:
      "A death row corrections officer witnesses extraordinary events involving a mysterious inmate with miraculous powers.",
    director: "Frank Darabont",
    genres: ["Drama", "Fantasy"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/e/e2/The_Green_Mile_%28movie_poster%29.jpg",
    actors: ["Tom Hanks", "Michael Clarke Duncan"],
  },
  {
    title: "The Silence of the Lambs",
    year: 1991,
    rating: 8.6,
    duration: 118,
    overview:
      "A young FBI cadet seeks the help of an imprisoned cannibalistic psychiatrist to catch another serial killer.",
    director: "Jonathan Demme",
    genres: ["Crime", "Thriller", "Psychological"],
    language: "English",
    country: "USA",
    poster:
      "https://upload.wikimedia.org/wikipedia/en/8/86/The_Silence_of_the_Lambs_poster.jpg",
    actors: ["Jodie Foster", "Anthony Hopkins"],
  },
  {
    title: "The Prestige of Tomorrow",
    year: 2025,
    rating: 7.9,
    duration: 124,
    overview:
      "A fictional contemporary mystery thriller included as seed data for graph traversal and recommendation testing.",
    director: "Ava Morgan",
    genres: ["Mystery", "Thriller"],
    language: "English",
    country: "UK",
    poster:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    actors: ["Emma Stone", "Cillian Murphy"],
  },
];

const ACTORS = [...new Set(MOVIES.flatMap((m) => m.actors))];

const USERS = [
  { name: "Neeraj", city: "Mumbai" },
  { name: "Rahul", city: "Delhi" },
  { name: "Aditi", city: "Bangalore" },
  { name: "Arjun", city: "Pune" },
  { name: "Karan", city: "Chennai" },
  { name: "Sneha", city: "Hyderabad" },
  { name: "Ishita", city: "Kolkata" },
  { name: "Rohan", city: "Jaipur" },
];

const FOLLOWS = [
  ["Neeraj", "Rahul"],
  ["Neeraj", "Aditi"],
  ["Rahul", "Karan"],
  ["Aditi", "Sneha"],
  ["Arjun", "Neeraj"],
  ["Arjun", "Ishita"],
  ["Karan", "Rohan"],
  ["Sneha", "Aditi"],
  ["Ishita", "Rahul"],
  ["Rohan", "Arjun"],
  ["Rohan", "Karan"],
];

const LIKES = [
  ["Neeraj", "Inception"],
  ["Neeraj", "The Dark Knight"],
  ["Neeraj", "Interstellar"],
  ["Neeraj", "Se7en"],
  ["Rahul", "Interstellar"],
  ["Rahul", "Oppenheimer"],
  ["Rahul", "Tenet"],
  ["Rahul", "Dune"],
  ["Aditi", "Parasite"],
  ["Aditi", "Memories of Murder"],
  ["Aditi", "Fight Club"],
  ["Arjun", "The Dark Knight"],
  ["Arjun", "The Batman"],
  ["Arjun", "Joker"],
  ["Karan", "Dune"],
  ["Karan", "Arrival"],
  ["Karan", "Blade Runner 2049"],
  ["Karan", "Interstellar"],
  ["Sneha", "Whiplash"],
  ["Sneha", "La La Land"],
  ["Sneha", "The Social Network"],
  ["Ishita", "The Matrix"],
  ["Ishita", "Blade Runner 2049"],
  ["Ishita", "Tenet"],
  ["Rohan", "Se7en"],
  ["Rohan", "Fight Club"],
  ["Rohan", "The Social Network"],
  ["Rohan", "Shawshank Redemption"],
];

const WATCHED = [
  ["Neeraj", "Tenet"],
  ["Neeraj", "Dune"],
  ["Neeraj", "Memento"],
  ["Rahul", "The Dark Knight"],
  ["Rahul", "The Prestige"],
  ["Aditi", "Snowpiercer"],
  ["Aditi", "Joker"],
  ["Arjun", "Inception"],
  ["Arjun", "Tenet"],
  ["Karan", "The Matrix"],
  ["Karan", "Oppenheimer"],
  ["Sneha", "The Batman"],
  ["Sneha", "Parasite"],
  ["Ishita", "Dune"],
  ["Ishita", "Arrival"],
  ["Rohan", "Gone Girl"],
  ["Rohan", "Zodiac"],
];

const LABELS_WITH_UNIQUE_ID = [
  "User",
  "Movie",
  "Actor",
  "Director",
  "Genre",
  "Language",
  "Country",
];

async function ensureConstraints(session) {
  for (const label of LABELS_WITH_UNIQUE_ID) {
    try {
      await session.executeWrite((tx) =>
        tx.run(
          `CREATE CONSTRAINT IF NOT EXISTS FOR (n:${label}) REQUIRE n.id IS UNIQUE`,
        ),
      );
    } catch (error) {
      console.warn(
        `  (skipped uniqueness constraint for ${label}: ${error.message})`,
      );
    }
  }
}

async function seedLookupNodes(session, label, names) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row MERGE (n:${label} {id: row.id}) SET n.name = row.name`,
      {
        rows: names.map((name) => ({ id: slugify(name), name })),
      },
    ),
  );
}

async function seedUsers(session) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MERGE (u:User {id: row.id})
       SET u.name = row.name, u.city = row.city, u.avatar = row.avatar`,
      {
        rows: USERS.map((u) => ({
          id: slugify(u.name),
          name: u.name,
          city: u.city,
          avatar: null,
        })),
      },
    ),
  );
}

async function seedMovies(session) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MERGE (m:Movie {id: row.id})
       SET m.title = row.title,
           m.year = row.year,
           m.rating = row.rating,
           m.duration = row.duration,
           m.overview = row.overview,
           m.poster = row.poster`,
      {
        rows: MOVIES.map((m) => ({
          id: slugify(m.title),
          title: m.title,
          year: neo4j.int(m.year),
          rating: m.rating,
          duration: neo4j.int(m.duration),
          overview: m.overview,
          poster: m.poster ?? null,
        })),
      },
    ),
  );
}

// NOTE: every relationship-linking query below chains
// "MATCH (a) WITH a, row MATCH (b) MERGE ..." instead of two consecutive/
// comma-joined MATCH clauses. CognoDB's query planner has been observed to
// cache a bad plan for the latter shape (especially when both sides share a
// label, e.g. User-User) where the second node's inline `{id: ...}` filter
// is silently dropped, turning the MERGE into a cartesian product that
// corrupts data. The WITH forces sequential, single-row evaluation and has
// proven reliable under repeated testing - see users.cypher.js for the same
// pattern used by the live API.
async function seedMovieDirectors(session) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (m:Movie {id: row.movieId})
       WITH m, row
       MATCH (d:Director {id: row.directorId})
       MERGE (m)-[:DIRECTED_BY]->(d)`,
      {
        rows: MOVIES.map((m) => ({
          movieId: slugify(m.title),
          directorId: slugify(m.director),
        })),
      },
    ),
  );
}

async function seedMovieGenres(session) {
  const rows = MOVIES.flatMap((m) =>
    m.genres.map((g) => ({ movieId: slugify(m.title), genreId: slugify(g) })),
  );
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (m:Movie {id: row.movieId})
       WITH m, row
       MATCH (g:Genre {id: row.genreId})
       MERGE (m)-[:HAS_GENRE]->(g)`,
      { rows },
    ),
  );
}

async function seedMovieLanguages(session) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (m:Movie {id: row.movieId})
       WITH m, row
       MATCH (l:Language {id: row.languageId})
       MERGE (m)-[:HAS_LANGUAGE]->(l)`,
      {
        rows: MOVIES.map((m) => ({
          movieId: slugify(m.title),
          languageId: slugify(m.language),
        })),
      },
    ),
  );
}

async function seedMovieCountries(session) {
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (m:Movie {id: row.movieId})
       WITH m, row
       MATCH (c:Country {id: row.countryId})
       MERGE (m)-[:HAS_COUNTRY]->(c)`,
      {
        rows: MOVIES.map((m) => ({
          movieId: slugify(m.title),
          countryId: slugify(m.country),
        })),
      },
    ),
  );
}

async function seedMovieActors(session) {
  const rows = MOVIES.flatMap((m) =>
    m.actors.map((a) => ({ movieId: slugify(m.title), actorId: slugify(a) })),
  );
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (a:Actor {id: row.actorId})
       WITH a, row
       MATCH (m:Movie {id: row.movieId})
       MERGE (a)-[:ACTED_IN]->(m)`,
      { rows },
    ),
  );
}

async function seedFollows(session) {
  const rows = FOLLOWS.map(([from, to]) => ({
    fromId: slugify(from),
    toId: slugify(to),
  }));
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (u:User {id: row.fromId})
       WITH u, row
       MATCH (t:User {id: row.toId})
       MERGE (u)-[:FOLLOWS]->(t)`,
      { rows },
    ),
  );
}

async function seedLikes(session) {
  const rows = LIKES.map(([user, movie]) => ({
    userId: slugify(user),
    movieId: slugify(movie),
  }));
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (u:User {id: row.userId})
       WITH u, row
       MATCH (m:Movie {id: row.movieId})
       MERGE (u)-[:LIKES]->(m)`,
      { rows },
    ),
  );
}

async function seedWatched(session) {
  const rows = WATCHED.map(([user, movie]) => ({
    userId: slugify(user),
    movieId: slugify(movie),
  }));
  await session.executeWrite((tx) =>
    tx.run(
      `UNWIND $rows AS row
       MATCH (u:User {id: row.userId})
       WITH u, row
       MATCH (m:Movie {id: row.movieId})
       MERGE (u)-[:WATCHED]->(m)`,
      { rows },
    ),
  );
}

async function main() {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });

  try {
    console.log("Seeding CineGraph dataset into CognoDB Cloud...\n");

    console.log("-> Ensuring uniqueness constraints");
    await ensureConstraints(session);

    console.log(
      "-> Seeding lookup nodes (genres, languages, countries, directors, actors)",
    );
    await seedLookupNodes(session, "Genre", GENRES);
    await seedLookupNodes(session, "Language", LANGUAGES);
    await seedLookupNodes(session, "Country", COUNTRIES);
    await seedLookupNodes(session, "Director", DIRECTORS);
    await seedLookupNodes(session, "Actor", ACTORS);

    console.log("-> Seeding users");
    await seedUsers(session);

    console.log("-> Seeding movies");
    await seedMovies(session);

    console.log(
      "-> Linking movies to directors, genres, languages, countries and actors",
    );
    await seedMovieDirectors(session);
    await seedMovieGenres(session);
    await seedMovieLanguages(session);
    await seedMovieCountries(session);
    await seedMovieActors(session);

    console.log("-> Seeding social graph (follows, likes, watched)");
    await seedFollows(session);
    await seedLikes(session);
    await seedWatched(session);

    const result = await session.executeRead((tx) =>
      tx.run(`
        MATCH (n)
        RETURN labels(n)[0] AS label, count(n) AS count
        ORDER BY label
      `),
    );

    console.log("\nSeed complete. Node counts:");
    result.records.forEach((record) => {
      console.log(`  ${record.get("label")}: ${record.get("count")}`);
    });
    console.log(
      `\nMovies: ${MOVIES.length}, Actors: ${ACTORS.length}, Directors: ${DIRECTORS.length}, Users: ${USERS.length}`,
    );
  } finally {
    await session.close();
    await closeDriver();
  }
}

main().catch((error) => {
  console.error("\nSeeding failed:", error);
  process.exitCode = 1;
});
