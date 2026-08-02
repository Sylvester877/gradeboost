import {
  FunctionSquare,
  Globe,
  Pi,
  Ruler,
  Calculator,
  CircleDot,
  TrendingUp,
  Shuffle,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface Chapter {
  num: number;
  title: string;
  icon: LucideIcon;
  slug: string;
  color: string;
  subsections: string[];
}

export const TEXTBOOK_CHAPTERS: Chapter[] = [
  {
    num: 1, title: "Algebra, equations & linear relationships", icon: FunctionSquare,
    slug: "algebra-equations", color: "from-violet-500 to-purple-600",
    subsections: ["Review of algebra", "Solving linear equations", "Linear inequalities", "Graphing straight lines", "Finding the equation of a line", "Length and midpoint", "Parallel and perpendicular lines", "Simultaneous equations"],
  },
  {
    num: 2, title: "Geometry and networks", icon: Globe,
    slug: "geometry-networks", color: "from-cyan-500 to-blue-600",
    subsections: ["Review of geometry", "Congruent triangles", "Similar figures", "Circle properties", "Introduction to networks", "Shortest path problems"],
  },
  {
    num: 3, title: "Indices, exponentials & logarithms", icon: Pi,
    slug: "indices-exponentials", color: "from-emerald-500 to-teal-600",
    subsections: ["Review of index laws", "Negative indices", "Scientific notation", "Exponential relations", "Compound interest", "Introducing logarithms"],
  },
  {
    num: 4, title: "Measurement and surds", icon: Ruler,
    slug: "measurement-surds", color: "from-orange-500 to-red-600",
    subsections: ["Irrational numbers & surds", "Pythagoras' theorem", "Review of area", "Measurement errors", "Surface area & volume"],
  },
  {
    num: 5, title: "Quadratic expressions & equations", icon: Calculator,
    slug: "quadratics", color: "from-pink-500 to-rose-600",
    subsections: ["Expanding expressions", "Factorising expressions", "Factorising quadratics", "Solving quadratic equations", "Completing the square", "Quadratic formula"],
  },
  {
    num: 6, title: "Trigonometry", icon: CircleDot,
    slug: "trigonometry", color: "from-amber-500 to-yellow-600",
    subsections: ["Trigonometric ratios", "Finding unknown angles", "Applications in 2D", "Directions & bearings", "Sine & cosine rules", "The unit circle"],
  },
  {
    num: 7, title: "Parabolas & rates of change", icon: TrendingUp,
    slug: "parabolas-rates", color: "from-sky-500 to-indigo-600",
    subsections: ["Exploring parabolas", "Sketching parabolas", "Applications of parabolas", "Rates of change"],
  },
  {
    num: 8, title: "Probability & counting", icon: Shuffle,
    slug: "probability-counting", color: "from-rose-500 to-fuchsia-600",
    subsections: ["Review of probability", "Venn diagrams & two-way tables", "Conditional probability", "Tree diagrams", "Independent events", "Counting principles"],
  },
  {
    num: 9, title: "Statistics", icon: BarChart3,
    slug: "statistics", color: "from-lime-500 to-green-600",
    subsections: ["Collecting data", "Review of data displays", "Two-way tables", "Summary statistics", "Box plots", "Standard deviation", "Time-series data", "Bivariate data & scatter plots"],
  },
];
