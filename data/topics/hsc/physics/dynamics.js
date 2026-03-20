// ============================================================
// HSC Physics — Dynamics
// programId: hsc | subjectId: physics | topicId: dynamics
//
// skill_key format:  hsc/physics/dynamics/{skillId}
// lesson_key format: hsc/physics/dynamics/{skillId}/{lessonIdx}
// ============================================================

const dynamics = {
  id: 'dynamics',
  name: 'Dynamics',
  description: 'Forces, motion, momentum, and energy — rebuilt from scratch. No memorising formulas. Every idea earns its place by making sense first.',
  icon: 'ri-rocket-2-line',
  prerequisiteTopicIds: [],

  skills: [

    // ── TIER 1 ───────────────────────────────────────────────
    {
      id: 'what-is-force',
      name: 'What is a force?',
      icon: 'ri-hand-coin-line',
      description: 'Force as a push or pull. The idea of interaction.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [
        {
          id: 'force-intro',
          title: 'Forces are interactions',
          intro: 'A force is not a thing inside an object. It is what happens *between* two objects. You cannot push without being pushed back. That is the starting point.',
          questions: [
            {
              id: 'f1-q1', type: 'mcq',
              prompt: 'A force always requires:',
              options: [
                'Something to push against — two objects interacting',
                'An object moving in a straight line',
                'Energy stored inside an object',
                'A surface to rest on',
              ],
              correct: 0,
              explanation: 'Forces are interactions between two objects. A single isolated object cannot exert a force on itself — there is nothing for it to interact with.',
            },
            {
              id: 'f1-q2', type: 'mcq',
              prompt: 'You push a wall with 50 N. The wall pushes back on you with:',
              options: ['0 N — the wall is not alive', '25 N — it splits the force', '50 N — Newton\'s third law', '100 N — walls are rigid'],
              correct: 2,
              explanation: 'Newton\'s 3rd law: every action has an equal and opposite reaction. The wall pushes back with exactly 50 N — always, no exceptions.',
            },
            {
              id: 'f1-q3', type: 'fill',
              prompt: 'Forces come in ___. You cannot have a force from one object without a force on that object from the other.',
              answer: 'pairs',
              aliases: ['pair', 'action-reaction pairs', 'action reaction pairs'],
              explanation: 'Newton\'s 3rd law tells us forces always come in action-reaction pairs — equal in magnitude, opposite in direction, acting on different objects.',
            },
            {
              id: 'f1-q4', type: 'mcq',
              prompt: 'A book rests on a table. The book pushes down on the table with force F. The table pushes up on the book with:',
              options: [
                'A smaller force — the table just supports it',
                'The same force F upward — Newton\'s 3rd law pair',
                'No force — the table is not a living thing',
                'A larger force to keep the book still',
              ],
              correct: 1,
              explanation: 'The normal force from the table on the book is exactly equal to the force the book exerts on the table. This is Newton\'s 3rd law, always.',
            },
            {
              id: 'f1-q5', type: 'mcq',
              prompt: 'Which pair are NOT a Newton\'s 3rd law pair?',
              options: [
                'Earth pulls book down; book pulls Earth up',
                'Table pushes book up; book pushes table down',
                'Book\'s weight pulling down; table\'s normal force pushing up',
                'Rocket pushes exhaust backward; exhaust pushes rocket forward',
              ],
              correct: 2,
              explanation: 'Weight and normal force both act on the same object (the book). A 3rd law pair always acts on two different objects.',
            },
          ],
        },
        {
          id: 'force-types',
          title: 'The forces you will meet',
          intro: 'In HSC Physics, a small set of forces does almost all the work. Knowing each one — what causes it, what direction it acts — saves you from confusion later.',
          questions: [
            {
              id: 'f2-q1', type: 'match',
              prompt: 'Match each force to what causes it:',
              pairs: [
                ['Weight (gravity)', 'Earth\'s gravitational field acting on mass'],
                ['Normal force', 'A surface preventing objects passing through it'],
                ['Friction', 'Surface irregularities resisting sliding motion'],
                ['Tension', 'A rope or string being pulled taut'],
              ],
              explanation: 'Each force has a distinct physical cause. Weight acts downward always. Normal acts perpendicular to the surface. Friction acts parallel to the surface, opposing motion.',
            },
            {
              id: 'f2-q2', type: 'mcq',
              prompt: 'A block sits on a ramp. The normal force on the block acts:',
              options: [
                'Straight down (same as gravity)',
                'Perpendicular to the ramp surface',
                'Parallel to the ramp, up the slope',
                'Horizontal, away from the wall',
              ],
              correct: 1,
              explanation: 'Normal force is always perpendicular to the surface — it prevents the object going through the surface. On a ramp it points away from the ramp face, not straight up.',
            },
            {
              id: 'f2-q3', type: 'mcq',
              prompt: 'Weight and mass are:',
              options: [
                'The same thing, just measured differently',
                'Different: mass is the amount of matter (kg), weight is the gravitational force on that mass (N)',
                'Different: weight is always bigger than mass',
                'Interchangeable in all physics equations',
              ],
              correct: 1,
              explanation: 'Mass (kg) measures how much matter. Weight (N) = mg is a force — how hard gravity pulls on that mass. On the Moon your mass stays the same; your weight drops to 1/6th.',
            },
            {
              id: 'f2-q4', type: 'fill',
              prompt: 'The weight of a 5 kg object on Earth (g = 10 m/s²) is ___ N.',
              answer: '50',
              aliases: ['50 N', '50N'],
              explanation: 'W = mg = 5 × 10 = 50 N. Weight is a force, measured in Newtons.',
            },
          ],
        },
      ],
    },

    {
      id: 'vectors',
      name: 'Vectors',
      icon: 'ri-arrow-right-up-line',
      description: 'Direction matters as much as size. The language of physics.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [
        {
          id: 'vectors-intro',
          title: 'Scalars vs Vectors',
          intro: 'Some quantities only need a number. Others need a number and a direction. Mixing them up is the single most common mistake in Dynamics.',
          questions: [
            {
              id: 'v1-q1', type: 'mcq',
              prompt: 'Which of these is a vector quantity?',
              options: ['Speed', 'Mass', 'Temperature', 'Velocity'],
              correct: 3,
              explanation: 'Velocity has both magnitude and direction (e.g. 20 m/s north). Speed is only the magnitude — it is a scalar.',
            },
            {
              id: 'v1-q2', type: 'sort',
              prompt: 'Sort into SCALAR or VECTOR:',
              items: ['Distance', 'Displacement', 'Speed', 'Velocity', 'Time', 'Force', 'Energy'],
              categories: ['Scalar', 'Vector'],
              correct: {
                Scalar: ['Distance', 'Speed', 'Time', 'Energy'],
                Vector: ['Displacement', 'Velocity', 'Force'],
              },
              explanation: 'Scalars: distance, speed, time, energy, mass, temperature. Vectors: displacement, velocity, acceleration, force, momentum.',
            },
            {
              id: 'v1-q3', type: 'mcq',
              prompt: 'A car travels 4 km east then 3 km north. Its displacement is:',
              options: ['7 km north-east', '5 km at 37° north of east', '1 km north', '7 km, direction unknown'],
              correct: 1,
              explanation: 'Displacement is a vector. Use Pythagoras: √(4² + 3²) = 5 km. Direction: tan θ = 3/4, θ ≈ 37° north of east.',
            },
            {
              id: 'v1-q4', type: 'mcq',
              prompt: 'Two forces act on an object: 6 N east and 8 N north. The net force magnitude is:',
              options: ['14 N', '2 N', '10 N', '48 N'],
              correct: 2,
              explanation: 'Vector addition: F = √(6² + 8²) = √100 = 10 N. You cannot simply add vector magnitudes — direction matters.',
            },
          ],
        },
        {
          id: 'vectors-components',
          title: 'Breaking forces into components',
          intro: 'The most powerful trick in Dynamics: replace one angled force with two perpendicular forces. Then solve two simple 1D problems instead of one hard 2D problem.',
          questions: [
            {
              id: 'v2-q1', type: 'mcq',
              prompt: 'A force of 20 N acts at 30° above the horizontal. Its horizontal component is:',
              options: ['20 sin 30° = 10 N', '20 cos 30° ≈ 17.3 N', '20 tan 30° ≈ 11.5 N', '20 N — the angle doesn\'t change it'],
              correct: 1,
              explanation: 'Horizontal = F cos θ = 20 cos 30° ≈ 17.3 N. Vertical = F sin θ = 20 sin 30° = 10 N. cos for adjacent (horizontal when θ is from horizontal).',
            },
            {
              id: 'v2-q2', type: 'fill',
              prompt: 'A 50 N force acts at 60° to the horizontal. Its vertical component is ___ N.',
              answer: '43.3',
              aliases: ['43', '43.3 N', '25√3'],
              explanation: 'Vertical = 50 sin 60° = 50 × (√3/2) ≈ 43.3 N',
            },
            {
              id: 'v2-q3', type: 'mcq',
              prompt: 'Why do we resolve forces into components?',
              options: [
                'To make the numbers smaller',
                'Because perpendicular components are independent — we can solve x and y separately',
                'To avoid using trigonometry',
                'Because the HSC requires it',
              ],
              correct: 1,
              explanation: 'A horizontal force cannot cause vertical acceleration and vice versa. Splitting into perpendicular components makes each axis an independent 1D problem.',
            },
          ],
        },
      ],
    },

    // ── TIER 2 ───────────────────────────────────────────────
    {
      id: 'newtons-laws',
      name: "Newton's Laws",
      icon: 'ri-scales-3-line',
      description: 'The three ideas that explain all of classical motion.',
      tier: 2,
      prerequisiteIds: ['what-is-force', 'vectors'],
      lessons: [
        {
          id: 'newtons-first',
          title: "Newton's First Law — Inertia",
          intro: "Objects don't need a force to keep moving. They need a force to change their motion. This was revolutionary — for 2000 years people thought motion required constant effort. Newton showed rest and constant velocity are the same thing: both mean zero net force.",
          questions: [
            {
              id: 'n1-q1', type: 'mcq',
              prompt: 'An object moving at constant velocity has:',
              options: [
                'A net force in the direction of motion',
                'Zero net force',
                'No forces acting on it at all',
                'A net force opposing motion',
              ],
              correct: 1,
              explanation: 'Constant velocity means zero net force — Newton\'s 1st law. Forces can still exist; they simply cancel.',
            },
            {
              id: 'n1-q2', type: 'mcq',
              prompt: 'You are in a car that brakes suddenly. Your body lurches forward. Why?',
              options: [
                'A force pushes you forward',
                'Your body has inertia — it resists the change in motion',
                'Gravity temporarily increases',
                'The seatbelt pushes you',
              ],
              correct: 1,
              explanation: 'Inertia: your body wants to continue at the original velocity. The car slows; your body does not (until the seatbelt applies a force). There is no mysterious forward force.',
            },
            {
              id: 'n1-q3', type: 'mcq',
              prompt: 'In deep space, far from all gravity and friction, you push a ball and let go. It will:',
              options: [
                'Gradually slow down and stop',
                'Speed up because there\'s no friction',
                'Continue at constant velocity forever',
                'Immediately stop',
              ],
              correct: 2,
              explanation: 'With zero net force, velocity never changes. The ball moves at constant velocity indefinitely.',
            },
            {
              id: 'n1-q4', type: 'explain',
              prompt: 'Aristotle believed objects naturally come to rest. Newton disagreed. What was wrong with Aristotle\'s view?',
              modelAnswer: 'Aristotle was observing objects on Earth where friction and air resistance always hide the real behaviour. Newton realised friction is a force, not "the natural state." Remove friction and an object continues forever. The natural state is not rest but constant velocity.',
              explanation: 'Friction and air resistance make it look like motion requires effort. They don\'t — they are just additional forces that need accounting for.',
            },
          ],
        },
        {
          id: 'newtons-second',
          title: "Newton's Second Law — F = ma",
          intro: "F = ma is not a definition. It is a discovery. The bigger the mass, the harder it is to accelerate. The bigger the force, the more acceleration you get.",
          questions: [
            {
              id: 'n2-q1', type: 'fill',
              prompt: 'A 4 kg object experiences a net force of 20 N. Its acceleration is ___ m/s².',
              answer: '5',
              aliases: ['5 m/s²', '5 m/s^2'],
              explanation: 'a = F/m = 20/4 = 5 m/s².',
            },
            {
              id: 'n2-q2', type: 'mcq',
              prompt: 'Two objects, same net force. Object A: 2 kg. Object B: 8 kg. Which has greater acceleration?',
              options: [
                'Object B — more mass means more acceleration',
                'They accelerate equally',
                'Object A — less mass means greater acceleration for the same force',
                'Cannot be determined',
              ],
              correct: 2,
              explanation: 'a = F/m. Same F, smaller m → larger a. Object A accelerates 4× more than Object B.',
            },
            {
              id: 'n2-q3', type: 'mcq',
              prompt: 'A 10 kg box is pushed with 50 N but friction is 20 N. Acceleration:',
              options: ['50/10 = 5 m/s²', '20/10 = 2 m/s²', '(50−20)/10 = 3 m/s²', '(50+20)/10 = 7 m/s²'],
              correct: 2,
              explanation: 'Net force = 50 − 20 = 30 N. a = F_net/m = 30/10 = 3 m/s². Always find net force first.',
            },
            {
              id: 'n2-q4', type: 'mcq',
              prompt: 'What does "net" mean in "net force"?',
              options: [
                'The largest single force',
                'The vector sum of all forces acting on the object',
                'The force in the direction of motion',
                'The force that gravity adds',
              ],
              correct: 1,
              explanation: '"Net" means the vector sum. A 30 N push right and 10 N friction left gives net 20 N right. Only net force determines acceleration.',
            },
          ],
        },
        {
          id: 'newtons-third',
          title: "Newton's Third Law — Action–Reaction",
          intro: 'Forces come in pairs. Always. The crucial detail: the two forces act on different objects. They never cancel each other — they cannot, because they act on different things.',
          questions: [
            {
              id: 'n3-q1', type: 'mcq',
              prompt: 'A horse pulls a cart forward with force F. The cart pulls the horse backward with force F. Why does the system still accelerate forward?',
              options: [
                'The horse is stronger so it overcomes the equal force',
                'The two forces cancel — it shouldn\'t move',
                'Newton\'s 3rd law pairs act on different objects. The ground pushes the horse forward more than the cart pulls it back.',
                'The cart is lighter so it accelerates more',
              ],
              correct: 2,
              explanation: 'Apply F=ma to each object separately. The horse also has the ground pushing it forward (friction on hooves). Newton\'s 3rd law pairs never act on the same object.',
            },
            {
              id: 'n3-q2', type: 'tap-correct',
              prompt: 'Select ALL that are true about Newton\'s 3rd law pairs:',
              options: [
                'Equal in magnitude',
                'Opposite in direction',
                'Act on the same object',
                'Act on different objects',
                'Always cancel out',
                'Of the same type of force',
              ],
              correct: [0, 1, 3],
              explanation: 'Newton\'s 3rd law pairs: equal magnitude, opposite direction, different objects, same type. They never cancel — they act on different objects.',
            },
            {
              id: 'n3-q3', type: 'mcq',
              prompt: 'You jump off a boat to the dock. The boat moves backward because:',
              options: [
                'You push backward on the water',
                'You push the dock forward which pushes the boat back',
                'You push the boat backward as you jump; the boat pushes you forward — Newton\'s 3rd law',
                'The boat is lighter so it moves more',
              ],
              correct: 2,
              explanation: 'As you push backward against the boat (to propel yourself forward), the boat receives an equal backward push from you.',
            },
          ],
        },
      ],
    },

    {
      id: 'free-body-diagrams',
      name: 'Free Body Diagrams',
      icon: 'ri-draft-line',
      description: 'The tool that makes every dynamics problem solvable.',
      tier: 2,
      prerequisiteIds: ['what-is-force', 'vectors'],
      lessons: [
        {
          id: 'fbd-intro',
          title: 'Drawing FBDs correctly',
          intro: 'A free body diagram isolates one object and shows every force acting ON it. One object. Every force. Arrows in the right direction. This single habit solves 80% of dynamics problems.',
          questions: [
            {
              id: 'fbd-q1', type: 'mcq',
              prompt: 'In a free body diagram, arrows represent:',
              options: [
                'The direction the object is moving',
                'Forces acting ON the chosen object only',
                'Forces the object exerts on others',
                'Velocity and acceleration vectors',
              ],
              correct: 1,
              explanation: 'FBDs show forces acting ON the object. Not forces it exerts. Not its velocity. Just forces on it.',
            },
            {
              id: 'fbd-q2', type: 'mcq',
              prompt: 'A book sits on a table. Which forces appear in the book\'s FBD?',
              options: [
                'Weight of book downward only',
                'Weight downward AND normal force from table upward',
                'Weight down, normal up, AND the force the book exerts on the table',
                'Normal force from table only',
              ],
              correct: 1,
              explanation: 'The book\'s FBD: weight (mg) downward, normal force (N) upward. The force the book exerts ON the table is NOT in the book\'s FBD — it acts on a different object.',
            },
            {
              id: 'fbd-q3', type: 'sort',
              prompt: 'A car drives at constant velocity on flat road. Sort forces for the car\'s FBD:',
              items: ['Engine thrust (forward)', 'Air resistance (backward)', 'Weight (down)', 'Normal force (up)', 'Reaction force of car on road (down)'],
              categories: ['IN the FBD', 'NOT in the FBD'],
              correct: {
                'IN the FBD': ['Engine thrust (forward)', 'Air resistance (backward)', 'Weight (down)', 'Normal force (up)'],
                'NOT in the FBD': ['Reaction force of car on road (down)'],
              },
              explanation: 'The reaction force of the car on the road acts ON THE ROAD, not on the car.',
            },
            {
              id: 'fbd-q4', type: 'mcq',
              prompt: 'The book is at rest. What does this tell you about the forces in its FBD?',
              options: [
                'There are no forces acting on it',
                'The net force is zero — forces are balanced',
                'Only gravity acts',
                'The normal force must be greater than gravity',
              ],
              correct: 1,
              explanation: 'Rest means zero acceleration. Zero acceleration means zero net force. So weight = normal force in magnitude.',
            },
          ],
        },
        {
          id: 'fbd-ramps',
          title: 'FBDs on ramps and connected objects',
          intro: 'Ramps are where most students go wrong. The trick: resolve forces along and perpendicular to the ramp — not horizontal and vertical.',
          questions: [
            {
              id: 'fbd-r1', type: 'mcq',
              prompt: 'A box on a frictionless ramp (angle θ). Along the ramp, the net force is:',
              options: ['mg downward', 'mg cos θ down the slope', 'mg sin θ down the slope', 'mg tan θ down the slope'],
              correct: 2,
              explanation: 'Along the ramp: mg sin θ down the slope. Perpendicular to ramp: mg cos θ (balanced by normal force).',
            },
            {
              id: 'fbd-r2', type: 'mcq',
              prompt: 'Two boxes connected by a string, pulled by force F. Box A (2 kg) front, Box B (3 kg) behind. Tension in string:',
              options: ['Equal to F', 'F × (3/5)', 'F × (2/5)', 'Zero — they move together'],
              correct: 1,
              explanation: 'System a = F/5. For Box B: T = m_B × a = 3 × F/5 = 3F/5.',
            },
          ],
        },
      ],
    },

    // ── TIER 3 ───────────────────────────────────────────────
    {
      id: 'kinematics',
      name: 'Motion & Kinematics',
      icon: 'ri-speed-up-line',
      description: 'Describing motion with numbers: displacement, velocity, acceleration.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [
        {
          id: 'kinematic-quantities',
          title: 'Displacement, Velocity, Acceleration',
          intro: 'Three quantities. Three layers of motion. Displacement is position change. Velocity is how fast displacement changes. Acceleration is how fast velocity changes.',
          questions: [
            {
              id: 'k1-q1', type: 'mcq',
              prompt: 'A car travels 100 m east in 5 s, then 60 m west in 3 s. Average speed over whole trip:',
              options: ['10 m/s', '20 m/s', '5 m/s', '8 m/s'],
              correct: 1,
              explanation: 'Average speed = total distance / total time = (100 + 60) / (5 + 3) = 160/8 = 20 m/s.',
            },
            {
              id: 'k1-q2', type: 'mcq',
              prompt: 'Same car. Average VELOCITY over the whole trip?',
              options: ['20 m/s east', '5 m/s east', '8 m/s west', '0 m/s'],
              correct: 1,
              explanation: 'Displacement = 100 − 60 = 40 m east. Average velocity = 40/8 = 5 m/s east.',
            },
            {
              id: 'k1-q3', type: 'mcq',
              prompt: 'A car slows from 30 m/s to 10 m/s in 4 s. Acceleration:',
              options: ['5 m/s² forward', '−5 m/s² (deceleration)', '7.5 m/s² forward', '10 m/s² backward'],
              correct: 1,
              explanation: 'a = Δv/Δt = (10 − 30)/4 = −5 m/s². Negative = deceleration.',
            },
            {
              id: 'k1-q4', type: 'fill',
              prompt: 'Ball thrown upward at 20 m/s. g = −10 m/s². After 3 s, velocity is ___ m/s.',
              answer: '-10',
              aliases: ['-10 m/s', '10 m/s downward', '−10'],
              explanation: 'v = u + at = 20 + (−10)(3) = −10 m/s. Negative = moving downward.',
            },
          ],
        },
        {
          id: 'suvat',
          title: 'The Kinematic Equations (SUVAT)',
          intro: 'Five variables. Five equations. You always know three and want a fourth. The equations assume constant acceleration. They are consequences of the definitions above.',
          questions: [
            {
              id: 'k2-q1', type: 'mcq',
              prompt: 'Car accelerates from rest at 3 m/s² for 6 s. Final velocity:',
              options: ['9 m/s', '18 m/s', '36 m/s', '0.5 m/s'],
              correct: 1,
              explanation: 'v = u + at = 0 + 3 × 6 = 18 m/s.',
            },
            {
              id: 'k2-q2', type: 'fill',
              prompt: 'Rest, 4 m/s², 5 s. Distance travelled: ___ m.',
              answer: '50',
              aliases: ['50 m'],
              explanation: 's = ut + ½at² = 0 + ½(4)(25) = 50 m',
            },
            {
              id: 'k2-q3', type: 'mcq',
              prompt: 'Ball dropped from rest, falls 3 s (g = 10 m/s²). Distance fallen:',
              options: ['15 m', '30 m', '45 m', '90 m'],
              correct: 2,
              explanation: 's = ½gt² = ½(10)(9) = 45 m',
            },
            {
              id: 'k2-q4', type: 'mcq',
              prompt: 'Want final velocity but don\'t know time. Which equation?',
              options: ['v = u + at', 's = ut + ½at²', 'v² = u² + 2as', 's = ½(u+v)t'],
              correct: 2,
              explanation: 'v² = u² + 2as needs s, u, a, v — no t needed.',
            },
            {
              id: 'k2-q5', type: 'fill',
              prompt: 'Car going 20 m/s brakes to rest over 40 m. Deceleration: ___ m/s².',
              answer: '5',
              aliases: ['5 m/s²', '-5', '-5 m/s²'],
              explanation: '0 = 400 + 2a(40) → a = −5 m/s². Magnitude = 5 m/s².',
            },
          ],
        },
      ],
    },

    {
      id: 'momentum',
      name: 'Momentum & Impulse',
      icon: 'ri-arrow-right-circle-line',
      description: 'The quantity that tells you how hard something is to stop.',
      tier: 3,
      prerequisiteIds: ['newtons-laws'],
      lessons: [
        {
          id: 'momentum-intro',
          title: 'What is momentum?',
          intro: 'Momentum is mass times velocity. It is one of the most conserved things in the universe.',
          questions: [
            {
              id: 'm1-q1', type: 'fill',
              prompt: 'A 3 kg ball moving at 8 m/s east has momentum ___ kg⋅m/s east.',
              answer: '24',
              aliases: ['24 kg m/s', '24 kgm/s'],
              explanation: 'p = mv = 3 × 8 = 24 kg⋅m/s east.',
            },
            {
              id: 'm1-q2', type: 'mcq',
              prompt: 'Law of conservation of momentum states:',
              options: [
                'Momentum stays constant only when no forces act',
                'Total momentum of a system stays constant if no external net force acts',
                'Momentum is always conserved, no matter what',
                'Individual momenta are conserved; total can change',
              ],
              correct: 1,
              explanation: 'Conservation of momentum requires no external net force. Internal forces do not change total momentum.',
            },
            {
              id: 'm1-q3', type: 'mcq',
              prompt: 'Two ice skaters (60 kg each) stand still. One pushes the other. Skater A moves left at 3 m/s. Skater B:',
              options: ['Left at 3 m/s too', 'Right at 3 m/s', 'Right at 6 m/s', 'Stays still'],
              correct: 1,
              explanation: 'Initial p = 0. p_A = −180 kg⋅m/s. So p_B = +180 = 60v_B → v_B = 3 m/s right.',
            },
            {
              id: 'm1-q4', type: 'mcq',
              prompt: '0.5 kg ball hits wall at 10 m/s, bounces back at 8 m/s. Change in momentum magnitude:',
              options: ['1 kg⋅m/s', '9 kg⋅m/s', '5 kg⋅m/s', '4 kg⋅m/s'],
              correct: 1,
              explanation: '|Δp| = m|Δv| = 0.5 × |−8 − 10| = 0.5 × 18 = 9 kg⋅m/s.',
            },
          ],
        },
        {
          id: 'impulse',
          title: 'Impulse — the why behind momentum change',
          intro: 'Impulse is force times time. It equals the change in momentum. This is why airbags work — spread the force over more time, reduce the peak force.',
          questions: [
            {
              id: 'imp-q1', type: 'mcq',
              prompt: 'Impulse = FΔt. It equals:',
              options: ['Kinetic energy change', 'Change in momentum (Δp)', 'Average velocity × time', 'Work done'],
              correct: 1,
              explanation: 'Impulse-momentum theorem: FΔt = Δp = mΔv. Follows from F = ma = m(Δv/Δt).',
            },
            {
              id: 'imp-q2', type: 'mcq',
              prompt: 'An airbag increases impact time from 0.01 s to 0.15 s for the same momentum change. Force on driver:',
              options: ['Greater', 'Reduced by a factor of 15', 'Unchanged', 'Doubled'],
              correct: 1,
              explanation: 'FΔt = constant. If Δt increases 15×, F decreases 15×. This is why airbags, crumple zones, and sports mats work.',
            },
            {
              id: 'imp-q3', type: 'fill',
              prompt: '0.2 kg ball changes velocity from +4 m/s to −6 m/s. Impulse applied: ___ N⋅s.',
              answer: '-2',
              aliases: ['−2 N⋅s', '-2 Ns', '−2'],
              explanation: 'J = m(v_f − v_i) = 0.2(−6 − 4) = −2 N⋅s.',
            },
          ],
        },
        {
          id: 'collisions',
          title: 'Elastic vs Inelastic Collisions',
          intro: 'In every collision, momentum is conserved. Kinetic energy is only conserved in elastic collisions. Real-world collisions are inelastic — they convert KE to heat and deformation.',
          questions: [
            {
              id: 'col-q1', type: 'mcq',
              prompt: 'In an elastic collision:',
              options: ['Only momentum is conserved', 'Only KE is conserved', 'Both momentum AND KE are conserved', 'Neither is conserved'],
              correct: 2,
              explanation: 'Elastic: KE and momentum both conserved. Approximately true for billiard balls, exactly true at atomic level.',
            },
            {
              id: 'col-q2', type: 'mcq',
              prompt: 'Two lumps of clay collide and stick together. This is:',
              options: ['Elastic', 'Perfectly inelastic', 'Perfectly elastic', 'Not a collision'],
              correct: 1,
              explanation: 'Sticking together = perfectly inelastic. Maximum KE is lost. But momentum is still conserved.',
            },
            {
              id: 'col-q3', type: 'fill',
              prompt: '2 kg cart at 6 m/s hits stationary 4 kg cart; they stick. Final velocity = ___ m/s.',
              answer: '2',
              aliases: ['2 m/s'],
              explanation: '2(6) = 6 × v_f → v_f = 2 m/s.',
            },
          ],
        },
      ],
    },

    {
      id: 'work-energy',
      name: 'Work & Energy',
      icon: 'ri-flashlight-line',
      description: 'Energy as the currency of physics. Work is how you transfer it.',
      tier: 3,
      prerequisiteIds: ['newtons-laws', 'kinematics'],
      lessons: [
        {
          id: 'work-intro',
          title: 'Work — force through a distance',
          intro: 'Work is not effort. Holding a heavy weight stationary does zero work in physics. Work = Force × displacement in the direction of the force.',
          questions: [
            {
              id: 'w1-q1', type: 'mcq',
              prompt: 'Push box with 30 N, moves 5 m in the direction of push. Work done:',
              options: ['6 J', '35 J', '150 J', '25 J'],
              correct: 2,
              explanation: 'W = Fd = 30 × 5 = 150 J.',
            },
            {
              id: 'w1-q2', type: 'mcq',
              prompt: 'Person carries 20 kg box horizontally across a room. Gravity does:',
              options: ['Positive work', 'Negative work', 'Zero work', 'Cannot be determined'],
              correct: 2,
              explanation: 'W = Fd cos θ. Angle between gravity (down) and displacement (horizontal) = 90°. cos 90° = 0.',
            },
            {
              id: 'w1-q3', type: 'mcq',
              prompt: 'You push a box but it doesn\'t move (stuck against wall). Work done:',
              options: ['Positive', 'Negative', 'Zero — no displacement', 'Equals force × time'],
              correct: 2,
              explanation: 'W = Fd. d = 0, so W = 0 regardless of force.',
            },
          ],
        },
        {
          id: 'energy-types',
          title: 'Kinetic and Potential Energy',
          intro: 'KE = ½mv². GPE = mgh. They convert into each other constantly — and their sum stays constant when no external forces do work.',
          questions: [
            {
              id: 'e1-q1', type: 'fill',
              prompt: 'A 2 kg ball moving at 10 m/s has KE ___ J.',
              answer: '100',
              aliases: ['100 J'],
              explanation: 'KE = ½mv² = ½ × 2 × 100 = 100 J',
            },
            {
              id: 'e1-q2', type: 'mcq',
              prompt: 'Ball dropped from rest at height h. Just before hitting ground, KE equals:',
              options: ['½mv_max', 'mgh (initial GPE)', 'mgh/2', '2mgh'],
              correct: 1,
              explanation: 'All GPE converts to KE. KE at bottom = mgh.',
            },
            {
              id: 'e1-q3', type: 'mcq',
              prompt: 'Work-energy theorem states:',
              options: [
                'Work = force × time',
                'Net work done on an object = change in KE',
                'Work and energy are the same thing',
                'All work converts to heat',
              ],
              correct: 1,
              explanation: 'W_net = ΔKE. This connects forces (dynamics) to energy (kinematics).',
            },
            {
              id: 'e1-q4', type: 'mcq',
              prompt: 'Doubling speed increases KE by:',
              options: ['A factor of 2', 'A factor of 4 (scales with v²)', 'A factor of 8', 'A factor of √2'],
              correct: 1,
              explanation: 'KE = ½mv². Double v: KE quadruples. This is why high-speed crashes are far more dangerous.',
            },
          ],
        },
        {
          id: 'conservation-energy',
          title: 'Conservation of Energy',
          intro: 'Energy cannot be created or destroyed — only converted. In a closed system with no friction, total mechanical energy (KE + GPE) is constant.',
          questions: [
            {
              id: 'ce-q1', type: 'mcq',
              prompt: '1 kg ball dropped from 5 m (g = 10). Speed just before impact:',
              options: ['5 m/s', '10 m/s', '50 m/s', '7.07 m/s'],
              correct: 1,
              explanation: 'mgh = ½mv² → v = √(2gh) = √100 = 10 m/s.',
            },
            {
              id: 'ce-q2', type: 'mcq',
              prompt: 'A pendulum swings from height h. Ignoring air resistance, it reaches the other side at:',
              options: ['Less than h', 'Exactly h', 'Greater than h', 'Zero'],
              correct: 1,
              explanation: 'No friction → total mechanical energy constant → same height.',
            },
            {
              id: 'ce-q3', type: 'mcq',
              prompt: '2 kg box slides down 3 m frictionless ramp (30°). Speed at bottom:',
              options: ['5.5 m/s', '7.75 m/s', '5 m/s', '√30 ≈ 5.5 m/s'],
              correct: 3,
              explanation: 'h = 3 sin30° = 1.5 m. GPE = 30 J = ½mv². v = √30 ≈ 5.5 m/s.',
            },
          ],
        },
      ],
    },

    // ── TIER 4 ───────────────────────────────────────────────
    {
      id: 'projectile-motion',
      name: 'Projectile Motion',
      icon: 'ri-arrow-up-right-line',
      description: 'Two independent motions happening simultaneously.',
      tier: 4,
      prerequisiteIds: ['kinematics', 'vectors'],
      lessons: [
        {
          id: 'proj-intro',
          title: 'Horizontal and vertical are independent',
          intro: 'A projectile has no horizontal force. So horizontal velocity is constant. Vertically, gravity acts. Treat them as two separate 1D problems — that is the entire method.',
          questions: [
            {
              id: 'p1-q1', type: 'mcq',
              prompt: 'Ball thrown horizontally at 15 m/s from a cliff. Horizontal velocity after 3 s:',
              options: ['0 m/s', '15 m/s', '15 + 3g m/s', '3g m/s'],
              correct: 1,
              explanation: 'No horizontal force → horizontal velocity stays 15 m/s forever.',
            },
            {
              id: 'p1-q2', type: 'mcq',
              prompt: 'Ball dropped vertically vs ball thrown horizontally from same height. Which hits ground first?',
              options: ['The dropped ball', 'The thrown ball', 'Same time', 'Depends on speed'],
              correct: 2,
              explanation: 'Both have the same initial vertical velocity (zero) and same acceleration (g). Horizontal velocity makes no difference.',
            },
            {
              id: 'p1-q3', type: 'fill',
              prompt: 'Thrown horizontally at 20 m/s, takes 4 s to land. Horizontal distance: ___ m.',
              answer: '80',
              aliases: ['80 m'],
              explanation: 'x = v_x × t = 20 × 4 = 80 m.',
            },
            {
              id: 'p1-q4', type: 'fill',
              prompt: 'Same ball, 4 s fall, g = 10 m/s². Height of cliff: ___ m.',
              answer: '80',
              aliases: ['80 m'],
              explanation: 'h = ½gt² = ½ × 10 × 16 = 80 m.',
            },
            {
              id: 'p1-q5', type: 'mcq',
              prompt: 'Ball launched at 30° at 40 m/s. Initial vertical component:',
              options: ['40 cos30° ≈ 34.6 m/s', '40 sin30° = 20 m/s', '40 tan30° ≈ 23.1 m/s', '40 m/s'],
              correct: 1,
              explanation: 'Vertical = v₀ sin θ = 40 × 0.5 = 20 m/s.',
            },
          ],
        },
        {
          id: 'proj-range',
          title: 'Range, peak height, and time of flight',
          intro: 'For any projectile: how high? How long? How far? Each solved by applying kinematics to one axis at a time.',
          questions: [
            {
              id: 'p2-q1', type: 'mcq',
              prompt: 'To find maximum height of a projectile:',
              options: [
                'Use horizontal equations only',
                'Vertical: v_y = 0 at peak, use v² = u² + 2as',
                'Total speed = 0 at peak',
                'Use the range formula',
              ],
              correct: 1,
              explanation: 'At peak, v_y = 0. Use v_y² = u_y² − 2gh → h = u_y²/(2g).',
            },
            {
              id: 'p2-q2', type: 'mcq',
              prompt: 'At what launch angle is horizontal range maximised?',
              options: ['30°', '45°', '60°', '90°'],
              correct: 1,
              explanation: '45° maximises range. Angles that are complements (30° and 60°) give the same range.',
            },
            {
              id: 'p2-q3', type: 'mcq',
              prompt: 'Launch at 45°, 20 m/s, g = 10. Time to reach max height:',
              options: ['1 s', '√2 s ≈ 1.41 s', '2 s', '0.5 s'],
              correct: 1,
              explanation: 'v_y₀ = 20/√2 ≈ 14.1 m/s. t = v_y₀/g = 14.1/10 ≈ 1.41 s.',
            },
          ],
        },
      ],
    },

    {
      id: 'circular-motion',
      name: 'Circular Motion',
      icon: 'ri-refresh-line',
      description: 'Constant speed, but always accelerating — because direction changes.',
      tier: 4,
      prerequisiteIds: ['newtons-laws', 'kinematics'],
      lessons: [
        {
          id: 'circular-intro',
          title: 'Why circular motion needs a force',
          intro: 'If you swing a ball on a string and let go, it flies off in a straight line. The string was providing the inward force. Without it, Newton\'s 1st law takes over.',
          questions: [
            {
              id: 'c1-q1', type: 'mcq',
              prompt: 'A ball moves in a circle at constant speed. Its velocity is:',
              options: [
                'Constant in both magnitude and direction',
                'Changing in direction but constant in magnitude',
                'Changing in magnitude but constant in direction',
                'Constant — nothing is pushing it sideways',
              ],
              correct: 1,
              explanation: 'Speed is constant. Direction changes continuously. Changing direction means changing velocity → the object is accelerating even at constant speed.',
            },
            {
              id: 'c1-q2', type: 'mcq',
              prompt: 'Centripetal acceleration always points:',
              options: ['In the direction of motion', 'Outward from centre', 'Toward the centre', 'Perpendicular to radius and velocity'],
              correct: 2,
              explanation: 'Centripetal = "centre-seeking." The acceleration points inward, toward the centre.',
            },
            {
              id: 'c1-q3', type: 'fill',
              prompt: '0.5 kg ball, radius 2 m, speed 4 m/s. Centripetal force: ___ N.',
              answer: '4',
              aliases: ['4 N'],
              explanation: 'F_c = mv²/r = 0.5 × 16 / 2 = 4 N.',
            },
            {
              id: 'c1-q4', type: 'mcq',
              prompt: '"Centrifugal force" — the feeling of being flung outward in a turning car — is:',
              options: [
                'A real force from the engine',
                'Not a real force — it is inertia. Your body wants to go straight.',
                'Gravity acting sideways',
                'Friction from the seat',
              ],
              correct: 1,
              explanation: 'Centrifugal force is fictitious — it does not exist in an inertial frame. What you feel is your inertia resisting the change in direction.',
            },
            {
              id: 'c1-q5', type: 'mcq',
              prompt: 'Speed doubles (same radius). Centripetal force:',
              options: ['Doubles', 'Quadruples (scales with v²)', 'Halves', 'Stays the same'],
              correct: 1,
              explanation: 'F_c = mv²/r. Double v → quadruple F_c. This is why highway curves need lower speed limits.',
            },
          ],
        },
      ],
    },

    // ── TIER 5 ───────────────────────────────────────────────
    {
      id: 'gravitation',
      name: 'Gravitation',
      icon: 'ri-earth-line',
      description: "Newton's universal law and the orbits that follow from it.",
      tier: 5,
      prerequisiteIds: ['circular-motion'],
      lessons: [
        {
          id: 'gravity-law',
          title: "Newton's Law of Universal Gravitation",
          intro: 'Every mass attracts every other mass. The force depends on both masses and the square of the distance. Double the distance: force drops to one quarter. This inverse-square law explains everything from falling apples to planetary orbits.',
          questions: [
            {
              id: 'g1-q1', type: 'mcq',
              prompt: 'Gravitational force between two objects is proportional to:',
              options: [
                'Sum of their masses',
                'Product of their masses, divided by square of their separation',
                'Square of each mass separately',
                'Cube of the distance',
              ],
              correct: 1,
              explanation: 'F = Gm₁m₂/r². Both masses matter equally. Distance squared in denominator — inverse-square law.',
            },
            {
              id: 'g1-q2', type: 'mcq',
              prompt: 'Satellite moved to twice its original distance from Earth. Gravitational force becomes:',
              options: ['Half', 'Quarter', 'Double', 'Unchanged'],
              correct: 1,
              explanation: 'F ∝ 1/r². Double r → F/4.',
            },
            {
              id: 'g1-q3', type: 'mcq',
              prompt: 'Astronaut in the ISS feels "weightless." This is because:',
              options: [
                'There is no gravity in space',
                'Gravity is balanced by centrifugal force',
                'The ISS and astronaut are both in free fall toward Earth at the same rate',
                'The ISS shields them from gravity',
              ],
              correct: 2,
              explanation: 'The ISS is in free fall — moving sideways fast enough to keep missing Earth. Astronaut falls at same rate as station. Gravity is still ~89% of surface value at ISS altitude.',
            },
            {
              id: 'g1-q4', type: 'mcq',
              prompt: 'Kepler\'s 3rd law (T² ∝ r³). A planet further from the Sun:',
              options: [
                'Moves faster — more distance to cover',
                'Moves slower — weaker gravity, longer period',
                'Moves at the same speed',
                'Spins faster on its axis',
              ],
              correct: 1,
              explanation: 'Further → weaker gravity → smaller centripetal acceleration → slower speed → much longer period. Mars: 1.88 years. Jupiter: 11.86 years.',
            },
          ],
        },
      ],
    },

  ],
}

export default dynamics
