// ============================================================
// HSC Physics (1st Paper) — Dynamics
// NCTB Chapters 2, 3 & 4: Vectors, Kinematics, Newtonian Mechanics
//
// ── VIDEO SOURCING STRATEGY ──────────────────────────────────
// Each lesson has TWO layers:
//   • videoId  → Primary: OnnoRokom Pathshala (Bangla, NCTB-aligned)
//               Instructor: Ratul Khan (@onnorokompathshala)
//   • materials → Supplementary: Khan Academy / Michel van Biezen /
//                 Professor Leonard / Walter Lewin (MIT OCW) for
//                 broader understanding in English
//
// Each lesson carries a `source` object:
//   source: { name: 'OnnoRokom Pathshala', instructor: 'Ratul Khan', url: '...' }
// This credits the video's origin platform and teacher separately
// from coachIds (which points to Feyn's own curating instructors).
//
// ── HOW TO FIND VIDEO IDs ────────────────────────────────────
// Search YouTube for: "OnnoRokom Pathshala [topic in Bangla]"
// Channel: https://www.youtube.com/@onnorokompathshala
// Fallbacks: 10 Minute School (Bangla), Physics Gurukul (Bangla)
// All videoId values marked [FIND_ID] need to be looked up and replaced.
//
// ── SOURCES FOR FACT-CHECKING ────────────────────────────────
//   • NCTB HSC Physics 1st Paper (Chapters 2, 3, 4)
//   • HyperPhysics — Georgia State University
//   • OpenStax University Physics Vol.1 (openstax.org)
//   • Wikipedia (en.wikipedia.org)
//   • Khan Academy (khanacademy.org)
//
// Equations: LaTeX-style  \( ... \) inline,  \[ ... \] display
// ============================================================

