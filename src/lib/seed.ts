import { db } from "@/db";
import { sources, topics } from "@/db/schema";

const SAMPLE_SOURCES = [
  {
    title: "Pythagoras & Trigonometry",
    topic: "Measurement & Geometry",
    summary: "Right-angled triangles, the hypotenuse, Pythagoras' theorem and the three trigonometric ratios.",
    content: `PYTHAGORAS' THEOREM
In any right-angled triangle, the square of the hypotenuse (the side opposite the right angle) equals the sum of the squares of the other two sides.
  a^2 + b^2 = c^2   (c is the hypotenuse)
The hypotenuse is always the longest side and sits opposite the 90 degree angle.

Finding the hypotenuse: c = sqrt(a^2 + b^2)
Finding a shorter side: a = sqrt(c^2 - b^2)

Pythagorean triples are whole-number side lengths such as (3, 4, 5) and (5, 12, 13).

TRIGONOMETRIC RATIOS
For a right-angled triangle with angle theta:
  sin(theta) = opposite / hypotenuse
  cos(theta) = adjacent / hypotenuse
  tan(theta) = opposite / adjacent
Remember SOH-CAH-TOA.

To find an unknown side, choose the ratio that uses the known side and the unknown side.
To find an unknown angle, use the inverse functions: theta = sin^-1(x), cos^-1(x), tan^-1(x).

The exact values for 30, 45 and 60 degrees:
  sin(30) = 1/2,  cos(30) = sqrt(3)/2,  tan(30) = 1/sqrt(3)
  sin(45) = 1/sqrt(2), cos(45) = 1/sqrt(2), tan(45) = 1
  sin(60) = sqrt(3)/2, cos(60) = 1/2, tan(60) = sqrt(3)

ANGLES OF ELEVATION & DEPRESSION
The angle of elevation is measured upward from the horizontal. The angle of depression is measured downward from the horizontal. They are equal when measured between two objects (alternate angles).

BEARINGS
A compass bearing is measured clockwise from north. Use right-angled triangle trigonometry to solve navigation problems.`,
  },
  {
    title: "Linear Relationships",
    topic: "Number & Algebra",
    summary: "Gradient-intercept form, sketching straight lines, parallel and perpendicular lines, and simultaneous equations.",
    content: `STRAIGHT-LINE GRAPHS
A linear relationship graphs as a straight line and can be written as y = mx + c, where m is the gradient and c is the y-intercept.

GRADIENT
  m = rise / run = (y2 - y1) / (x2 - x1)
Positive gradient rises left-to-right; negative gradient falls.

PARALLEL & PERPENDICULAR LINES
Parallel lines share the same gradient: m1 = m2.
Perpendicular lines have gradients whose product is -1: m1 * m2 = -1.

FINDING THE EQUATION OF A LINE
Given gradient m and a point (x1, y1): y - y1 = m(x - x1), then rearrange to y = mx + c.

X- AND Y-INTERCEPTS
Set y = 0 to find the x-intercept; set x = 0 to find the y-intercept.

SIMULTANEOUS EQUATIONS
Two linear equations can be solved by:
  - Substitution: replace one variable with an expression from the other equation.
  - Elimination: add or subtract equations to remove a variable.
The solution is the point where the two lines intersect (x, y).`,
  },
  {
    title: "Indices & Surds",
    topic: "Number & Algebra",
    summary: "Index laws, zero and negative indices, scientific notation, and simplifying surds.",
    content: `INDEX LAWS (for any base a)
  a^m x a^n = a^(m+n)
  a^m / a^n = a^(m-n)
  (a^m)^n = a^(mn)
  (ab)^n = a^n b^n
  a^0 = 1
  a^(-n) = 1 / a^n
  a^(1/n) = nth root of a

SURDS
A surd is an irrational root such as sqrt(2). Simplify surds by factoring out perfect squares:
  sqrt(50) = sqrt(25 x 2) = 5 sqrt(2)
Like surds can be added/subtracted: 3 sqrt(2) + 2 sqrt(2) = 5 sqrt(2).
Rationalise a denominator by multiplying top and bottom by the conjugate.

SCIENTIFIC NOTATION
Write numbers as a x 10^n where 1 <= a < 10. Used for very large or very small numbers.`,
  },
];

const SAMPLE_TOPICS = [
  { name: "Pythagoras & Trigonometry", mastery: 72 },
  { name: "Linear Relationships", mastery: 58 },
  { name: "Indices & Surds", mastery: 40 },
  { name: "Statistics", mastery: 25 },
  { name: "Probability", mastery: 15 },
  { name: "Measurement", mastery: 64 },
];

/** Idempotently insert demo data so the app is alive on first load. */
export async function ensureSeedData() {
  try {
    const existing = await db.select().from(sources).limit(1);
    if (existing.length === 0) {
      await db.insert(sources).values(SAMPLE_SOURCES);
    }
    const existingTopics = await db.select().from(topics).limit(1);
    if (existingTopics.length === 0) {
      await db.insert(topics).values(SAMPLE_TOPICS);
    }
  } catch {
    // db may not be ready yet; ignore so pages still render
  }
}
