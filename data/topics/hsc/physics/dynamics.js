// ============================================================
// HSC Physics (1st Paper) — Dynamics
// Chapters 3 & 4: Kinematics + Newtonian Mechanics
//
// Sources used for fact-checking:
//   • Wikipedia (en.wikipedia.org)
//   • HyperPhysics — Georgia State University
//   • OpenStax University Physics Vol.1 (openstax.org)
//   • Khan Academy (khanacademy.org)
//   • NCTB HSC Physics 1st Paper syllabus
//
// All videos: English (Khan Academy / Michel van Biezen / Professor Leonard)
// Equations: LaTeX-style  \( ... \) inline,  \[ ... \] display
// Language: English only — no Bangla, no language selector
// ============================================================

const dynamics = {
  id: 'dynamics',
  name: 'Dynamics',
  description: 'Kinematics and Newtonian mechanics — HSC 1st Paper Chapters 3 & 4. From describing motion to explaining why motion happens.',
  icon: 'ri-rocket-2-line',
  prerequisiteTopicIds: [],
  skills: [

    // ══ SKILL 1 — Language of Motion ══════════════════════════════════
    {
      id: 'motion-language',
      name: 'Language of Motion',
      icon: 'ri-route-line',
      description: 'Scalars vs. vectors. Displacement, velocity, acceleration — the vocabulary before any equation.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [

        {
          id: 'displacement-velocity',
          title: 'Displacement, Velocity & Why Direction Matters',
          videoId: 'DRb5PSxJerM',
          duration: '12:08',
          materials: [
            { id: 'dv-m1', label: 'Displacement — Wikipedia', url: 'https://en.wikipedia.org/wiki/Displacement_(geometry)', type: 'link' },
            { id: 'dv-m2', label: 'Scalars and Vectors — Khan Academy', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/displacement-velocity-time/a/what-is-displacement', type: 'link' },
            { id: 'dv-m3', label: 'HyperPhysics: Velocity and Speed', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/vel2.html', type: 'link' },
          ],
          intro: 'A car travels 3 km north then 4 km east. It covered 7 km of road — but ended up only 5 km from the starting point. That gap between "how far you went" (distance, a scalar) and "where you ended up relative to start" (displacement, a vector) is fundamental. Speed is scalar; velocity is vector — same magnitudes, completely different physical meanings.',
          questions: [
            {
              id: 'ml-q1', type: 'mcq',
              prompt: 'A car travels 3 km north, then 4 km east. The magnitude of its total displacement is:',
              options: ['7 km', '5 km', '1 km', '3.5 km'],
              correct: 1,
              explanation: 'Displacement = straight-line distance from start to end point. By Pythagoras: \\(d = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5\\) km. The 7 km is total path length (distance), not displacement.',
            },
            {
              id: 'ml-q2', type: 'tap-correct',
              prompt: 'Select ALL quantities that are vectors (they have both magnitude AND direction):',
              options: ['Speed', 'Velocity', 'Distance', 'Displacement', 'Acceleration', 'Mass'],
              correct: [1, 3, 4],
              explanation: 'Vectors: velocity, displacement, acceleration — each has a direction. Scalars: speed, distance, mass — magnitude only. (OpenStax University Physics Vol.1, §2.1)',
            },
            {
              id: 'ml-q3', type: 'mcq',
              prompt: 'A ball thrown straight upward returns to the same launch point. Its total displacement is:',
              options: ['Twice the maximum height', 'Equal to the maximum height', 'Zero', 'Negative'],
              correct: 2,
              explanation: 'Displacement = final position − initial position. Since the ball returns to its starting point, the net change in position is zero. Total distance = 2 × maximum height; displacement = 0.',
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
              prompt: 'A student runs one full lap around a 400 m athletics track and returns to the starting line. Explain the difference between the distance covered and the displacement. Why does this distinction matter in physics equations?',
              modelAnswer: 'Distance = 400 m (total path length, scalar). Displacement = 0 m (start and finish are the same point). This matters because kinematic equations — such as \\(v^2 = u^2 + 2as\\) — use displacement, a vector. Using path length instead of displacement would give wrong answers whenever the direction of motion changes.',
            },
          ],
        },

        {
          id: 'equations-of-motion',
          title: 'Equations of Motion for Uniform Acceleration',
          videoId: 'ZM8ECpBuQYE',
          duration: '18:22',
          materials: [
            { id: 'eom-m1', label: 'Equations of Motion — Wikipedia', url: 'https://en.wikipedia.org/wiki/Equations_of_motion', type: 'link' },
            { id: 'eom-m2', label: 'Kinematic Equations — Khan Academy', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/kinematic-formulas/a/what-are-the-kinematic-formulas', type: 'link' },
            { id: 'eom-m3', label: 'HyperPhysics: Constant Acceleration', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/acons.html', type: 'link' },
          ],
          intro: 'The four kinematic equations — \\(v = u + at\\), \\(s = ut + \\frac{1}{2}at^2\\), \\(v^2 = u^2 + 2as\\), and \\(s = \\frac{(u+v)}{2}t\\) — are not separate facts to memorise. They derive from the definition of acceleration. Start from \\(a = \\Delta v / \\Delta t\\) and everything follows algebraically.',
          questions: [
            {
              id: 'eom-q1', type: 'mcq',
              prompt: 'Which kinematic equation does NOT contain acceleration \\(a\\)?',
              options: ['\\(v = u + at\\)', '\\(s = ut + \\frac{1}{2}at^2\\)', '\\(s = \\frac{(u+v)}{2} \\cdot t\\)', '\\(v^2 = u^2 + 2as\\)'],
              correct: 2,
              explanation: '\\(s = \\frac{(u+v)}{2} \\cdot t\\) is derived by eliminating \\(a\\) between the first two equations. It uses only average velocity × time.',
            },
            {
              id: 'eom-q2', type: 'fill',
              prompt: 'A train starts from rest and reaches 72 km/h in 10 s. Its acceleration = ___ m/s².',
              answer: '2',
              aliases: ['2.0', '2 m/s²'],
              explanation: '72 km/h = 20 m/s. Using \\(a = (v - u)/t = (20 - 0)/10 = 2\\) m/s².',
            },
            {
              id: 'eom-q3', type: 'mcq',
              prompt: 'A stone is dropped from rest and falls for 3 s. Distance fallen? (\\(g = 10\\) m/s²)',
              options: ['15 m', '30 m', '45 m', '90 m'],
              correct: 2,
              explanation: 'Using \\(s = ut + \\frac{1}{2}at^2\\) with \\(u = 0\\): \\(s = 0 + \\frac{1}{2}(10)(3^2) = 45\\) m.',
            },
            {
              id: 'eom-q4', type: 'mcq',
              prompt: 'A car decelerates from 20 m/s to rest over 50 m. Magnitude of deceleration?',
              options: ['2 m/s²', '4 m/s²', '8 m/s²', '0.4 m/s²'],
              correct: 1,
              explanation: 'Using \\(v^2 = u^2 + 2as\\): \\(0 = 400 + 2a(50) \\Rightarrow a = -4\\) m/s². Magnitude = 4 m/s².',
            },
            {
              id: 'eom-q5', type: 'explain',
              prompt: 'Derive \\(v^2 = u^2 + 2as\\) from the other two kinematic equations. Show every algebraic step.',
              modelAnswer: 'From \\(v = u + at\\), rearrange: \\(t = (v - u)/a\\). Substitute into \\(s = ut + \\frac{1}{2}at^2\\):\n\\(s = u \\cdot \\frac{v-u}{a} + \\frac{1}{2}a \\cdot \\frac{(v-u)^2}{a^2}\\)\nMultiply both sides by \\(2a\\):\n\\(2as = 2u(v-u) + (v-u)^2 = 2uv - 2u^2 + v^2 - 2uv + u^2 = v^2 - u^2\\)\nTherefore: \\(v^2 = u^2 + 2as\\).',
            },
          ],
        },

        {
          id: 'velocity-time-graphs',
          title: 'Velocity–Time Graphs',
          videoId: 'mODThjpDBhE',
          duration: '10:40',
          materials: [
            { id: 'vtg-m1', label: 'Velocity–Time Graphs — Khan Academy', url: 'https://www.khanacademy.org/science/physics/one-dimensional-motion/acceleration-tutorial/a/what-are-velocity-vs-time-graphs', type: 'link' },
            { id: 'vtg-m2', label: 'HyperPhysics: Graphical Analysis', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/mechanics/motgraph.html', type: 'link' },
          ],
          intro: 'A velocity–time (v–t) graph encodes everything: slope = acceleration; area under curve = displacement. A horizontal line → constant velocity, zero acceleration. A straight diagonal → uniform acceleration.',
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
              options: ['The body is stationary', 'The body accelerates at 15 m/s²', 'The body moves at constant velocity with zero acceleration', 'The body decelerates'],
              correct: 2,
              explanation: 'Horizontal line → slope = 0 → acceleration = 0. A non-zero constant v means uniform motion.',
            },
          ],
        },
      ],
    },

    // ══ SKILL 2 — Projectile Motion ══════════════════════════════════
    {
      id: 'projectile-motion',
      name: 'Projectile Motion',
      icon: 'ri-send-plane-2-line',
      description: 'Range, time of flight, maximum height — derived from first principles. River-boat problems.',
      tier: 2,
      prerequisiteIds: ['motion-language'],
      lessons: [

        {
          id: 'projectile-basics',
          title: 'Projectile Motion — The Two-Component Idea',
          videoId: 'aY8z2qO44WA',
          duration: '14:52',
          materials: [
            { id: 'pb-m1', label: 'Projectile Motion — Wikipedia', url: 'https://en.wikipedia.org/wiki/Projectile_motion', type: 'link' },
            { id: 'pb-m2', label: 'Projectile Motion — Khan Academy', url: 'https://www.khanacademy.org/science/physics/two-dimensional-motion/two-dimensional-projectile-mot/a/what-is-2d-projectile-motion', type: 'link' },
          ],
          intro: 'Throw a ball horizontally off a cliff. Horizontally: no force acts, so the horizontal velocity \\(v_x = u\\cos\\theta\\) stays constant throughout. Vertically: gravity acts downward at \\(g\\), so vertical velocity changes at rate \\(g\\). These two motions are completely independent — the key insight.',
          questions: [
            {
              id: 'pm-q1', type: 'mcq',
              prompt: 'In projectile motion (no air resistance), which velocity component remains constant throughout the flight?',
              options: ['Vertical component', 'Horizontal component', 'Both components', 'Neither — both change'],
              correct: 1,
              explanation: 'No horizontal force acts → \\(a_x = 0\\). By Newton\'s first law, horizontal velocity \\(v_x = u\\cos\\theta\\) stays constant throughout.',
            },
            {
              id: 'pm-q2', type: 'mcq',
              prompt: 'A ball is thrown horizontally at 20 m/s from a 45 m cliff. Time to reach the ground? (\\(g = 10\\) m/s²)',
              options: ['2 s', '3 s', '4 s', '4.5 s'],
              correct: 1,
              explanation: 'Vertical only: \\(s = \\frac{1}{2}gt^2 \\Rightarrow 45 = \\frac{1}{2}(10)t^2 \\Rightarrow t^2 = 9 \\Rightarrow t = 3\\) s. Horizontal speed does not affect fall time.',
            },
            {
              id: 'pm-q3', type: 'mcq',
              prompt: 'At the highest point of a projectile\'s trajectory, which is correct?',
              options: [
                'Both velocity components are zero — the projectile is stationary',
                'Only the vertical velocity component is zero',
                'Only the horizontal velocity component is zero',
                'The projectile is momentarily at rest',
              ],
              correct: 1,
              explanation: 'At maximum height the vertical velocity reverses direction → \\(v_y = 0\\) at that instant. The horizontal velocity \\(v_x = u\\cos\\theta\\) is unaffected and remains non-zero.',
            },
          ],
        },

        {
          id: 'projectile-formulas',
          title: 'Range, Time of Flight & Maximum Height — Derivations',
          videoId: 'ou9YMWlJgkE',
          duration: '20:15',
          materials: [
            { id: 'pf-m1', label: 'Projectile Motion Derivations — Wikipedia', url: 'https://en.wikipedia.org/wiki/Projectile_motion#Derivations', type: 'link' },
            { id: 'pf-m2', label: 'OpenStax: Projectile Motion', url: 'https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion', type: 'link' },
          ],
          intro: 'Three results to derive, not memorise:\n• Time of flight: \\(T = \\frac{2u\\sin\\theta}{g}\\)\n• Maximum height: \\(H = \\frac{u^2\\sin^2\\theta}{2g}\\)\n• Horizontal range: \\(R = \\frac{u^2\\sin 2\\theta}{g}\\)\nEach follows from kinematic equations applied to the vertical and horizontal components separately.',
          questions: [
            {
              id: 'pf-q1', type: 'fill',
              prompt: 'A projectile is launched at 30° with speed 40 m/s. Time of flight \\(T\\) = ___ s. (\\(g = 10\\) m/s²)',
              answer: '4',
              aliases: ['4.0', '4 s'],
              explanation: '\\(T = \\frac{2u\\sin\\theta}{g} = \\frac{2 \\times 40 \\times \\sin 30°}{10} = \\frac{2 \\times 40 \\times 0.5}{10} = 4\\) s.',
            },
            {
              id: 'pf-q2', type: 'mcq',
              prompt: 'Two projectiles launched at the same speed — one at 30°, one at 60°. Their horizontal ranges are:',
              options: ['60° has greater range', '30° has greater range', 'Equal', 'Cannot be determined'],
              correct: 2,
              explanation: '\\(R = \\frac{u^2\\sin 2\\theta}{g}\\). For 30°: \\(\\sin 60° \\approx 0.866\\). For 60°: \\(\\sin 120° = \\sin 60° \\approx 0.866\\). Equal — complementary angles (summing to 90°) always give equal range.',
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
              prompt: 'At 45°, the ratio of maximum height \\(H\\) to horizontal range \\(R\\) is:',
              options: ['H = R', 'H = R/4', 'H = 2R', 'H = R/2'],
              correct: 1,
              explanation: 'At 45°: \\(H = \\frac{u^2\\sin^2 45°}{2g} = \\frac{u^2}{4g}\\) and \\(R = \\frac{u^2\\sin 90°}{g} = \\frac{u^2}{g}\\). So \\(H = R/4\\).',
            },
            {
              id: 'pf-q5', type: 'explain',
              prompt: 'Derive the expression for horizontal range \\(R = \\frac{u^2 \\sin 2\\theta}{g}\\) from first principles.',
              modelAnswer: 'Time of flight: set vertical displacement to zero for the return to the ground.\n\\(0 = u\\sin\\theta \\cdot T - \\frac{1}{2}gT^2\\)\n\\(T = \\frac{2u\\sin\\theta}{g}\\)\nHorizontal velocity is constant at \\(u\\cos\\theta\\). Therefore:\n\\(R = u\\cos\\theta \\times T = u\\cos\\theta \\times \\frac{2u\\sin\\theta}{g} = \\frac{2u^2\\sin\\theta\\cos\\theta}{g}\\)\nUsing the identity \\(2\\sin\\theta\\cos\\theta = \\sin 2\\theta\\):\n\\(R = \\frac{u^2\\sin 2\\theta}{g}\\)',
            },
          ],
        },

        {
          id: 'relative-velocity',
          title: 'Relative Velocity & River-Boat Problems',
          videoId: 'CQYgIBDFDlo',
          duration: '17:05',
          materials: [
            { id: 'rv-m1', label: 'Relative Velocity — Wikipedia', url: 'https://en.wikipedia.org/wiki/Relative_velocity', type: 'link' },
            { id: 'rv-m2', label: 'Khan Academy: Relative Motion', url: 'https://www.khanacademy.org/science/physics/two-dimensional-motion/relative-velocity-and-relative-motion/v/relative-velocity-and-riverboat-problems', type: 'link' },
          ],
          intro: 'Velocity is always measured relative to a frame of reference. Velocity of A relative to B: \\(\\vec{v}_{AB} = \\vec{v}_A - \\vec{v}_B\\).\n\nRiver-boat: two key cases:\n• Minimum crossing TIME → point straight across (perpendicular to bank)\n• Minimum DRIFT → angle upstream such that the resultant is perpendicular to the bank',
          questions: [
            {
              id: 'rv-q1', type: 'mcq',
              prompt: 'A boat does 5 m/s in still water. River current is 3 m/s. Boat heads straight across (perpendicular to banks). Resultant speed?',
              options: ['8 m/s', '2 m/s', '\\(\\sqrt{34} \\approx 5.83\\) m/s', '4 m/s'],
              correct: 2,
              explanation: 'Boat velocity (5 m/s, perpendicular) and current (3 m/s, parallel to bank) are at right angles. \\(v = \\sqrt{5^2 + 3^2} = \\sqrt{34} \\approx 5.83\\) m/s.',
            },
            {
              id: 'rv-q2', type: 'mcq',
              prompt: 'To cross a river in MINIMUM TIME, the boat should be directed:',
              options: ['Upstream at some angle', 'Straight across — perpendicular to the banks', 'Downstream at some angle', 'At 45° to the bank'],
              correct: 1,
              explanation: 'Crossing time \\(t = d / v_{\\perp}\\). Perpendicular component \\(v_{\\perp}\\) is maximised when the boat points straight across (\\(v_{\\perp} = v_{\\text{boat}}\\)). Some downstream drift occurs, but the crossing is fastest.',
            },
            {
              id: 'rv-q3', type: 'mcq',
              prompt: 'Train A moves east at 60 km/h. Train B moves west at 40 km/h. Velocity of A relative to B?',
              options: ['20 km/h east', '100 km/h east', '100 km/h west', '20 km/h west'],
              correct: 1,
              explanation: 'Taking east as positive: \\(\\vec{v}_{AB} = \\vec{v}_A - \\vec{v}_B = +60 - (-40) = +100\\) km/h = 100 km/h east.',
            },
          ],
        },
      ],
    },

    // ══ SKILL 3 — Newton's Laws ════════════════════════════════════
    {
      id: 'newtons-laws',
      name: "Newton's Laws of Motion",
      icon: 'ri-arrow-right-circle-line',
      description: 'Inertia, F = ma derived from momentum, the horse-cart paradox.',
      tier: 2,
      prerequisiteIds: ['motion-language'],
      lessons: [

        {
          id: 'newton-first',
          title: "Newton's First Law — Inertia",
          videoId: 'kKKM8Y-u7ds',
          duration: '13:50',
          materials: [
            { id: 'n1-m1', label: "Newton's First Law — Wikipedia", url: "https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion#First_law", type: 'link' },
            { id: 'n1-m2', label: "HyperPhysics: Newton's Laws", url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/Newt.html', type: 'link' },
          ],
          intro: "A bus brakes suddenly — standing passengers lurch forward. Nobody pushed them. Their bodies were moving at the bus's speed and, with no direct backward force acting on them, they continue forward by inertia. Newton's First Law: an object remains at rest or in uniform straight-line motion unless acted upon by a net external force.",
          questions: [
            {
              id: 'n1-q1', type: 'mcq',
              prompt: "Newton's first law is also called the law of:",
              options: ['Momentum', 'Inertia', 'Action-Reaction', 'Conservation of Energy'],
              correct: 1,
              explanation: "A body persists in its state of rest or uniform motion in a straight line unless acted upon by an external force. This property — resistance to change in motion — is called inertia.",
            },
            {
              id: 'n1-q2', type: 'tap-correct',
              prompt: 'Select ALL examples demonstrating inertia of REST (a stationary object resisting being set in motion):',
              options: [
                'Passenger lurches backward when bus suddenly starts',
                'Passenger thrown forward when bus brakes hard',
                'Tablecloth pulled quickly — plates remain behind',
                'Ball continuing to roll on a frictionless surface',
                'Dust falls off a blanket when it is beaten',
              ],
              correct: [0, 2, 4],
              explanation: 'Inertia of rest (0, 2, 4): stationary objects resist being set in motion. Inertia of motion (1, 3): objects in motion resist being stopped. Both are the same property.',
            },
            {
              id: 'n1-q3', type: 'explain',
              prompt: "A bus brakes suddenly and a standing passenger lurches forward. No one pushed them forward. Explain using Newton's First Law.",
              modelAnswer: "Newton's First Law: a body in uniform motion continues at the same velocity unless a net force acts on it. The bus decelerates because a braking force acts on the bus. However, no corresponding backward force acts directly on the passenger's body at that instant. By inertia, the passenger's body continues at the bus's original velocity while the bus slows — appearing to lurch forward relative to the decelerating bus.",
            },
          ],
        },

        {
          id: 'newton-second',
          title: "Newton's Second Law — F = ma",
          videoId: 'ou9YMWlJgkE',
          duration: '16:30',
          materials: [
            { id: 'n2-m1', label: "Newton's Second Law — Wikipedia", url: "https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion#Second_law", type: 'link' },
            { id: 'n2-m2', label: "OpenStax: Newton's Second Law", url: 'https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law', type: 'link' },
          ],
          intro: "The net force on an object equals the rate of change of its linear momentum: \\(\\vec{F}_{\\text{net}} = \\frac{d\\vec{p}}{dt}\\). For constant mass this reduces to \\(\\vec{F} = m\\vec{a}\\). The momentum form is more fundamental — it also covers variable-mass systems like rockets.",
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
              prompt: 'The same net force is applied for the same duration to a cricket ball (mass ≈ 0.156 kg) and a football (mass ≈ 0.43 kg). Which gains more acceleration? Use \\(F = ma\\).',
              modelAnswer: 'Same force, same time → same impulse \\(J = F\\Delta t\\) → same \\(\\Delta p\\). However, \\(a = F/m\\). The cricket ball (smaller \\(m\\)) gains a much larger acceleration. Ratio: \\(a_{\\text{cricket}} / a_{\\text{football}} = m_{\\text{football}} / m_{\\text{cricket}} = 0.43/0.156 \\approx 2.8\\). The cricket ball accelerates about 2.8 times more.',
            },
          ],
        },

        {
          id: 'newton-third',
          title: "Newton's Third Law — Action and Reaction",
          videoId: 'pGnMiGrYmPY',
          duration: '12:45',
          materials: [
            { id: 'n3-m1', label: "Newton's Third Law — Wikipedia", url: "https://en.wikipedia.org/wiki/Newton%27s_laws_of_motion#Third_law", type: 'link' },
            { id: 'n3-m2', label: "HyperPhysics: Newton's Third Law", url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/newt.html#n3', type: 'link' },
          ],
          intro: "The horse pulls the cart forward. The cart pulls the horse backward with an equal force. So why does the system accelerate? Action-reaction pairs act on DIFFERENT objects — they cannot cancel each other. The horse also pushes the ground backward; the ground pushes the horse forward (a separate pair). If that forward push exceeds wheel friction, the system accelerates.",
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
                "Action-reaction forces act on DIFFERENT objects; the ground pushes the horse forward — a separate pair",
                "The cart's pull cancels out over time",
                "Newton's Third Law doesn't apply to living things",
              ],
              correct: 1,
              explanation: "Action-reaction pairs act on different objects — they can never cancel. Two separate third-law pairs: (1) Horse pulls cart forward; cart pulls horse backward. (2) Horse's hooves push ground backward; ground pushes horse forward (friction). If friction forward exceeds rolling resistance, the whole system accelerates.",
            },
            {
              id: 'n3-q3', type: 'mcq',
              prompt: "Which option is NOT a Newton's Third Law pair?",
              options: [
                'Earth pulls book downward; book pulls Earth upward',
                'Table pushes book upward (normal); book pushes table downward',
                "Book's weight downward (gravity) and table's normal force upward — both on the book",
                'Rocket pushes exhaust backward; exhaust pushes rocket forward',
              ],
              correct: 2,
              explanation: "Weight (Earth's pull on book) and normal force (table's push on book) both act on the SAME object — the book. A third-law pair always involves two forces on TWO DIFFERENT objects. Weight and normal force may be equal in magnitude here, but they balance — they do not form a third-law pair.",
            },
          ],
        },
      ],
    },

    // ══ SKILL 4 — Momentum & Collisions ══════════════════════════════
    {
      id: 'momentum-collisions',
      name: 'Momentum & Collisions',
      icon: 'ri-exchange-funds-line',
      description: 'Conservation of momentum, impulse, elastic and inelastic collisions.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        {
          id: 'momentum-conservation',
          title: 'Conservation of Linear Momentum',
          videoId: 'vqDbMEdLiCs',
          duration: '19:10',
          materials: [
            { id: 'mc-m1', label: 'Conservation of Momentum — Wikipedia', url: 'https://en.wikipedia.org/wiki/Momentum#Conservation', type: 'link' },
            { id: 'mc-m2', label: 'Khan Academy: Conservation of Momentum', url: 'https://www.khanacademy.org/science/physics/linear-momentum/momentum-tutorial/a/what-is-conservation-of-momentum', type: 'link' },
          ],
          intro: 'When net external force on a system is zero, total linear momentum is conserved: \\(\\vec{p}_{\\text{total}} = \\text{constant}\\). This follows directly from Newton\'s Third Law — internal forces within the system always cancel in pairs.',
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
              prompt: 'A 2 kg ball at 6 m/s collides with and sticks to a stationary 4 kg ball. Final velocity?',
              options: ['6 m/s', '3 m/s', '2 m/s', '1.5 m/s'],
              correct: 2,
              explanation: '\\(m_1 u_1 = (m_1 + m_2)v \\Rightarrow 2 \\times 6 = 6v \\Rightarrow v = 2\\) m/s.',
            },
            {
              id: 'mc-q3', type: 'explain',
              prompt: 'A gun and bullet are initially at rest (total momentum = 0). After firing, the bullet moves forward. Explain the recoil using conservation of momentum.',
              modelAnswer: 'Before firing: \\(p_{\\text{total}} = 0\\). No external horizontal forces act during firing, so \\(p_{\\text{total}}\\) is conserved. The bullet gains forward momentum \\(m_b v_b\\). To maintain \\(p_{\\text{total}} = 0\\), the gun acquires equal and opposite backward momentum: \\(m_g v_g = -m_b v_b\\), so \\(v_g = -m_b v_b / m_g\\). The gun recoils because momentum must be conserved — not because anything external pushes it.',
            },
          ],
        },

        {
          id: 'impulse',
          title: 'Impulse',
          videoId: '4i1MUWJoI0U',
          duration: '14:20',
          materials: [
            { id: 'imp-m1', label: 'Impulse — Wikipedia', url: 'https://en.wikipedia.org/wiki/Impulse_(physics)', type: 'link' },
            { id: 'imp-m2', label: 'HyperPhysics: Impulse and Momentum', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/impulse.html', type: 'link' },
          ],
          intro: 'Impulse: \\(J = F\\Delta t = \\Delta p\\). It equals the change in momentum. A cricket fielder draws hands back while catching — increasing contact time \\(\\Delta t\\) reduces the peak force \\(F\\) (since \\(\\Delta p\\) is fixed). Same principle: airbags in cars.',
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
                'To demonstrate proper technique',
                'To increase contact time \\(\\Delta t\\), reducing peak impact force (\\(J = F\\Delta t = \\Delta p\\) is fixed, so \\(\\Delta t \\uparrow\\) means \\(F \\downarrow\\))',
                'To increase the momentum transferred to the hands',
                'To decrease the impulse received',
              ],
              correct: 1,
              explanation: '\\(\\Delta p\\) is determined by the ball\'s change in velocity — it is fixed. Since \\(J = F\\Delta t = \\Delta p\\), a larger \\(\\Delta t\\) means a smaller average force \\(F\\). Less force = less injury to the hands.',
            },
          ],
        },

        {
          id: 'collisions-types',
          title: 'Elastic and Inelastic Collisions',
          videoId: 'FOkQszg1-j8',
          duration: '20:30',
          materials: [
            { id: 'col-m1', label: 'Elastic Collision — Wikipedia', url: 'https://en.wikipedia.org/wiki/Elastic_collision', type: 'link' },
            { id: 'col-m2', label: 'Inelastic Collision — Wikipedia', url: 'https://en.wikipedia.org/wiki/Inelastic_collision', type: 'link' },
            { id: 'col-m3', label: 'Khan Academy: Elastic and Inelastic Collisions', url: 'https://www.khanacademy.org/science/physics/linear-momentum/elastic-and-inelastic-collisions/a/what-are-elastic-and-inelastic-collisions', type: 'link' },
          ],
          intro: 'ALL collisions conserve momentum (when no external net force acts). Kinetic energy is conserved ONLY in perfectly elastic collisions. Real-world collisions are inelastic — some KE converts to heat, sound, or permanent deformation. When objects stick together it is a perfectly inelastic collision — maximum KE is lost.',
          questions: [
            {
              id: 'col-q1', type: 'match',
              prompt: 'Match each collision type to its correct description:',
              pairs: [
                ['Elastic collision', 'Both momentum AND kinetic energy are conserved'],
                ['Inelastic collision', 'Momentum conserved; kinetic energy partially converted to heat or deformation'],
                ['Perfectly inelastic collision', 'Objects stick together; maximum kinetic energy is lost; momentum still conserved'],
              ],
              explanation: 'Examples — Elastic: ideal billiard ball collisions (approximately). Inelastic: most real collisions. Perfectly inelastic: clay balls sticking, coupled railway wagons.',
            },
            {
              id: 'col-q2', type: 'mcq',
              prompt: 'Perfectly elastic head-on collision: ball A (mass m) at 4 m/s hits stationary ball B (also mass m). After the collision:',
              options: ['A continues at 4 m/s; B stationary', 'A stops; B moves at 4 m/s', 'Both move at 2 m/s', 'A bounces back at 4 m/s; B stationary'],
              correct: 1,
              explanation: 'For equal-mass elastic collisions, velocities exchange completely: the moving ball stops and the stationary ball moves off at the original speed. This follows from simultaneously applying conservation of momentum and conservation of kinetic energy.',
            },
            {
              id: 'col-q3', type: 'mcq',
              prompt: 'Which quantity is conserved in ALL types of collisions?',
              options: ['Kinetic energy', 'Total mechanical energy', 'Linear momentum', 'Velocity'],
              correct: 2,
              explanation: 'Linear momentum is conserved in all collisions provided no external net force acts. Kinetic energy is conserved only in elastic collisions.',
            },
          ],
        },
      ],
    },

    // ══ SKILL 5 — Friction ════════════════════════════════════════
    {
      id: 'friction',
      name: 'Friction',
      icon: 'ri-hand-line',
      description: 'Coefficient of friction, limiting friction, angle of friction, inclined planes.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        {
          id: 'friction-basics',
          title: 'Static and Kinetic Friction',
          videoId: 'Bc5qlb-J7m0',
          duration: '16:15',
          materials: [
            { id: 'fr-m1', label: 'Friction — Wikipedia', url: 'https://en.wikipedia.org/wiki/Friction', type: 'link' },
            { id: 'fr-m2', label: 'HyperPhysics: Friction', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/frict.html', type: 'link' },
            { id: 'fr-m3', label: 'OpenStax: Friction', url: 'https://openstax.org/books/university-physics-volume-1/pages/6-2-friction', type: 'link' },
          ],
          intro: 'Friction has a maximum — called limiting (or maximum static) friction: \\(f_{s,\\text{max}} = \\mu_s N\\). Below it, static friction exactly matches the applied force. Once the object starts sliding, kinetic friction takes over: \\(f_k = \\mu_k N\\). Experimentally, \\(\\mu_k < \\mu_s\\) for the same surfaces — it is always harder to start an object moving than to keep it moving.',
          questions: [
            {
              id: 'fr-q1', type: 'fill',
              prompt: 'A 10 kg block rests on a surface with \\(\\mu_s = 0.4\\), \\(g = 10\\) m/s². Minimum force needed to start sliding = ___ N.',
              answer: '40',
              aliases: ['40 N', '40.0'],
              explanation: '\\(f_{s,\\text{max}} = \\mu_s N = \\mu_s mg = 0.4 \\times 10 \\times 10 = 40\\) N. This is the limiting static friction — the applied force must exceed this to start motion.',
            },
            {
              id: 'fr-q2', type: 'mcq',
              prompt: 'For the same two surfaces, kinetic friction \\(f_k\\) vs. maximum static friction \\(f_{s,\\text{max}}\\):',
              options: ['\\(f_k > f_{s,\\text{max}}\\)', '\\(f_k = f_{s,\\text{max}}\\)', '\\(f_k < f_{s,\\text{max}}\\)', 'Depends on speed'],
              correct: 2,
              explanation: 'Experimentally \\(\\mu_k < \\mu_s\\), so \\(f_k < f_{s,\\text{max}}\\). More force is needed to start an object moving than to keep it moving.',
            },
            {
              id: 'fr-q3', type: 'mcq',
              prompt: 'The angle of friction \\(\\lambda\\) satisfies \\(\\tan \\lambda = \\)?',
              options: ['Normal force \\(N\\)', 'Coefficient of static friction \\(\\mu_s\\)', 'Applied force', 'Weight of the object'],
              correct: 1,
              explanation: 'At limiting equilibrium: \\(f = \\mu_s N\\). The angle of friction \\(\\lambda\\) is the angle the resultant contact force makes with the normal: \\(\\tan \\lambda = f / N = \\mu_s\\).',
            },
            {
              id: 'fr-q4', type: 'mcq',
              prompt: 'A block on an inclined plane just begins to slide when the inclination angle reaches 30°. Coefficient of static friction \\(\\mu_s\\) = ?',
              options: ['0.5', '\\(1/\\sqrt{3} \\approx 0.577\\)', '\\(\\sqrt{3} \\approx 1.73\\)', '0.87'],
              correct: 1,
              explanation: 'At the onset of sliding, the angle of friction equals the angle of inclination: \\(\\mu_s = \\tan 30° = 1/\\sqrt{3} \\approx 0.577\\).',
            },
          ],
        },
      ],
    },

    // ══ SKILL 6 — Circular Motion ════════════════════════════════
    {
      id: 'circular-motion',
      name: 'Circular Motion',
      icon: 'ri-refresh-line',
      description: 'Centripetal acceleration and force, banked roads, conical pendulum, vertical circles.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [

        {
          id: 'centripetal',
          title: 'Centripetal Acceleration and Force',
          videoId: 'O7zZPqar50g',
          duration: '17:40',
          materials: [
            { id: 'cp-m1', label: 'Circular Motion — Wikipedia', url: 'https://en.wikipedia.org/wiki/Circular_motion', type: 'link' },
            { id: 'cp-m2', label: 'Centripetal Force — Khan Academy', url: 'https://www.khanacademy.org/science/physics/centripetal-force-and-gravitation/centripetal-forces/a/what-is-centripetal-acceleration', type: 'link' },
            { id: 'cp-m3', label: 'HyperPhysics: Centripetal Force', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/cf.html', type: 'link' },
          ],
          intro: '"Centrifugal force" is not a real force — it is a pseudo-force that appears only inside a rotating reference frame. From an outside inertial frame, the only real force on an object in circular motion is centripetal — directed inward toward the centre: \\(F_c = mv^2/r\\).',
          questions: [
            {
              id: 'cp-q1', type: 'fill',
              prompt: 'Centripetal acceleration \\(a_c\\) in terms of speed \\(v\\) and radius \\(r\\): \\(a_c\\) = ___ .',
              answer: 'v²/r',
              aliases: ['v^2/r'],
              explanation: '\\(a_c = v^2/r\\), directed toward the centre. For an object moving in a circle of radius \\(r\\) at speed \\(v\\), the velocity direction changes continuously — the rate of this directional change gives an inward acceleration of magnitude \\(v^2/r\\).',
            },
            {
              id: 'cp-q2', type: 'mcq',
              prompt: 'A 2 kg object moves in a circle of radius 5 m at 10 m/s. Centripetal force required:',
              options: ['4 N', '10 N', '40 N', '100 N'],
              correct: 2,
              explanation: '\\(F_c = mv^2/r = 2 \\times 10^2 / 5 = 200/5 = 40\\) N.',
            },
            {
              id: 'cp-q3', type: 'mcq',
              prompt: '"Centrifugal force" is:',
              options: [
                'The real outward force acting in circular motion',
                'A fictitious (pseudo) force — apparent only in a rotating reference frame',
                'Equal in magnitude and direction to centripetal force',
                'Another name for centripetal force',
              ],
              correct: 1,
              explanation: 'In an inertial (non-rotating) frame, no outward force exists on the object. "Centrifugal force" is a pseudo-force apparent only to an observer rotating with the object. It is not a real interaction. (Wikipedia: Centrifugal force)',
            },
            {
              id: 'cp-q4', type: 'mcq',
              prompt: 'If the speed of a circularly-moving object doubles (radius unchanged), the required centripetal force:',
              options: ['Doubles', 'Triples', 'Quadruples', 'Halves'],
              correct: 2,
              explanation: '\\(F_c = mv^2/r\\). If \\(v \\to 2v\\): \\(F_c \\to m(2v)^2/r = 4mv^2/r\\). Force quadruples because \\(F_c \\propto v^2\\).',
            },
          ],
        },

        {
          id: 'banked-roads',
          title: 'Banked Roads and the Conical Pendulum',
          videoId: 'LqDBMgkc14o',
          duration: '19:55',
          materials: [
            { id: 'br-m1', label: 'Banked Turn — Wikipedia', url: 'https://en.wikipedia.org/wiki/Banked_turn', type: 'link' },
            { id: 'br-m2', label: 'Conical Pendulum — Wikipedia', url: 'https://en.wikipedia.org/wiki/Conical_pendulum', type: 'link' },
          ],
          intro: 'On a frictionless banked road, the normal force \\(N\\) from the surface provides both the vertical support and the centripetal force. Resolving:\n• Vertical: \\(N\\cos\\theta = mg\\)\n• Horizontal (centripetal): \\(N\\sin\\theta = mv^2/r\\)\n\nDividing gives the ideal banking condition: \\(\\tan\\theta = v^2/(rg)\\).',
          questions: [
            {
              id: 'br-q1', type: 'fill',
              prompt: 'For a frictionless banked road, the ideal banking angle satisfies \\(\\tan\\theta\\) = ___ .',
              answer: 'v²/rg',
              aliases: ['v^2/(rg)', 'v^2/rg'],
              explanation: 'From \\(N\\sin\\theta = mv^2/r\\) and \\(N\\cos\\theta = mg\\). Dividing: \\(\\tan\\theta = v^2/(rg)\\).',
            },
            {
              id: 'br-q2', type: 'mcq',
              prompt: 'A banked curve has radius 50 m, \\(\\tan\\theta = 0.2\\). Ideal speed? (\\(g = 10\\) m/s²)',
              options: ['5 m/s', '10 m/s', '15 m/s', '20 m/s'],
              correct: 1,
              explanation: '\\(\\tan\\theta = v^2/(rg) \\Rightarrow 0.2 = v^2/(50 \\times 10) \\Rightarrow v^2 = 100 \\Rightarrow v = 10\\) m/s.',
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
              explanation: 'Vertical: \\(T\\cos\\theta = mg\\). Horizontal (centripetal): \\(T\\sin\\theta = m\\omega^2 r = m\\omega^2 L\\sin\\theta\\). From vertical: \\(\\omega^2 = g/(L\\cos\\theta)\\). Period: \\(T = 2\\pi/\\omega = 2\\pi\\sqrt{L\\cos\\theta / g}\\).',
            },
          ],
        },
      ],
    },

    // ══ SKILL 7 — Angular Dynamics ══════════════════════════════════
    {
      id: 'angular-dynamics',
      name: 'Angular Dynamics',
      icon: 'ri-settings-3-line',
      description: 'Torque, angular momentum, moment of inertia (both theorems), centre of mass, rocket motion.',
      tier: 4,
      prerequisiteIds: ['momentum-collisions'],
      lessons: [

        {
          id: 'torque-angular',
          title: 'Torque and Angular Momentum',
          videoId: 'vqDbMEdLiCs',
          duration: '20:20',
          materials: [
            { id: 'tam-m1', label: 'Torque — Wikipedia', url: 'https://en.wikipedia.org/wiki/Torque', type: 'link' },
            { id: 'tam-m2', label: 'Angular Momentum — Wikipedia', url: 'https://en.wikipedia.org/wiki/Angular_momentum', type: 'link' },
            { id: 'tam-m3', label: 'HyperPhysics: Torque', url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/torq.html', type: 'link' },
          ],
          intro: 'Torque is to rotation what force is to linear motion: \\(\\tau = rF\\sin\\phi\\). Angular momentum \\(L = I\\omega\\) is conserved when net external torque is zero. A figure skater pulling in their arms reduces \\(I\\), so \\(\\omega\\) increases — \\(L = I\\omega\\) stays constant.',
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
              prompt: 'A spinning figure skater pulls their arms in. Moment of inertia \\(I\\) decreases. Angular velocity \\(\\omega\\):',
              options: ['Decreases', 'Stays the same', 'Increases', 'Becomes zero'],
              correct: 2,
              explanation: 'Angular momentum \\(L = I\\omega\\) is conserved (no external torque). \\(I_1\\omega_1 = I_2\\omega_2\\). If \\(I\\) decreases, \\(\\omega\\) increases proportionally.',
            },
            {
              id: 'tam-q3', type: 'mcq',
              prompt: 'In rotational mechanics, torque \\(\\tau\\) is the analogue of ___ in linear mechanics.',
              options: ['Mass', 'Linear momentum', 'Force', 'Velocity'],
              correct: 2,
              explanation: 'Complete analogy: \\(\\tau\\) ↔ \\(F\\). \\(L\\) ↔ \\(p\\). \\(I\\) ↔ \\(m\\). \\(\\omega\\) ↔ \\(v\\). Just as \\(F = dp/dt\\), we have \\(\\tau = dL/dt\\).',
            },
          ],
        },

        {
          id: 'moment-of-inertia',
          title: 'Moment of Inertia — Parallel and Perpendicular Axis Theorems',
          videoId: 'E43-CfukEgs',
          duration: '24:10',
          materials: [
            { id: 'mi-m1', label: 'Moment of Inertia — Wikipedia', url: 'https://en.wikipedia.org/wiki/Moment_of_inertia', type: 'link' },
            { id: 'mi-m2', label: 'List of Moments of Inertia — Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_moments_of_inertia', type: 'link' },
            { id: 'mi-m3', label: 'Parallel Axis Theorem — Wikipedia', url: 'https://en.wikipedia.org/wiki/Parallel_axis_theorem', type: 'link' },
          ],
          intro: 'Moment of inertia \\(I = \\sum m_i r_i^2\\) measures how mass is distributed relative to the rotation axis. A ring and a disc of equal mass and radius: \\(I_{\\text{ring}} = MR^2\\) vs \\(I_{\\text{disc}} = \\frac{1}{2}MR^2\\). The ring is harder to spin because all its mass is at the outer edge.',
          questions: [
            {
              id: 'mi-q1', type: 'mcq',
              prompt: 'Uniform thin rod of mass \\(M\\) and length \\(L\\). Moment of inertia about its centre (perpendicular to its length) = ?',
              options: ['\\(ML^2\\)', '\\(ML^2/3\\)', '\\(ML^2/12\\)', '\\(ML^2/2\\)'],
              correct: 2,
              explanation: '\\(I_{\\text{centre}} = ML^2/12\\). Derived by integration: \\(I = \\int_{-L/2}^{L/2} \\frac{M}{L}x^2 \\, dx = \\frac{ML^2}{12}\\). The end-axis value \\(ML^2/3\\) follows by the parallel axis theorem: \\(\\frac{ML^2}{12} + M(L/2)^2 = \\frac{ML^2}{3}\\).',
            },
            {
              id: 'mi-q2', type: 'fill',
              prompt: 'Parallel axis theorem: \\(I = I_{\\text{cm}} + \\) ___ .',
              answer: 'Md²',
              aliases: ['Md^2', 'md²', 'M×d²'],
              explanation: '\\(I = I_{\\text{cm}} + Md^2\\). Here \\(d\\) is the perpendicular distance between the CM axis and the new parallel axis. Applies to any rigid body.',
            },
            {
              id: 'mi-q3', type: 'mcq',
              prompt: 'Solid disc: \\(M = 2\\) kg, \\(R = 0.5\\) m. Moment of inertia about its central axis = ?',
              options: ['0.5 kg·m²', '0.25 kg·m²', '1.0 kg·m²', '0.125 kg·m²'],
              correct: 1,
              explanation: '\\(I = \\frac{1}{2}MR^2 = \\frac{1}{2} \\times 2 \\times (0.5)^2 = \\frac{1}{2} \\times 2 \\times 0.25 = 0.25\\) kg·m².',
            },
            {
              id: 'mi-q4', type: 'mcq',
              prompt: 'The perpendicular axis theorem (\\(I_z = I_x + I_y\\)) applies only to:',
              options: ['All three-dimensional objects', 'Solid spheres', 'Planar laminas (flat 2D objects)', 'Circular objects only'],
              correct: 2,
              explanation: 'The perpendicular axis theorem is valid only for planar laminas — objects that lie entirely in a 2D plane. The parallel axis theorem, by contrast, applies to all rigid bodies.',
            },
          ],
        },

        {
          id: 'centre-of-mass',
          title: 'Centre of Mass and Rocket Motion',
          videoId: 'GtOt7Os41iE',
          duration: '16:00',
          materials: [
            { id: 'com-m1', label: 'Centre of Mass — Wikipedia', url: 'https://en.wikipedia.org/wiki/Center_of_mass', type: 'link' },
            { id: 'com-m2', label: 'Tsiolkovsky Rocket Equation — Wikipedia', url: 'https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation', type: 'link' },
          ],
          intro: 'The centre of mass (CM) of a system moves as if all external forces act on a single particle of mass \\(M_{\\text{total}}\\) at the CM: \\(\\vec{F}_{\\text{ext}} = M_{\\text{total}} \\vec{a}_{\\text{cm}}\\). If a shell explodes in mid-air, the CM of all fragments continues on the original parabolic path — because the explosion is an internal force and does not change the net external force (gravity).',
          questions: [
            {
              id: 'com-q1', type: 'mcq',
              prompt: 'A 60 kg and a 40 kg person stand 5 m apart. Distance of their centre of mass from the 60 kg person = ?',
              options: ['3 m', '2 m', '2.5 m', '1 m'],
              correct: 1,
              explanation: 'Taking the 60 kg person as origin: \\(x_{\\text{cm}} = \\frac{60 \\times 0 + 40 \\times 5}{60 + 40} = \\frac{200}{100} = 2\\) m.',
            },
            {
              id: 'com-q2', type: 'mcq',
              prompt: 'A shell explodes into fragments in mid-air. The centre of mass of all fragments:',
              options: [
                'Stops immediately at the explosion point',
                'Continues on the original parabolic trajectory',
                'Falls straight down from the explosion point',
                'Moves randomly',
              ],
              correct: 1,
              explanation: 'The explosion is internal to the system of fragments. Net external force (gravity) is unchanged. By \\(\\vec{F}_{\\text{ext}} = M\\vec{a}_{\\text{cm}}\\), the CM acceleration remains \\(g\\) downward — the CM continues on the original parabola.',
            },
            {
              id: 'com-q3', type: 'explain',
              prompt: 'How does a rocket accelerate in the vacuum of space where there is nothing to "push against"? Use conservation of momentum.',
              modelAnswer: 'Before ignition, rocket + fuel are at rest: total momentum = 0. No external horizontal forces act. By conservation of momentum, total momentum remains 0. When fuel is burned and expelled backward at high velocity, the exhaust acquires backward momentum \\(m_{\\text{exhaust}} v_{\\text{exhaust}}\\). The rocket acquires equal and opposite forward momentum: \\(m_{\\text{rocket}} v_{\\text{rocket}} = m_{\\text{exhaust}} v_{\\text{exhaust}}\\). By Newton\'s Third Law, the rocket pushes exhaust backward; the exhaust pushes the rocket forward. No external surface is needed.',
            },
          ],
        },
      ],
    },

  ], // end skills
}

export default dynamics