const dynamics = {
  id: 'dynamics',
  name: 'Dynamics',
  description: 'গতিবিদ্যা ও নিউটনীয় বলবিদ্যা — NCTB HSC 1st Paper Chapters 2, 3 & 4. From describing motion in Bangla to explaining why motion happens, built from first principles.',
  icon: 'ri-rocket-2-line',
  prerequisiteTopicIds: [],

  // ── VIDEO SOURCE CREDIT (used by UI to display platform badge) ──
  primarySource: {
    name: 'OnnoRokom Pathshala',
    instructor: 'Ratul Khan',
    url: 'https://www.youtube.com/@onnorokompathshala',
  },

  skills: [

    // ══════════════════════════════════════════════════════════════
    // SKILL 1 — Language of Motion (গতির ভাষা)
    // NCTB Chapter 3 foundation — vocabulary before any equation
    // ══════════════════════════════════════════════════════════════
    {
      id: 'motion-language',
      name: 'Language of Motion',
      icon: 'ri-route-line',
      description: 'Scalars vs. vectors. Distance & displacement, speed & velocity, acceleration — the vocabulary before any equation.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [

        // ── LESSON 1.1 ─────────────────────────────────────────
        {
          id: 'displacement-velocity',
          title: 'Distance & Displacement, Speed & Velocity',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা-০১: দূরত্ব ও সরণ, দ্রুতি ও বেগ]',
          duration: '~15:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'dv-m1', label: 'Khan Academy — What is Displacement? (English visual)', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/displacement-velocity-time/a/what-is-displacement', type: 'link' },
            { id: 'dv-m2', label: 'HyperPhysics — Velocity and Speed', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/vel2.html', type: 'link' },
            { id: 'dv-m3', label: 'Displacement — Wikipedia', url: 'https://en.wikipedia.org/wiki/Displacement_(geometry)', type: 'link' },
          ],
          intro: 'A rickshaw in Dhaka travels 3 km north along Mirpur Road, then 4 km east toward Gulshan. The rickshaw covered 7 km of road — but ended up only 5 km from where it started (Pythagoras). That gap between "how far you went" (distance — scalar) and "where you ended up relative to start" (displacement — vector) is the foundation of all of kinematics. Speed is scalar; velocity is vector — same magnitude, completely different physical meaning.',
          questions: [
            {
              id: 'ml-q1', type: 'mcq',
              prompt: 'A rickshaw travels 3 km north, then 4 km east. The magnitude of its total displacement is:',
              options: ['7 km', '5 km', '1 km', '3.5 km'],
              correct: 1,
              explanation: 'Displacement = straight-line distance from start to end. By Pythagoras: \\(d = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5\\) km. The 7 km is total path length (distance), not displacement.',
            },
            {
              id: 'ml-q2', type: 'tap-correct',
              prompt: 'Select ALL quantities that are vectors (they have both magnitude AND direction):',
              options: ['Speed', 'Velocity', 'Distance', 'Displacement', 'Acceleration', 'Mass'],
              correct: [1, 3, 4],
              explanation: 'Vectors: velocity, displacement, acceleration — each needs a direction to be fully described. Scalars: speed, distance, mass — magnitude only.',
            },
            {
              id: 'ml-q3', type: 'mcq',
              prompt: 'A ball thrown straight upward returns to the same launch point. Its total displacement is:',
              options: ['Twice the maximum height', 'Equal to the maximum height', 'Zero', 'Negative'],
              correct: 2,
              explanation: 'Displacement = final position − initial position. The ball returns to its starting point, so the net change in position is zero. Total distance = 2 × maximum height; displacement = 0.',
            },
            {
              id: 'ml-q4', type: 'fill',
              prompt: 'The SI unit of velocity is ___ .',
              answer: 'm/s',
              aliases: ['ms-1', 'm s-1', 'metres per second', 'meters per second'],
              explanation: '\\(v = \\Delta x / \\Delta t\\). Units: metres ÷ seconds = m/s.',
            },
            {
              id: 'ml-q5', type: 'explain',
              prompt: 'A student runs one full lap around a 400 m athletics track. Explain the difference between the distance covered and the displacement. Why does this distinction matter in physics equations?',
              modelAnswer: 'Distance = 400 m (total path length, scalar). Displacement = 0 m (start and finish are the same point, vector). This matters because kinematic equations — such as \\(v^2 = u^2 + 2as\\) — use displacement \\(s\\), a vector. Using path length instead of displacement would give wrong answers whenever the direction of motion changes.',
            },
          ],
        },

        // ── LESSON 1.2 ─────────────────────────────────────────
        {
          id: 'acceleration-equations',
          title: 'Acceleration & Equations of Motion',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা-০২: ত্বরণ ও গতির সমীকরণ]',
          duration: '~18:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'eom-m1', label: 'Michel van Biezen — Kinematics: The 4 Equations of Motion (English derivation)', url: 'https://www.youtube.com/watch?v=ZM8ECpBuQYE', type: 'link' },
            { id: 'eom-m2', label: 'Khan Academy — Kinematic Equations (English)', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/kinematic-formulas/a/what-are-the-kinematic-formulas', type: 'link' },
            { id: 'eom-m3', label: 'HyperPhysics — Constant Acceleration', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/acons.html', type: 'link' },
          ],
          intro: 'A Dhaka metro train starts from rest at Uttara North station and reaches 72 km/h before Uttara Center. Acceleration is not "going fast" — it is the *rate of change of velocity*: \\(a = \\Delta v / \\Delta t\\). The four kinematic equations are not separate facts to memorise — they are all derived from this one definition. Start from \\(a = \\Delta v / \\Delta t\\) and everything follows algebraically.',
          questions: [
            {
              id: 'eom-q1', type: 'mcq',
              prompt: 'Which kinematic equation does NOT contain acceleration \\(a\\)?',
              options: ['\\(v = u + at\\)', '\\(s = ut + \\frac{1}{2}at^2\\)', '\\(s = \\frac{(u+v)}{2} \\cdot t\\)', '\\(v^2 = u^2 + 2as\\)'],
              correct: 2,
              explanation: '\\(s = \\frac{(u+v)}{2} \\cdot t\\) is derived by eliminating \\(a\\) between the first two equations. It uses only average velocity × time — no \\(a\\) appears.',
            },
            {
              id: 'eom-q2', type: 'fill',
              prompt: 'A metro train starts from rest and reaches 72 km/h in 10 s. Its acceleration = ___ m/s².',
              answer: '2',
              aliases: ['2.0', '2 m/s²'],
              explanation: '72 km/h = 20 m/s. Using \\(a = (v - u)/t = (20 - 0)/10 = 2\\) m/s².',
            },
            {
              id: 'eom-q3', type: 'mcq',
              prompt: 'A stone is dropped from rest and falls for 3 s. Distance fallen? (\\(g = 9.8\\) m/s²)',
              options: ['~29.4 m', '~44.1 m', '~14.7 m', '~88.2 m'],
              correct: 1,
              explanation: 'Using \\(s = ut + \\frac{1}{2}at^2\\) with \\(u = 0\\): \\(s = \\frac{1}{2} \\times 9.8 \\times 3^2 = 4.9 \\times 9 = 44.1\\) m. (NCTB uses g = 9.8 m/s²; some problems use g = 10 m/s² for round numbers — always check the question.)',
            },
            {
              id: 'eom-q4', type: 'mcq',
              prompt: 'A CNG auto-rickshaw decelerates from 20 m/s to rest over 50 m. Magnitude of deceleration?',
              options: ['2 m/s²', '4 m/s²', '8 m/s²', '0.4 m/s²'],
              correct: 1,
              explanation: 'Using \\(v^2 = u^2 + 2as\\): \\(0 = 400 + 2a(50) \\Rightarrow a = -4\\) m/s². Magnitude = 4 m/s².',
            },
            {
              id: 'eom-q5', type: 'explain',
              prompt: 'Derive \\(v^2 = u^2 + 2as\\) from the other kinematic equations. Show every algebraic step.',
              modelAnswer: 'From \\(v = u + at\\), rearrange for \\(t\\): \\(t = (v - u)/a\\).\nSubstitute into \\(s = ut + \\frac{1}{2}at^2\\):\n\\(s = u \\cdot \\frac{v-u}{a} + \\frac{1}{2}a \\cdot \\frac{(v-u)^2}{a^2}\\)\nMultiply both sides by \\(2a\\):\n\\(2as = 2u(v-u) + (v-u)^2 = 2uv - 2u^2 + v^2 - 2uv + u^2 = v^2 - u^2\\)\nTherefore: \\(v^2 = u^2 + 2as\\).',
            },
          ],
        },

        // ── LESSON 1.3 ─────────────────────────────────────────
        {
          id: 'velocity-time-graphs',
          title: 'Velocity–Time Graphs (লেখচিত্র)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা: বেগ-সময় লেখচিত্র]',
          duration: '~12:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'vtg-m1', label: 'Khan Academy — Velocity vs. Time Graphs (English)', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/acceleration-tutorial/a/what-are-velocity-vs-time-graphs', type: 'link' },
            { id: 'vtg-m2', label: 'HyperPhysics — Graphical Analysis', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/mechanics/motgraph.html', type: 'link' },
          ],
          intro: 'A launch (লঞ্চ) leaves Sadarghat: it accelerates for 5 minutes, holds constant speed across the Buriganga, then decelerates as it approaches Chandpur. Draw this as a velocity-time graph. The slope of each segment = acceleration. The area under the curve = displacement. A v-t graph encodes everything — learn to read it.',
          questions: [
            {
              id: 'vtg-q1', type: 'mcq',
              prompt: 'On a velocity–time graph, the slope of the line represents:',
              options: ['Displacement', 'Distance', 'Acceleration', 'Speed'],
              correct: 2,
              explanation: 'Slope = \\(\\Delta v / \\Delta t = a\\) — directly the definition of acceleration.',
            },
            {
              id: 'vtg-q2', type: 'mcq',
              prompt: 'On a v–t graph, the area enclosed between the curve and the time axis represents:',
              options: ['Acceleration', 'Displacement', 'Force', 'Momentum'],
              correct: 1,
              explanation: 'Area under v–t curve = \\(\\int v\\,dt = s\\) (displacement). For a trapezoidal region: area = \\(\\frac{(u+v)}{2} \\cdot t = s\\).',
            },
            {
              id: 'vtg-q3', type: 'mcq',
              prompt: 'A body\'s v–t graph is a horizontal straight line at \\(v = 15\\) m/s. This means:',
              options: ['The body is stationary', 'The body accelerates at 15 m/s²', 'The body moves at constant velocity, zero acceleration', 'The body decelerates'],
              correct: 2,
              explanation: 'Horizontal line → slope = 0 → acceleration = 0. A non-zero constant v means uniform motion.',
            },
            {
              id: 'vtg-q4', type: 'mcq',
              prompt: 'In a v–t graph, a line with negative slope from a positive velocity down to zero represents:',
              options: ['Uniform acceleration', 'Uniform deceleration to rest', 'Uniform velocity', 'Free fall upward'],
              correct: 1,
              explanation: 'Negative slope = negative acceleration = deceleration. The object was moving (positive v), slowed uniformly, and stopped (v = 0).',
            },
          ],
        },

        // ── LESSON 1.4 ─────────────────────────────────────────
        {
          id: 'free-fall',
          title: 'Free Fall & Galileo\'s Laws (মুক্তভাবে পড়ন্ত বস্তু)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — মুক্তভাবে পড়ন্ত বস্তু এবং গ্যালিলিওর পড়ন্ত বস্তুর সূত্র]',
          duration: '~14:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'ff-m1', label: 'Walter Lewin (MIT OCW) — Free Fall & Pendulum Demos (English — legendary demonstration)', url: 'https://www.youtube.com/watch?v=sLkRMalDyxA', type: 'link' },
            { id: 'ff-m2', label: 'Khan Academy — Introduction to Free Fall (English)', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/kinematic-formulas/a/acceleration-article', type: 'link' },
          ],
          intro: 'A ripe mango falls from a tree 20 m above the ground in Sylhet. How long until it hits? No horizontal force, no air resistance — only gravity, pulling it downward at g = 9.8 m/s². Galileo proved (against the intuition of his time) that heavy and light objects fall identically in the absence of air. This single insight unified kinematics with dynamics.',
          questions: [
            {
              id: 'ff-q1', type: 'fill',
              prompt: 'A mango falls from rest from a 20 m tree. Time to reach the ground: ___ s. (g = 9.8 m/s²)',
              answer: '2.02',
              aliases: ['~2 s', '2.0', '2'],
              explanation: '\\(s = \\frac{1}{2}gt^2 \\Rightarrow 20 = \\frac{1}{2}(9.8)t^2 \\Rightarrow t^2 = 4.08 \\Rightarrow t \\approx 2.02\\) s.',
            },
            {
              id: 'ff-q2', type: 'mcq',
              prompt: 'A cricket ball and a feather are dropped simultaneously in a vacuum. Which hits the ground first?',
              options: ['The cricket ball — it is heavier', 'The feather — it is lighter so less gravity acts', 'They hit at exactly the same time', 'It depends on the height dropped from'],
              correct: 2,
              explanation: 'In a vacuum, there is no air resistance. All objects accelerate at \\(g\\) regardless of mass — the greater gravitational pull on the ball is exactly cancelled by its greater inertia. Galileo demonstrated this.',
            },
            {
              id: 'ff-q3', type: 'mcq',
              prompt: 'A ball is thrown straight upward at 19.6 m/s. Time to reach maximum height? (g = 9.8 m/s²)',
              options: ['1 s', '2 s', '4 s', '3 s'],
              correct: 1,
              explanation: 'At maximum height, \\(v = 0\\). Using \\(v = u - gt\\): \\(0 = 19.6 - 9.8t \\Rightarrow t = 2\\) s.',
            },
            {
              id: 'ff-q4', type: 'explain',
              prompt: 'State Galileo\'s three laws for freely falling bodies and show how each follows from the kinematic equations.',
              modelAnswer: '1. A freely falling body starts from rest and falls with uniform acceleration g.\n→ From \\(v = u + gt\\) with \\(u = 0\\): \\(v = gt\\) — velocity increases linearly.\n2. The distance fallen in successive equal time intervals are in the ratio 1:3:5:7... (odd numbers).\n→ Distance in 1st second: \\(s_1 = \\frac{1}{2}g(1)^2\\). In 2nd: \\(s_2 = \\frac{1}{2}g(4) - \\frac{1}{2}g(1) = \\frac{3}{2}g\\). Ratio 1:3:5 confirmed.\n3. Distances fallen from rest in 1, 2, 3... seconds are in the ratio 1:4:9... (squares of integers).\n→ \\(s = \\frac{1}{2}gt^2\\), so \\(s_1 : s_2 : s_3 = 1 : 4 : 9\\).',
            },
          ],
        },

      ], // end Skill 1 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 2 — Vectors in Motion (ভেক্টর ও গতি)
    // NCTB Chapter 2 — prerequisite to all vector-based dynamics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'vectors-motion',
      name: 'Vectors in Motion',
      icon: 'ri-arrow-right-up-line',
      description: 'Vector addition, resolution, and relative velocity. The prerequisite before projectile motion and circular motion.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [

        // ── LESSON 2.1 ─────────────────────────────────────────
        {
          id: 'vector-addition',
          title: 'Vector Addition & Resolution (ভেক্টরের যোগ ও বিভাজন)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ভেক্টর: যোগ ও বিয়োগ, বিভাজন]',
          duration: '~16:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'va-m1', label: 'Khan Academy — Adding Vectors (English)', url: 'https://www.khanacademy.org/math/precalculus/x9e81a4f98389efdf:vectors/x9e81a4f98389efdf:vector-addition-subtraction/a/adding-vectors', type: 'link' },
            { id: 'va-m2', label: 'Vectors — Wikipedia', url: 'https://en.wikipedia.org/wiki/Vector_(mathematics_and_physics)', type: 'link' },
          ],
          intro: 'A boat wants to cross the Buriganga river. Its engine pushes it east at 5 m/s — but the river flows south at 3 m/s. What is the boat\'s actual velocity relative to the riverbank? To find out, you must add two vectors — not just their magnitudes. The parallelogram law and triangle law are the two tools. Resolution into components (horizontal and vertical) is how every projectile, circular motion, and inclined plane problem starts.',
          questions: [
            {
              id: 'va-q1', type: 'fill',
              prompt: 'A boat moves east at 5 m/s relative to water. River current is 3 m/s south. Magnitude of resultant velocity = ___ m/s.',
              answer: '\\(\\sqrt{34}\\)',
              aliases: ['√34', '5.83', '~5.83'],
              explanation: 'Velocities are perpendicular. Resultant = \\(\\sqrt{5^2 + 3^2} = \\sqrt{34} \\approx 5.83\\) m/s.',
            },
            {
              id: 'va-q2', type: 'mcq',
              prompt: 'The parallelogram law of vector addition states that if two vectors are represented by adjacent sides of a parallelogram, their resultant is given by:',
              options: ['The sum of the two sides', 'The diagonal drawn from the same corner as the two vectors', 'Either diagonal of the parallelogram', 'The perimeter of the parallelogram'],
              correct: 1,
              explanation: 'The diagonal from the tail of both vectors to the opposite corner gives the resultant — direction and magnitude both included.',
            },
            {
              id: 'va-q3', type: 'mcq',
              prompt: 'A force of 10 N acts at 30° to the horizontal. Its horizontal component is:',
              options: ['5 N', '\\(5\\sqrt{3}\\) N ≈ 8.66 N', '10 N', '\\(10\\sqrt{3}\\) N'],
              correct: 1,
              explanation: 'Horizontal component = \\(F\\cos\\theta = 10\\cos 30° = 10 \\times \\frac{\\sqrt{3}}{2} = 5\\sqrt{3} \\approx 8.66\\) N.',
            },
            {
              id: 'va-q4', type: 'mcq',
              prompt: 'What is the minimum number of unequal vectors that can give a zero resultant?',
              options: ['2', '3', '4', '1'],
              correct: 1,
              explanation: 'Three vectors forming a closed triangle give a zero resultant — each vector\'s head meets the next vector\'s tail. Two unequal vectors can only give zero if they are equal and opposite (contradicting "unequal"), so three is the minimum.',
            },
          ],
        },

        // ── LESSON 2.2 ─────────────────────────────────────────
        {
          id: 'relative-velocity',
          title: 'Relative Velocity & River-Boat Problems (আপেক্ষিক বেগ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — আপেক্ষিক বেগ ও নৌকা-নদী সমস্যা]',
          duration: '~18:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'rv-m1', label: 'Khan Academy — Relative Velocity and Riverboat Problems (English)', url: 'https://www.khanacademy.org/science/physics/two-dimensional-motion/relative-velocity-and-relative-motion/v/relative-velocity-and-riverboat-problems', type: 'link' },
            { id: 'rv-m2', label: 'Relative Velocity — Wikipedia', url: 'https://en.wikipedia.org/wiki/Relative_velocity', type: 'link' },
          ],
          intro: 'A boatman on the Padma river. The boat can do 5 m/s in still water. The river flows at 3 m/s. Two classic problems: \n\n1. Minimum time crossing → point the boat straight across (perpendicular to banks). You drift downstream but cross fastest.\n2. Minimum drift → angle the boat upstream so the resultant velocity is perpendicular to the banks. Takes longer but you land exactly opposite.\n\nVelocity of A relative to B: \\(\\vec{v}_{AB} = \\vec{v}_A - \\vec{v}_B\\). This rule underlies both cases.',
          questions: [
            {
              id: 'rv-q1', type: 'mcq',
              prompt: 'A boat does 5 m/s in still water. River current is 3 m/s. Boat heads straight across. Resultant speed relative to ground?',
              options: ['8 m/s', '2 m/s', '\\(\\sqrt{34} \\approx 5.83\\) m/s', '4 m/s'],
              correct: 2,
              explanation: 'Boat speed (5 m/s, perpendicular to current) and current (3 m/s, along bank) are at right angles. \\(v = \\sqrt{5^2 + 3^2} = \\sqrt{34} \\approx 5.83\\) m/s.',
            },
            {
              id: 'rv-q2', type: 'mcq',
              prompt: 'To cross the Padma river in MINIMUM TIME, the boat should be directed:',
              options: ['Upstream at some angle', 'Straight across — perpendicular to the banks', 'Downstream at some angle', 'At 45° to the bank'],
              correct: 1,
              explanation: 'Crossing time \\(t = d / v_{\\perp}\\). Perpendicular component \\(v_{\\perp}\\) is maximised when the boat points straight across (\\(v_{\\perp} = v_{\\text{boat}}\\)). Some downstream drift occurs, but the crossing time is minimised.',
            },
            {
              id: 'rv-q3', type: 'mcq',
              prompt: 'To cross with MINIMUM DRIFT, the boat must be angled:',
              options: ['Downstream', 'Straight across', 'Upstream such that the resultant velocity is perpendicular to the banks', 'At 45° upstream'],
              correct: 2,
              explanation: 'For zero drift, the resultant velocity must point straight across. Since the current pushes downstream, the boat must angle upstream. The angle \\(\\theta = \\sin^{-1}(v_{\\text{current}}/v_{\\text{boat}})\\) upstream from perpendicular. This is only possible if \\(v_{\\text{boat}} > v_{\\text{current}}\\).',
            },
            {
              id: 'rv-q4', type: 'mcq',
              prompt: 'Train A moves east at 60 km/h. Train B moves west at 40 km/h. Velocity of A relative to B?',
              options: ['20 km/h east', '100 km/h east', '100 km/h west', '20 km/h west'],
              correct: 1,
              explanation: 'Taking east as positive: \\(\\vec{v}_{AB} = \\vec{v}_A - \\vec{v}_B = +60 - (-40) = +100\\) km/h = 100 km/h east.',
            },
            {
              id: 'rv-q5', type: 'explain',
              prompt: 'A boat can travel at 8 m/s in still water. A river flows at 6 m/s. (a) Find the minimum time to cross a 160 m wide river. (b) Find the drift in that crossing.',
              modelAnswer: '(a) For minimum time, point straight across. Perpendicular speed = 8 m/s.\n\\(t = d / v_{\\perp} = 160 / 8 = 20\\) s.\n(b) Drift = current speed × time = 6 × 20 = 120 m downstream.',
            },
          ],
        },

      ], // end Skill 2 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 3 — Projectile Motion (প্রাস)
    // NCTB Chapter 3 — requires Skills 1 & 2
    // ══════════════════════════════════════════════════════════════
    {
      id: 'projectile-motion',
      name: 'Projectile Motion (প্রাস)',
      icon: 'ri-send-plane-2-line',
      description: 'Range, time of flight, maximum height — derived from first principles. Parabolic trajectory proof.',
      tier: 2,
      prerequisiteIds: ['motion-language', 'vectors-motion'],
      lessons: [

        // ── LESSON 3.1 ─────────────────────────────────────────
        {
          id: 'projectile-basics',
          title: 'Projectile Motion — The Two-Component Idea',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা-০৩: প্রাসের প্রাথমিক ধারণা]',
          duration: '~15:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'pb-m1', label: 'Khan Academy — What is 2D Projectile Motion? (English)', url: 'https://www.khanacademy.org/science/physics/two-dimensional-motion/two-dimensional-projectile-mot/a/what-is-2d-projectile-motion', type: 'link' },
            { id: 'pb-m2', label: 'Projectile Motion — Wikipedia', url: 'https://en.wikipedia.org/wiki/Projectile_motion', type: 'link' },
          ],
          intro: 'A cricket fielder at Sher-e-Bangla National Stadium throws the ball at an angle. Horizontally — no force acts (ignoring air), so horizontal velocity \\(v_x = u\\cos\\theta\\) stays constant throughout. Vertically — gravity acts downward at g, so vertical velocity changes at rate g. These two motions are completely independent of each other. That independence is the key insight — once you see it, every projectile problem becomes two separate 1D problems.',
          questions: [
            {
              id: 'pm-q1', type: 'mcq',
              prompt: 'In projectile motion (no air resistance), which velocity component stays constant throughout the flight?',
              options: ['Vertical component', 'Horizontal component', 'Both components', 'Neither — both change'],
              correct: 1,
              explanation: 'No horizontal force acts → \\(a_x = 0\\). By Newton\'s first law, horizontal velocity \\(v_x = u\\cos\\theta\\) remains constant throughout.',
            },
            {
              id: 'pm-q2', type: 'mcq',
              prompt: 'A ball is thrown horizontally at 20 m/s from a 45 m high cliff. Time to reach the ground? (g = 9.8 m/s²)',
              options: ['2 s', '~3.03 s', '4 s', '4.5 s'],
              correct: 1,
              explanation: 'Vertical only: \\(s = \\frac{1}{2}gt^2 \\Rightarrow 45 = \\frac{1}{2}(9.8)t^2 \\Rightarrow t^2 = 9.18 \\Rightarrow t \\approx 3.03\\) s. Horizontal speed does not affect fall time.',
            },
            {
              id: 'pm-q3', type: 'mcq',
              prompt: 'At the highest point of a projectile\'s trajectory:',
              options: [
                'Both velocity components are zero — the projectile is stationary',
                'Only the vertical velocity component is zero',
                'Only the horizontal velocity component is zero',
                'The projectile momentarily reverses direction',
              ],
              correct: 1,
              explanation: 'At maximum height, the vertical velocity reverses direction → \\(v_y = 0\\) at that instant. The horizontal velocity \\(v_x = u\\cos\\theta\\) is unaffected and remains non-zero (unless launched vertically at \\(\\theta = 90°\\)).',
            },
          ],
        },

        // ── LESSON 3.2 ─────────────────────────────────────────
        {
          id: 'projectile-formulas',
          title: 'Time of Flight, Max Height & Range — Derivations (সূত্র সমূহ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা-০৫: প্রাসের সূত্র সমূহ বিচরণকাল, সর্বাধিক উচ্চতা ও অনুভূমিক পাল্লা]',
          duration: '~20:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'pf-m1', label: 'Professor Leonard — Projectile Motion (English — detailed derivation)', url: 'https://www.youtube.com/watch?v=ou9YMWlJgkE', type: 'link' },
            { id: 'pf-m2', label: 'OpenStax — Projectile Motion (English)', url: 'https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion', type: 'link' },
          ],
          intro: 'Three results — derive them, don\'t memorise them:\n• Time of flight: \\(T = \\frac{2u\\sin\\theta}{g}\\)\n• Maximum height: \\(H = \\frac{u^2\\sin^2\\theta}{2g}\\)\n• Horizontal range: \\(R = \\frac{u^2\\sin 2\\theta}{g}\\)\n\nEach follows from applying kinematic equations separately to vertical and horizontal motions. NCTB creative questions frequently ask: "Derive the expression for range." That means you must be able to produce the derivation yourself — step by step.',
          questions: [
            {
              id: 'pf-q1', type: 'fill',
              prompt: 'A projectile launched at 30° with \\(u = 40\\) m/s. Time of flight \\(T\\) = ___ s. (g = 9.8 m/s²)',
              answer: '4.08',
              aliases: ['~4.08', '4.1', '~4.1'],
              explanation: '\\(T = \\frac{2u\\sin\\theta}{g} = \\frac{2 \\times 40 \\times \\sin 30°}{9.8} = \\frac{2 \\times 40 \\times 0.5}{9.8} = \\frac{40}{9.8} \\approx 4.08\\) s.',
            },
            {
              id: 'pf-q2', type: 'mcq',
              prompt: 'Two projectiles launched at the same speed — one at 30°, one at 60°. Their horizontal ranges are:',
              options: ['60° has greater range', '30° has greater range', 'Equal', 'Cannot be determined'],
              correct: 2,
              explanation: '\\(R = \\frac{u^2\\sin 2\\theta}{g}\\). For 30°: \\(\\sin 60° \\approx 0.866\\). For 60°: \\(\\sin 120° = \\sin 60° \\approx 0.866\\). Equal — complementary angles (summing to 90°) always give the same range.',
            },
            {
              id: 'pf-q3', type: 'mcq',
              prompt: 'For maximum horizontal range, a projectile should be launched at:',
              options: ['30°', '45°', '60°', '90°'],
              correct: 1,
              explanation: '\\(R = \\frac{u^2\\sin 2\\theta}{g}\\) is maximised when \\(\\sin 2\\theta = 1\\), i.e., \\(2\\theta = 90°\\), so \\(\\theta = 45°\\).',
            },
            {
              id: 'pf-q4', type: 'mcq',
              prompt: 'At 45° launch angle, the ratio of maximum height \\(H\\) to horizontal range \\(R\\) is:',
              options: ['\\(H = R\\)', '\\(H = R/4\\)', '\\(H = 2R\\)', '\\(H = R/2\\)'],
              correct: 1,
              explanation: 'At 45°: \\(H = \\frac{u^2\\sin^2 45°}{2g} = \\frac{u^2}{4g}\\) and \\(R = \\frac{u^2\\sin 90°}{g} = \\frac{u^2}{g}\\). So \\(H = R/4\\).',
            },
            {
              id: 'pf-q5', type: 'explain',
              prompt: 'Derive the expression for horizontal range \\(R = \\frac{u^2 \\sin 2\\theta}{g}\\) from first principles.',
              modelAnswer: 'The projectile returns to the same horizontal level (ground). Set vertical displacement = 0:\n\\(0 = u\\sin\\theta \\cdot T - \\frac{1}{2}gT^2\\)\nDivide through by \\(T\\): \\(0 = u\\sin\\theta - \\frac{1}{2}gT\\)\nSolve: \\(T = \\frac{2u\\sin\\theta}{g}\\)\n\nHorizontal velocity is constant: \\(v_x = u\\cos\\theta\\). So:\n\\(R = u\\cos\\theta \\times T = u\\cos\\theta \\times \\frac{2u\\sin\\theta}{g} = \\frac{2u^2\\sin\\theta\\cos\\theta}{g}\\)\nUsing identity \\(2\\sin\\theta\\cos\\theta = \\sin 2\\theta\\):\n\\(R = \\frac{u^2\\sin 2\\theta}{g}\\).',
            },
          ],
        },

        // ── LESSON 3.3 ─────────────────────────────────────────
        {
          id: 'projectile-trajectory',
          title: 'Trajectory is a Parabola — Proof (পথরেখা অধিবৃত্তাকার)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — গতিবিদ্যা: প্রাসের গতিপথ অধিবৃত্তাকার]',
          duration: '~12:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'pt-m1', label: 'Projectile Motion — Derivations (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Projectile_motion#Derivations', type: 'link' },
          ],
          intro: 'NCTB creative questions regularly ask: "Show that the path of a projectile is a parabola." This is a dedicated derivation — you eliminate time \\(t\\) from the \\(x\\) and \\(y\\) equations and show that \\(y\\) is a quadratic function of \\(x\\), which is the definition of a parabola.',
          questions: [
            {
              id: 'pt-q1', type: 'explain',
              prompt: 'Derive the trajectory equation of a projectile and show that it is a parabola.',
              modelAnswer: 'Horizontal: \\(x = u\\cos\\theta \\cdot t \\Rightarrow t = \\frac{x}{u\\cos\\theta}\\)\n\nVertical: \\(y = u\\sin\\theta \\cdot t - \\frac{1}{2}gt^2\\)\n\nSubstitute \\(t\\):\n\\(y = u\\sin\\theta \\cdot \\frac{x}{u\\cos\\theta} - \\frac{1}{2}g\\left(\\frac{x}{u\\cos\\theta}\\right)^2\\)\n\n\\(y = x\\tan\\theta - \\frac{g}{2u^2\\cos^2\\theta}x^2\\)\n\nThis is of the form \\(y = Ax - Bx^2\\) where \\(A = \\tan\\theta\\) and \\(B = \\frac{g}{2u^2\\cos^2\\theta}\\) are constants. Since \\(y\\) is a quadratic function of \\(x\\), the trajectory is a parabola.',
            },
            {
              id: 'pt-q2', type: 'mcq',
              prompt: 'In the trajectory equation \\(y = x\\tan\\theta - \\frac{g}{2u^2\\cos^2\\theta}x^2\\), the trajectory is a parabola because:',
              options: [
                '\\(x\\) appears to the first power only',
                '\\(y\\) is a quadratic (degree 2) function of \\(x\\) with a negative coefficient for \\(x^2\\)',
                '\\(g\\) is constant',
                'The horizontal velocity is constant',
              ],
              correct: 1,
              explanation: 'A parabola is defined by an equation of the form \\(y = Ax + Bx^2\\). The \\(x^2\\) term with a negative coefficient gives the characteristic downward-curving shape. The trajectory is a downward-opening parabola.',
            },
          ],
        },

      ], // end Skill 3 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 4 — Newton's Laws of Motion (নিউটনের গতিসূত্র)
    // NCTB Chapter 4 — requires Skill 1
    // ══════════════════════════════════════════════════════════════
    {
      id: 'newtons-laws',
      name: "Newton's Laws of Motion",
      icon: 'ri-arrow-right-circle-line',
      description: 'Inertia, F = ma from momentum, the horse-cart paradox, action-reaction pairs.',
      tier: 2,
      prerequisiteIds: ['motion-language'],
      lessons: [

        // ── LESSON 4.1 ─────────────────────────────────────────
        {
          id: 'newton-first',
          title: "Newton's First Law — Inertia (জড়তা)",
          videoId: '[FIND_ID: OnnoRokom Pathshala — নিউটনের প্রথম সূত্র ও জড়তা]',
          duration: '~14:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'n1-m1', label: 'Khan Academy — Newton\'s First Law (English)', url: 'https://www.khanacademy.org/science/physics/forces-newtons-laws/newtons-laws-of-motion/a/what-is-newtons-first-law', type: 'link' },
            { id: 'n1-m2', label: 'HyperPhysics — Newton\'s Laws', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/Newt.html', type: 'link' },
          ],
          intro: 'A bus in Dhaka brakes hard — passengers lurch forward. Nobody pushed them forward. Their bodies were moving at the bus\'s speed; with no direct backward force acting on them, they continue forward by inertia. A blanket beaten with a stick — dust falls off. The blanket moves; the dust, being at rest, stays behind. Both are the same property: resistance to change in motion state. Newton\'s First Law: an object remains at rest or in uniform straight-line motion unless acted on by a net external force.',
          questions: [
            {
              id: 'n1-q1', type: 'mcq',
              prompt: "Newton's First Law is also called the Law of:",
              options: ['Momentum', 'Inertia', 'Action-Reaction', 'Conservation of Energy'],
              correct: 1,
              explanation: "A body persists in its state of rest or uniform straight-line motion unless a net external force acts. This resistance to change is called inertia.",
            },
            {
              id: 'n1-q2', type: 'tap-correct',
              prompt: 'Select ALL examples of inertia of REST (a stationary object resisting being set in motion):',
              options: [
                'Passenger lurches backward when a bus suddenly starts moving',
                'Passenger lurches forward when a bus brakes hard',
                'Tablecloth pulled quickly — plates stay on the table',
                'Ball continuing to roll on a frictionless surface',
                'Dust falls off a blanket when beaten with a stick',
              ],
              correct: [0, 2, 4],
              explanation: 'Inertia of rest (0, 2, 4): stationary objects resist being set in motion — dust, plates, and the standing passenger in a bus starting from rest. Inertia of motion (1, 3): moving objects resist being stopped. Both are the same property.',
            },
            {
              id: 'n1-q3', type: 'explain',
              prompt: "A bus brakes suddenly and a standing passenger lurches forward. No one pushed them. Explain using Newton's First Law.",
              modelAnswer: "Newton's First Law: a body in motion continues at the same velocity unless a net external force acts. The bus decelerates because a braking force acts on the bus. However, no corresponding backward force acts directly on the passenger's body at that instant. By inertia, the passenger's body continues at the bus's original forward velocity while the bus slows — so the passenger appears to lurch forward relative to the decelerating bus.",
            },
          ],
        },

        // ── LESSON 4.2 ─────────────────────────────────────────
        {
          id: 'newton-second',
          title: "Newton's Second Law — F = ma (from Momentum)",
          videoId: '[FIND_ID: OnnoRokom Pathshala — নিউটনের দ্বিতীয় সূত্র ও বল]',
          duration: '~16:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'n2-m1', label: 'Walter Lewin MIT OCW — Forces and Newton\'s Laws (English — classic demonstrations)', url: 'https://www.youtube.com/watch?v=p_o4aY7xkXg', type: 'link' },
            { id: 'n2-m2', label: "OpenStax — Newton's Second Law (English)", url: 'https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law', type: 'link' },
          ],
          intro: 'The net force on an object equals the rate of change of its linear momentum: \\(\\vec{F}_{\\text{net}} = \\frac{\\Delta\\vec{p}}{\\Delta t}\\). For constant mass this reduces to \\(\\vec{F} = m\\vec{a}\\). The momentum form is more fundamental — it covers variable-mass systems like rockets too. Compare pushing a bicycle vs. a loaded truck with the same force: same force, less mass → more acceleration.',
          questions: [
            {
              id: 'n2-q1', type: 'fill',
              prompt: 'A net force of 30 N acts on a 6 kg object. Its acceleration = ___ m/s².',
              answer: '5',
              aliases: ['5.0', '5 m/s²'],
              explanation: '\\(a = F_{\\text{net}} / m = 30 / 6 = 5\\) m/s².',
            },
            {
              id: 'n2-q2', type: 'mcq',
              prompt: 'A 2000 kg truck accelerates from rest to 20 m/s in 10 s. Net force on it:',
              options: ['200 N', '2000 N', '4000 N', '40 000 N'],
              correct: 2,
              explanation: '\\(a = (v - u)/t = (20 - 0)/10 = 2\\) m/s². \\(F = ma = 2000 \\times 2 = 4000\\) N.',
            },
            {
              id: 'n2-q3', type: 'mcq',
              prompt: 'In \\(F = \\Delta p / \\Delta t\\), what does \\(\\Delta p\\) represent?',
              options: ['Change in position', 'Change in momentum', 'Change in potential energy', 'Change in pressure'],
              correct: 1,
              explanation: '\\(p = mv\\) is linear momentum (kg·m/s). \\(\\Delta p = m(v - u)\\) for constant mass. \\(F = \\Delta p / \\Delta t\\) is the primary form; \\(F = ma\\) is the special case for constant mass.',
            },
            {
              id: 'n2-q4', type: 'explain',
              prompt: 'The same net force is applied for the same duration to a cricket ball (0.156 kg) and a football (0.43 kg). Which gains more acceleration? By how much? Use \\(F = ma\\).',
              modelAnswer: 'Same force, same time → same impulse \\(J = F\\Delta t\\) → same \\(\\Delta p\\). However, \\(a = F/m\\). Smaller mass → larger acceleration.\n\\(a_{\\text{cricket}} / a_{\\text{football}} = m_{\\text{football}} / m_{\\text{cricket}} = 0.43 / 0.156 \\approx 2.76\\).\nThe cricket ball accelerates about 2.76 times more.',
            },
          ],
        },

        // ── LESSON 4.3 ─────────────────────────────────────────
        {
          id: 'newton-third',
          title: "Newton's Third Law — Action & Reaction (ক্রিয়া ও প্রতিক্রিয়া)",
          videoId: '[FIND_ID: OnnoRokom Pathshala — নিউটনের তৃতীয় সূত্র]',
          duration: '~13:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'n3-m1', label: "Khan Academy — Newton's Third Law (English)", url: 'https://www.khanacademy.org/science/physics/forces-newtons-laws/newtons-laws-of-motion/a/newtons-third-law-of-motion', type: 'link' },
            { id: 'n3-m2', label: "Newton's Third Law — Wikipedia", url: "https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion#Third_law", type: 'link' },
          ],
          intro: 'The horse pulls the cart forward. The cart pulls the horse backward with equal force. So why does the system accelerate? Action-reaction pairs act on DIFFERENT objects — they can never cancel. The horse also pushes the ground backward with its hooves; the ground pushes the horse forward (friction) — a separate third-law pair. If that ground reaction exceeds friction at the cart wheels, the system accelerates forward.',
          questions: [
            {
              id: 'n3-q1', type: 'mcq',
              prompt: 'You push a wall with 50 N. The wall pushes back on you with:',
              options: ['0 N', '25 N', '50 N', '100 N'],
              correct: 2,
              explanation: "Newton's Third Law: forces always occur in equal-and-opposite pairs. The wall exerts exactly 50 N on you, directed away from the wall.",
            },
            {
              id: 'n3-q2', type: 'mcq',
              prompt: "If the cart pulls the horse backward equally, why does the horse-cart system move forward?",
              options: [
                "The horse's force is slightly larger in practice",
                "Action-reaction forces act on DIFFERENT objects — they cannot cancel each other. The ground pushes the horse forward via friction — a separate pair",
                "The cart's pull cancels out over time",
                "Newton's Third Law doesn't apply here",
              ],
              correct: 1,
              explanation: "Action-reaction pairs act on different objects and can never cancel. Two separate pairs: (1) Horse pulls cart forward; cart pulls horse backward. (2) Horse's hooves push ground backward; ground pushes horse forward (friction). If this friction force exceeds the rolling resistance at the wheels, the whole system accelerates.",
            },
            {
              id: 'n3-q3', type: 'mcq',
              prompt: "Which of the following is NOT a Newton's Third Law pair?",
              options: [
                'Earth pulls book downward; book pulls Earth upward',
                'Table pushes book upward (normal); book pushes table downward',
                "Weight of book downward and table's normal force upward — both acting on the book",
                'Rocket pushes exhaust backward; exhaust pushes rocket forward',
              ],
              correct: 2,
              explanation: "Weight (Earth's pull on book) and normal force (table's push on book) both act on the SAME object — the book. A Third Law pair always involves forces on TWO DIFFERENT objects. Weight and normal may be equal in magnitude here, but they are not a Third Law pair.",
            },
            {
              id: 'n3-q4', type: 'explain',
              prompt: "Using Newton's Third Law, explain how a rocket accelerates in the vacuum of space where there is no air to 'push against'.",
              modelAnswer: "The rocket burns fuel and expels exhaust gases backward at high speed. By Newton's Third Law, the rocket exerts a backward force on the exhaust; the exhaust exerts an equal and opposite forward force on the rocket. This is a Third Law pair — the rocket doesn't need anything external to push against. By conservation of momentum: initial total momentum = 0 (at rest). The backward momentum of exhaust equals the forward momentum gained by the rocket.",
            },
          ],
        },

      ], // end Skill 4 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 5 — Momentum, Impulse & Collisions
    // NCTB Chapter 4 — requires Skill 4
    // ══════════════════════════════════════════════════════════════
    {
      id: 'momentum-collisions',
      name: 'Momentum, Impulse & Collisions',
      icon: 'ri-exchange-funds-line',
      description: 'Conservation of momentum, impulse, elastic and inelastic collisions. Gun recoil, catching a cricket ball.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        // ── LESSON 5.1 ─────────────────────────────────────────
        {
          id: 'momentum-conservation',
          title: 'Conservation of Linear Momentum (রৈখিক ভরবেগের সংরক্ষণ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ভরবেগের সংরক্ষণ সূত্র]',
          duration: '~19:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'mc-m1', label: 'Khan Academy — Conservation of Momentum (English)', url: 'https://www.khanacademy.org/science/physics/linear-momentum/momentum-tutorial/a/what-is-conservation-of-momentum', type: 'link' },
            { id: 'mc-m2', label: 'Conservation of Momentum — Wikipedia', url: 'https://en.wikipedia.org/wiki/Momentum#Conservation', type: 'link' },
          ],
          intro: 'When net external force on a system is zero, total linear momentum is conserved: \\(\\vec{p}_{\\text{total}} = \\text{constant}\\). This follows directly from Newton\'s Third Law — internal forces within the system always cancel in equal-opposite pairs. Classic Bangladesh exam example: a gun and bullet initially at rest. After firing, bullet goes forward — gun must recoil backward. Total momentum before = 0, so total momentum after must also = 0.',
          questions: [
            {
              id: 'mc-q1', type: 'fill',
              prompt: 'A 5 kg object moves at 4 m/s. Linear momentum = ___ kg·m/s.',
              answer: '20',
              aliases: ['20 kg·m/s', '20 kgm/s'],
              explanation: '\\(p = mv = 5 \\times 4 = 20\\) kg·m/s.',
            },
            {
              id: 'mc-q2', type: 'mcq',
              prompt: 'A 2 kg ball at 6 m/s collides with and sticks to a stationary 4 kg ball. Final velocity of the combined mass?',
              options: ['6 m/s', '3 m/s', '2 m/s', '1.5 m/s'],
              correct: 2,
              explanation: '\\(m_1 u_1 = (m_1 + m_2)v \\Rightarrow 2 \\times 6 = 6v \\Rightarrow v = 2\\) m/s.',
            },
            {
              id: 'mc-q3', type: 'mcq',
              prompt: 'A gun of mass 3 kg fires a bullet of mass 30 g at 400 m/s. Recoil velocity of the gun?',
              options: ['4 m/s', '40 m/s', '0.4 m/s', '400 m/s'],
              correct: 0,
              explanation: 'Total initial momentum = 0. \\(m_b v_b + m_g v_g = 0\\). \\(0.03 \\times 400 + 3 \\times v_g = 0 \\Rightarrow v_g = -12/3 = -4\\) m/s. Gun recoils at 4 m/s.',
            },
            {
              id: 'mc-q4', type: 'explain',
              prompt: 'A gun and bullet are initially at rest (total momentum = 0). After firing, the bullet moves forward. Explain the recoil using conservation of momentum.',
              modelAnswer: 'Before firing: \\(p_{\\text{total}} = 0\\). No external horizontal force acts during firing, so \\(p_{\\text{total}}\\) is conserved. The bullet gains forward momentum \\(m_b v_b\\). To keep \\(p_{\\text{total}} = 0\\), the gun acquires equal and opposite backward momentum: \\(m_g v_g = -m_b v_b\\), so \\(v_g = -m_b v_b / m_g\\). The gun recoils because momentum must be conserved — not because anything external pushes it backward.',
            },
          ],
        },

        // ── LESSON 5.2 ─────────────────────────────────────────
        {
          id: 'impulse',
          title: 'Impulse (আবেগ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — আবেগ ও ভরবেগের সম্পর্ক]',
          duration: '~14:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'imp-m1', label: 'HyperPhysics — Impulse and Momentum', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/impulse.html', type: 'link' },
            { id: 'imp-m2', label: 'Impulse — Wikipedia', url: 'https://en.wikipedia.org/wiki/Impulse_(physics)', type: 'link' },
          ],
          intro: 'Impulse: \\(J = F\\Delta t = \\Delta p\\). It equals the change in momentum. A cricket fielder draws hands back while catching — increasing contact time \\(\\Delta t\\) reduces the peak force \\(F\\) (since \\(\\Delta p\\) is fixed by the ball\'s change in velocity). Same principle: vehicle crumple zones and airbags extend collision time to reduce peak forces on passengers.',
          questions: [
            {
              id: 'imp-q1', type: 'fill',
              prompt: 'A 100 N force acts for 0.05 s. Impulse = ___ N·s.',
              answer: '5',
              aliases: ['5 Ns', '5 N·s', '5.0'],
              explanation: '\\(J = F\\Delta t = 100 \\times 0.05 = 5\\) N·s = \\(\\Delta p\\).',
            },
            {
              id: 'imp-q2', type: 'mcq',
              prompt: 'A 0.5 kg ball hits a wall at 10 m/s and bounces back at 8 m/s. Magnitude of change in momentum \\(|\\Delta p|\\)?',
              options: ['1 kg·m/s', '5 kg·m/s', '9 kg·m/s', '2 kg·m/s'],
              correct: 2,
              explanation: 'Taking towards-wall as positive: \\(p_i = +5\\) kg·m/s; \\(p_f = -4\\) kg·m/s (away from wall). \\(|\\Delta p| = |-4 - 5| = 9\\) kg·m/s.',
            },
            {
              id: 'imp-q3', type: 'mcq',
              prompt: 'Why does a cricket fielder pull their hands backward while catching a fast ball?',
              options: [
                'To demonstrate proper technique for the umpire',
                'To increase contact time \\(\\Delta t\\), reducing peak impact force — since \\(J = F\\Delta t = \\Delta p\\) is fixed, a larger \\(\\Delta t\\) means a smaller \\(F\\)',
                'To increase the impulse received from the ball',
                'To decrease the momentum transferred from the ball',
              ],
              correct: 1,
              explanation: '\\(\\Delta p\\) is fixed by the ball\'s change in velocity. Since \\(J = F\\Delta t = \\Delta p\\), a larger \\(\\Delta t\\) means a smaller average force \\(F\\). Less peak force = less injury to the hands.',
            },
          ],
        },

        // ── LESSON 5.3 ─────────────────────────────────────────
        {
          id: 'collisions-types',
          title: 'Elastic & Inelastic Collisions (স্থিতিস্থাপক ও অস্থিতিস্থাপক সংঘর্ষ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — সংঘর্ষের প্রকারভেদ]',
          duration: '~20:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'col-m1', label: 'Khan Academy — Elastic and Inelastic Collisions (English)', url: 'https://www.khanacademy.org/science/physics/linear-momentum/elastic-and-inelastic-collisions/a/what-are-elastic-and-inelastic-collisions', type: 'link' },
            { id: 'col-m2', label: 'Elastic Collision — Wikipedia', url: 'https://en.wikipedia.org/wiki/Elastic_collision', type: 'link' },
          ],
          intro: 'ALL collisions conserve momentum (when no net external force acts). Kinetic energy is conserved ONLY in perfectly elastic collisions. Real collisions are inelastic — some KE becomes heat, sound, or deformation. When objects stick together it is perfectly inelastic — maximum KE is lost while momentum is still conserved.',
          questions: [
            {
              id: 'col-q1', type: 'match',
              prompt: 'Match each collision type to its correct description:',
              pairs: [
                ['Elastic collision', 'Both momentum AND kinetic energy are conserved'],
                ['Inelastic collision', 'Momentum conserved; kinetic energy partially lost as heat or deformation'],
                ['Perfectly inelastic collision', 'Objects stick together; maximum kinetic energy lost; momentum still conserved'],
              ],
              explanation: 'Examples — Elastic: ideal billiard ball collisions (approximately). Inelastic: most real-world collisions. Perfectly inelastic: clay balls sticking, coupled railway wagons.',
            },
            {
              id: 'col-q2', type: 'mcq',
              prompt: 'Perfectly elastic head-on collision: ball A (mass m) at 4 m/s hits stationary ball B (same mass m). After the collision:',
              options: ['A continues at 4 m/s; B stays still', 'A stops; B moves at 4 m/s', 'Both move at 2 m/s', 'A bounces back at 4 m/s; B stays still'],
              correct: 1,
              explanation: 'For equal-mass elastic collisions, velocities exchange completely — the moving ball stops and the stationary ball moves off at the original speed. This follows from simultaneously applying conservation of momentum and conservation of kinetic energy.',
            },
            {
              id: 'col-q3', type: 'mcq',
              prompt: 'Which quantity is conserved in ALL types of collisions?',
              options: ['Kinetic energy', 'Total mechanical energy', 'Linear momentum', 'Velocity'],
              correct: 2,
              explanation: 'Linear momentum is conserved in all collisions provided no net external force acts on the system. Kinetic energy is conserved only in elastic collisions.',
            },
            {
              id: 'col-q4', type: 'explain',
              prompt: 'Two equal-mass balls undergo a perfectly elastic head-on collision. Ball A moves at u; Ball B is at rest. Prove that after the collision A stops and B moves at u.',
              modelAnswer: 'Let final velocities be \\(v_A\\) and \\(v_B\\).\n\nConservation of momentum: \\(mu = mv_A + mv_B \\Rightarrow u = v_A + v_B\\) ... (1)\n\nConservation of KE: \\(\\frac{1}{2}mu^2 = \\frac{1}{2}mv_A^2 + \\frac{1}{2}mv_B^2 \\Rightarrow u^2 = v_A^2 + v_B^2\\) ... (2)\n\nFrom (1): \\(v_B = u - v_A\\). Substitute into (2):\n\\(u^2 = v_A^2 + (u - v_A)^2 = v_A^2 + u^2 - 2uv_A + v_A^2\\)\n\\(0 = 2v_A^2 - 2uv_A = 2v_A(v_A - u)\\)\nSo \\(v_A = 0\\) or \\(v_A = u\\). Since \\(v_A = u\\) means no collision occurred, we take \\(v_A = 0\\). Then \\(v_B = u\\).',
            },
          ],
        },

      ], // end Skill 5 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 6 — Friction (ঘর্ষণ)
    // NCTB Chapter 4 — requires Skill 4
    // ══════════════════════════════════════════════════════════════
    {
      id: 'friction',
      name: 'Friction (ঘর্ষণ)',
      icon: 'ri-hand-line',
      description: 'Coefficient of friction, limiting friction, angle of friction, angle of repose, inclined planes.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        // ── LESSON 6.1 ─────────────────────────────────────────
        {
          id: 'friction-basics',
          title: 'Static & Kinetic Friction (স্থিতি ও গতীয় ঘর্ষণ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ঘর্ষণ: স্থিতিঘর্ষণ ও গতিঘর্ষণ]',
          duration: '~16:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'fr-m1', label: 'OpenStax — Friction (English)', url: 'https://openstax.org/books/university-physics-volume-1/pages/6-2-friction', type: 'link' },
            { id: 'fr-m2', label: 'HyperPhysics — Friction', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/frict.html', type: 'link' },
            { id: 'fr-m3', label: 'Friction — Wikipedia', url: 'https://en.wikipedia.org/wiki/Friction', type: 'link' },
          ],
          intro: 'Why do heavily loaded trucks slide on rain-soaked Dhaka roads? Friction has a maximum — called limiting (or maximum static) friction: \\(f_{s,\\text{max}} = \\mu_s N\\). Below this limit, static friction exactly matches the applied force and the object stays still. Once sliding starts, kinetic friction takes over: \\(f_k = \\mu_k N\\). Experimentally, \\(\\mu_k < \\mu_s\\) — it is always harder to start an object sliding than to keep it sliding.',
          questions: [
            {
              id: 'fr-q1', type: 'fill',
              prompt: 'A 10 kg block rests on a surface with \\(\\mu_s = 0.4\\), \\(g = 9.8\\) m/s². Minimum force needed to start sliding = ___ N.',
              answer: '39.2',
              aliases: ['39.2 N', '~39.2', '40'],
              explanation: '\\(f_{s,\\text{max}} = \\mu_s N = \\mu_s mg = 0.4 \\times 10 \\times 9.8 = 39.2\\) N.',
            },
            {
              id: 'fr-q2', type: 'mcq',
              prompt: 'For the same two surfaces, kinetic friction \\(f_k\\) vs. maximum static friction \\(f_{s,\\text{max}}\\):',
              options: ['\\(f_k > f_{s,\\text{max}}\\)', '\\(f_k = f_{s,\\text{max}}\\)', '\\(f_k < f_{s,\\text{max}}\\)', 'Depends on speed'],
              correct: 2,
              explanation: 'Experimentally \\(\\mu_k < \\mu_s\\) for the same surfaces, so \\(f_k < f_{s,\\text{max}}\\). More force is needed to start an object sliding than to keep it sliding.',
            },
            {
              id: 'fr-q3', type: 'mcq',
              prompt: 'The angle of friction \\(\\lambda\\) satisfies \\(\\tan \\lambda =\\)?',
              options: ['Normal force \\(N\\)', 'Coefficient of static friction \\(\\mu_s\\)', 'Applied force', 'Weight of the object'],
              correct: 1,
              explanation: 'At limiting equilibrium: \\(f = \\mu_s N\\). The angle of friction \\(\\lambda\\) is the angle between the resultant contact force and the normal: \\(\\tan \\lambda = f / N = \\mu_s\\).',
            },
          ],
        },

        // ── LESSON 6.2 ─────────────────────────────────────────
        {
          id: 'angle-of-repose',
          title: 'Angle of Friction & Angle of Repose (ঘর্ষণ কোণ ও স্থিতি কোণ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ঘর্ষণ কোণ ও স্থিতি কোণ]',
          duration: '~14:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'ar-m1', label: 'Angle of Repose — Wikipedia', url: 'https://en.wikipedia.org/wiki/Angle_of_repose', type: 'link' },
          ],
          intro: 'Place a block on an inclined plane and slowly increase the angle. At a certain angle, the block just begins to slide. That critical angle is the angle of repose (স্থিতি কোণ). It turns out to equal the angle of friction. Proving this equality is a classic NCTB creative question derivation.',
          questions: [
            {
              id: 'ar-q1', type: 'mcq',
              prompt: 'A block on an inclined plane just begins to slide when the inclination angle reaches 30°. Coefficient of static friction \\(\\mu_s\\) = ?',
              options: ['0.5', '\\(1/\\sqrt{3} \\approx 0.577\\)', '\\(\\sqrt{3} \\approx 1.73\\)', '0.87'],
              correct: 1,
              explanation: 'At the onset of sliding, angle of repose = angle of friction: \\(\\mu_s = \\tan 30° = 1/\\sqrt{3} \\approx 0.577\\).',
            },
            {
              id: 'ar-q2', type: 'explain',
              prompt: 'Prove that the angle of friction equals the angle of repose for a block on an inclined plane.',
              modelAnswer: 'Consider a block of mass m on a plane inclined at angle \\(\\theta\\) to the horizontal.\n\nAt the point of just sliding:\n• Normal to surface: \\(N = mg\\cos\\theta\\)\n• Along surface: \\(f = mg\\sin\\theta\\) (limiting static friction)\n\nDivide: \\(f/N = \\sin\\theta/\\cos\\theta = \\tan\\theta\\)\n\nBut \\(f/N = \\mu_s = \\tan\\lambda\\) (definition of angle of friction \\(\\lambda\\)).\n\nTherefore \\(\\tan\\lambda = \\tan\\theta\\), so \\(\\lambda = \\theta\\).\nThe angle of friction equals the angle of repose.',
            },
          ],
        },

      ], // end Skill 6 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 7 — Circular Motion (বৃত্তাকার গতি)
    // NCTB Chapter 3 circular section — requires Skill 4
    // ══════════════════════════════════════════════════════════════
    {
      id: 'circular-motion',
      name: 'Circular Motion (বৃত্তাকার গতি)',
      icon: 'ri-refresh-line',
      description: 'Centripetal acceleration and force, angular velocity, banked roads, conical pendulum.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        // ── LESSON 7.1 ─────────────────────────────────────────
        {
          id: 'centripetal',
          title: 'Centripetal Acceleration & Force (কেন্দ্রমুখী ত্বরণ ও বল)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — বৃত্তাকার গতি: কেন্দ্রমুখী ত্বরণ ও বল]',
          duration: '~17:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'cp-m1', label: 'Khan Academy — What is Centripetal Acceleration? (English)', url: 'https://www.khanacademy.org/science/physics/centripetal-force-and-gravitation/centripetal-forces/a/what-is-centripetal-acceleration', type: 'link' },
            { id: 'cp-m2', label: 'HyperPhysics — Centripetal Force', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/cf.html', type: 'link' },
          ],
          intro: '"Centrifugal force" (কেন্দ্রবিমুখী বল) — you feel thrown outward when a bus turns a corner in Dhaka. But is that force real? From an outside inertial observer\'s view, the only real force on you is inward — centripetal. The "outward feeling" is inertia: your body wants to continue straight while the bus turns under you. Centrifugal force is a pseudo-force — real only to an observer rotating with the object, not to an outside observer.',
          questions: [
            {
              id: 'cp-q1', type: 'fill',
              prompt: 'Centripetal acceleration \\(a_c\\) in terms of speed \\(v\\) and radius \\(r\\): \\(a_c\\) = ___.',
              answer: 'v²/r',
              aliases: ['v^2/r'],
              explanation: '\\(a_c = v^2/r\\), directed toward the centre. The velocity direction changes continuously as the object moves in a circle; the rate of this directional change produces the inward acceleration \\(v^2/r\\).',
            },
            {
              id: 'cp-q2', type: 'mcq',
              prompt: 'A 2 kg object moves in a circle of radius 5 m at 10 m/s. Centripetal force required:',
              options: ['4 N', '10 N', '40 N', '100 N'],
              correct: 2,
              explanation: '\\(F_c = mv^2/r = 2 \\times 100 / 5 = 40\\) N.',
            },
            {
              id: 'cp-q3', type: 'mcq',
              prompt: '"Centrifugal force" is:',
              options: [
                'The real outward force acting in all circular motion',
                'A fictitious (pseudo) force — apparent only to an observer rotating with the object',
                'Equal in direction to centripetal force',
                'Another name for centripetal force',
              ],
              correct: 1,
              explanation: 'From an inertial (non-rotating) frame, no real outward force acts. "Centrifugal force" is a pseudo-force apparent only inside the rotating reference frame. It is not a real interaction force.',
            },
            {
              id: 'cp-q4', type: 'mcq',
              prompt: 'If the speed of a circularly-moving object doubles (radius unchanged), the required centripetal force:',
              options: ['Doubles', 'Triples', 'Quadruples', 'Halves'],
              correct: 2,
              explanation: '\\(F_c = mv^2/r \\propto v^2\\). If \\(v \\to 2v\\): \\(F_c \\to 4mv^2/r\\). Force quadruples.',
            },
          ],
        },

        // ── LESSON 7.2 ─────────────────────────────────────────
        {
          id: 'angular-velocity-linear',
          title: 'Angular Velocity & Its Link to Linear Velocity (কৌণিক বেগ ও রৈখিক বেগের সম্পর্ক)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — কৌণিক বেগ ও রৈখিক বেগের মধ্যে সম্পর্ক]',
          duration: '~13:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'av-m1', label: 'Khan Academy — Angular Velocity (English)', url: 'https://www.khanacademy.org/science/physics/centripetal-force-and-gravitation/angular-velocity/a/what-is-angular-velocity', type: 'link' },
          ],
          intro: 'A ceiling fan\'s blades all rotate at the same angular velocity \\(\\omega\\). But the tip of a blade moves faster than a point near the hub — because \\(v = r\\omega\\). Larger \\(r\\), same \\(\\omega\\) → faster linear speed. This relationship — so simple, so important — connects the rotational world to the linear world you already know.',
          questions: [
            {
              id: 'av-q1', type: 'fill',
              prompt: 'A fan blade rotates at \\(\\omega = 10\\) rad/s. A point 0.3 m from the axis has linear speed \\(v\\) = ___ m/s.',
              answer: '3',
              aliases: ['3.0', '3 m/s'],
              explanation: '\\(v = r\\omega = 0.3 \\times 10 = 3\\) m/s.',
            },
            {
              id: 'av-q2', type: 'mcq',
              prompt: 'A wheel makes 300 revolutions per minute (rpm). Its angular velocity in rad/s?',
              options: ['5 rad/s', '10π rad/s', '300 rad/s', 'π rad/s'],
              correct: 1,
              explanation: '\\(\\omega = 2\\pi n = 2\\pi \\times (300/60) = 2\\pi \\times 5 = 10\\pi \\approx 31.4\\) rad/s.',
            },
          ],
        },

        // ── LESSON 7.3 ─────────────────────────────────────────
        {
          id: 'banked-roads',
          title: 'Banked Roads & the Conical Pendulum (ব্যাংকড রোড ও শাঙ্কব দোলক)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ব্যাংকড রোড ও শাঙ্কব দোলক]',
          duration: '~20:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'br-m1', label: 'Michel van Biezen — Banking of Roads (English)', url: 'https://www.youtube.com/watch?v=LqDBMgkc14o', type: 'link' },
            { id: 'br-m2', label: 'Banked Turn — Wikipedia', url: 'https://en.wikipedia.org/wiki/Banked_turn', type: 'link' },
            { id: 'br-m3', label: 'Conical Pendulum — Wikipedia', url: 'https://en.wikipedia.org/wiki/Conical_pendulum', type: 'link' },
          ],
          intro: 'The Dhaka-Chittagong highway and the Jamuna Bridge approach roads have banked (canted) curves. Why? On a frictionless banked road, the normal force \\(N\\) from the surface provides both the vertical support and the centripetal force. Resolving: vertical: \\(N\\cos\\theta = mg\\); horizontal (centripetal): \\(N\\sin\\theta = mv^2/r\\). Divide: \\(\\tan\\theta = v^2/(rg)\\) — the ideal banking condition, requiring no friction.',
          questions: [
            {
              id: 'br-q1', type: 'fill',
              prompt: 'For a frictionless banked road, the ideal banking angle satisfies \\(\\tan\\theta\\) = ___.',
              answer: 'v²/rg',
              aliases: ['v^2/(rg)', 'v^2/rg'],
              explanation: 'From \\(N\\sin\\theta = mv^2/r\\) and \\(N\\cos\\theta = mg\\). Dividing: \\(\\tan\\theta = v^2/(rg)\\).',
            },
            {
              id: 'br-q2', type: 'mcq',
              prompt: 'A banked curve has radius 50 m, banking angle such that \\(\\tan\\theta = 0.2\\). Ideal speed for no friction? (g = 9.8 m/s²)',
              options: ['~5 m/s', '~9.9 m/s', '15 m/s', '20 m/s'],
              correct: 1,
              explanation: '\\(\\tan\\theta = v^2/(rg) \\Rightarrow 0.2 = v^2/(50 \\times 9.8) \\Rightarrow v^2 = 98 \\Rightarrow v \\approx 9.9\\) m/s.',
            },
            {
              id: 'br-q3', type: 'mcq',
              prompt: 'A conical pendulum has string length \\(L\\) and makes angle \\(\\theta\\) with the vertical. Its period is:',
              options: [
                '\\(T = 2\\pi\\sqrt{L/g}\\)',
                '\\(T = 2\\pi\\sqrt{L\\cos\\theta / g}\\)',
                '\\(T = 2\\pi\\sqrt{L\\sin\\theta / g}\\)',
                '\\(T = 2\\pi\\sqrt{g/L}\\)',
              ],
              correct: 1,
              explanation: 'Vertical: \\(T\\cos\\theta = mg\\). Horizontal (centripetal): \\(T\\sin\\theta = m\\omega^2 L\\sin\\theta\\). From vertical: \\(\\omega^2 = g/(L\\cos\\theta)\\). Period: \\(T_{\\text{period}} = 2\\pi/\\omega = 2\\pi\\sqrt{L\\cos\\theta/g}\\).',
            },
          ],
        },

      ], // end Skill 7 lessons
    },


    // ══════════════════════════════════════════════════════════════
    // SKILL 8 — Angular Dynamics (কৌণিক গতিবিদ্যা)
    // NCTB Chapter 4 advanced — requires Skill 5
    // ══════════════════════════════════════════════════════════════
    {
      id: 'angular-dynamics',
      name: 'Angular Dynamics (কৌণিক গতিবিদ্যা)',
      icon: 'ri-settings-3-line',
      description: 'Torque, angular momentum, moment of inertia (both theorems), centre of mass, rocket motion.',
      tier: 4,
      prerequisiteIds: ['momentum-collisions'],
      lessons: [

        // ── LESSON 8.1 ─────────────────────────────────────────
        {
          id: 'torque-angular',
          title: 'Torque & Angular Momentum (টর্ক ও কৌণিক ভরবেগ)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — টর্ক ও কৌণিক ভরবেগ]',
          duration: '~20:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'tam-m1', label: 'Professor Leonard — Rotational Dynamics (English)', url: 'https://www.youtube.com/watch?v=vqDbMEdLiCs', type: 'link' },
            { id: 'tam-m2', label: 'Torque — Wikipedia', url: 'https://en.wikipedia.org/wiki/Torque', type: 'link' },
            { id: 'tam-m3', label: 'HyperPhysics — Torque', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/torq.html', type: 'link' },
          ],
          intro: 'Torque (টর্ক) is to rotation what force is to linear motion: \\(\\tau = rF\\sin\\phi\\). Angular momentum \\(L = I\\omega\\) is conserved when net external torque is zero — just as linear momentum is conserved when net external force is zero. A spinning figure skater who pulls in their arms reduces \\(I\\); to conserve \\(L = I\\omega\\), their \\(\\omega\\) increases. The complete rotational analogy: \\(\\tau \\leftrightarrow F\\), \\(L \\leftrightarrow p\\), \\(I \\leftrightarrow m\\), \\(\\omega \\leftrightarrow v\\).',
          questions: [
            {
              id: 'tam-q1', type: 'fill',
              prompt: 'A 10 N force applied perpendicular (90°) to a 0.5 m lever arm. Torque \\(\\tau\\) = ___ N·m.',
              answer: '5',
              aliases: ['5 Nm', '5 N·m'],
              explanation: '\\(\\tau = rF\\sin\\phi = 0.5 \\times 10 \\times \\sin 90° = 5\\) N·m.',
            },
            {
              id: 'tam-q2', type: 'mcq',
              prompt: 'A spinning skater pulls their arms in. Moment of inertia \\(I\\) decreases. Angular velocity \\(\\omega\\):',
              options: ['Decreases', 'Stays the same', 'Increases', 'Becomes zero'],
              correct: 2,
              explanation: 'Angular momentum \\(L = I\\omega\\) is conserved (no external torque). \\(I_1\\omega_1 = I_2\\omega_2\\). If \\(I\\) decreases, \\(\\omega\\) must increase proportionally.',
            },
            {
              id: 'tam-q3', type: 'mcq',
              prompt: 'In rotational mechanics, torque \\(\\tau\\) is the rotational analogue of ___ in linear mechanics.',
              options: ['Mass', 'Linear momentum', 'Force', 'Velocity'],
              correct: 2,
              explanation: 'Just as \\(F = dp/dt\\), we have \\(\\tau = dL/dt\\). Torque causes angular acceleration just as force causes linear acceleration.',
            },
          ],
        },

        // ── LESSON 8.2 ─────────────────────────────────────────
        {
          id: 'moment-of-inertia',
          title: 'Moment of Inertia — Parallel & Perpendicular Axis Theorems (জড়তার ভ্রামক)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — জড়তার ভ্রামক: সমান্তরাল ও লম্ব অক্ষ উপপাদ্য]',
          duration: '~24:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'mi-m1', label: 'Michel van Biezen — Moment of Inertia Series (English)', url: 'https://www.youtube.com/watch?v=E43-CfukEgs', type: 'link' },
            { id: 'mi-m2', label: 'Moment of Inertia — Wikipedia', url: 'https://en.wikipedia.org/wiki/Moment_of_inertia', type: 'link' },
            { id: 'mi-m3', label: 'List of Moments of Inertia (standard shapes) — Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_moments_of_inertia', type: 'link' },
            { id: 'mi-m4', label: 'Parallel Axis Theorem — Wikipedia', url: 'https://en.wikipedia.org/wiki/Parallel_axis_theorem', type: 'link' },
          ],
          intro: 'Moment of inertia \\(I = \\sum m_i r_i^2\\) measures resistance to angular acceleration — the rotational analogue of mass. A ring and a disc of equal mass and radius: \\(I_{\\text{ring}} = MR^2\\) vs \\(I_{\\text{disc}} = \\frac{1}{2}MR^2\\). The ring is harder to spin because all its mass sits at the outer edge. The two theorems let you calculate \\(I\\) for any axis from the CM value.',
          questions: [
            {
              id: 'mi-q1', type: 'mcq',
              prompt: 'Moment of inertia of a uniform thin rod (mass \\(M\\), length \\(L\\)) about its centre (perpendicular to its length):',
              options: ['\\(ML^2\\)', '\\(ML^2/3\\)', '\\(ML^2/12\\)', '\\(ML^2/2\\)'],
              correct: 2,
              explanation: '\\(I_{\\text{centre}} = ML^2/12\\). By the parallel axis theorem: \\(I_{\\text{end}} = ML^2/12 + M(L/2)^2 = ML^2/3\\).',
            },
            {
              id: 'mi-q2', type: 'fill',
              prompt: 'Parallel axis theorem: \\(I = I_{\\text{cm}} + \\) ___ .',
              answer: 'Md²',
              aliases: ['Md^2', 'md²', 'M×d²'],
              explanation: '\\(I = I_{\\text{cm}} + Md^2\\), where \\(d\\) is the perpendicular distance between the CM axis and the new parallel axis. Applies to any rigid body.',
            },
            {
              id: 'mi-q3', type: 'mcq',
              prompt: 'Solid disc: \\(M = 2\\) kg, \\(R = 0.5\\) m. Moment of inertia about its central axis:',
              options: ['0.5 kg·m²', '0.25 kg·m²', '1.0 kg·m²', '0.125 kg·m²'],
              correct: 1,
              explanation: '\\(I = \\frac{1}{2}MR^2 = \\frac{1}{2} \\times 2 \\times (0.5)^2 = 0.25\\) kg·m².',
            },
            {
              id: 'mi-q4', type: 'mcq',
              prompt: 'The perpendicular axis theorem \\(I_z = I_x + I_y\\) applies only to:',
              options: ['All 3D objects', 'Solid spheres', 'Planar laminas (flat 2D objects)', 'Circular objects only'],
              correct: 2,
              explanation: 'The perpendicular axis theorem is valid only for planar laminas — objects lying entirely in a 2D plane. The parallel axis theorem applies to all rigid bodies.',
            },
            {
              id: 'mi-q5', type: 'explain',
              prompt: 'A rod of mass M and length L has moment of inertia \\(ML^2/12\\) about its centre. Using the parallel axis theorem, find its moment of inertia about one end. Show all steps.',
              modelAnswer: '\\(I_{\\text{centre}} = ML^2/12\\) (given).\n\nThe distance from the centre to the end = \\(L/2\\).\n\nParallel axis theorem: \\(I_{\\text{end}} = I_{\\text{cm}} + Md^2 = \\frac{ML^2}{12} + M\\left(\\frac{L}{2}\\right)^2 = \\frac{ML^2}{12} + \\frac{ML^2}{4} = \\frac{ML^2}{12} + \\frac{3ML^2}{12} = \\frac{4ML^2}{12} = \\frac{ML^2}{3}\\).',
            },
          ],
        },

        // ── LESSON 8.3 ─────────────────────────────────────────
        {
          id: 'centre-of-mass',
          title: 'Centre of Mass & Rocket Motion (ভরকেন্দ্র ও রকেটের গতি)',
          videoId: '[FIND_ID: OnnoRokom Pathshala — ভরকেন্দ্র ও রকেটের গতি]',
          duration: '~16:00',
          source: {
            name: 'OnnoRokom Pathshala',
            instructor: 'Ratul Khan',
            url: 'https://www.youtube.com/@onnorokompathshala',
          },
          materials: [
            { id: 'com-m1', label: 'Khan Academy — Center of Mass (English)', url: 'https://www.khanacademy.org/science/physics/linear-momentum/center-of-mass/a/center-of-mass-review-article', type: 'link' },
            { id: 'com-m2', label: 'Tsiolkovsky Rocket Equation — Wikipedia', url: 'https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation', type: 'link' },
            { id: 'com-m3', label: 'Centre of Mass — Wikipedia', url: 'https://en.wikipedia.org/wiki/Center_of_mass', type: 'link' },
          ],
          intro: 'The centre of mass (CM) moves as if all external forces act on a single particle of mass \\(M_{\\text{total}}\\) at the CM: \\(\\vec{F}_{\\text{ext}} = M_{\\text{total}} \\vec{a}_{\\text{cm}}\\). A shell explodes in mid-air over Dhaka — the fragments scatter, but the CM of all fragments continues on the original parabolic path. The explosion is internal and doesn\'t change \\(\\vec{F}_{\\text{ext}}\\) (only gravity acts). Rockets use this same principle in the vacuum of space.',
          questions: [
            {
              id: 'com-q1', type: 'mcq',
              prompt: 'A 60 kg and a 40 kg person stand 5 m apart. Distance of their CM from the 60 kg person:',
              options: ['3 m', '2 m', '2.5 m', '1 m'],
              correct: 1,
              explanation: 'Taking the 60 kg person as origin: \\(x_{\\text{cm}} = \\frac{60 \\times 0 + 40 \\times 5}{100} = \\frac{200}{100} = 2\\) m.',
            },
            {
              id: 'com-q2', type: 'mcq',
              prompt: 'A shell explodes into fragments in mid-air. The centre of mass of all fragments:',
              options: [
                'Stops at the explosion point',
                'Continues on the original parabolic trajectory',
                'Falls straight down from the explosion point',
                'Moves randomly',
              ],
              correct: 1,
              explanation: 'The explosion is internal to the fragment system. Net external force (gravity) is unchanged. By \\(\\vec{F}_{\\text{ext}} = M\\vec{a}_{\\text{cm}}\\), the CM acceleration remains \\(g\\) downward — the CM continues on the original parabola.',
            },
            {
              id: 'com-q3', type: 'explain',
              prompt: 'How does a rocket accelerate in the vacuum of space where there is nothing to "push against"? Use conservation of momentum.',
              modelAnswer: 'Before ignition: rocket + fuel at rest → total momentum = 0. No external horizontal force acts, so total momentum stays 0.\n\nWhen fuel burns and exhaust is expelled backward at high velocity \\(v_{\\text{ex}}\\), the exhaust gains backward momentum \\(m_{\\text{ex}} v_{\\text{ex}}\\). The rocket gains equal and opposite forward momentum: \\(M_{\\text{rocket}} v_{\\text{rocket}} = m_{\\text{ex}} v_{\\text{ex}}\\).\n\nBy Newton\'s Third Law: the rocket pushes exhaust backward; exhaust pushes rocket forward. No external surface is needed. The rocket accelerates by expelling mass backward — not by pushing against anything.',
            },
          ],
        },

      ], // end Skill 8 lessons
    },

  ], // end skills
}

export default dynamics
