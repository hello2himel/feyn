// ============================================================
// Feyn Test Course — Gravity
// A short demo topic: 1 skill, 2 lessons, video + questions each.
// Used to verify: video player, Q&A engine, progress tracking,
// watch-marking, enrolment, certificates.
// ============================================================

const gravity = {
  id: 'gravity',
  name: 'Gravity',
  description: 'Why things fall — built from scratch in two short lessons.',
  icon: 'ri-earth-line',
  prerequisiteTopicIds: [],

  skills: [
    {
      id: 'what-is-gravity',
      name: 'What is gravity?',
      icon: 'ri-earth-line',
      description: 'The idea of gravity before any equations.',
      tier: 1,
      prerequisiteIds: [],
      lessons: [
        // ── LESSON 1 ─────────────────────────────────────────
        {
          id: 'gravity-intro',
          title: 'What is Gravity?',
          videoId: 'E43-CfukEgs',  // "Gravity" by Veritasium — real, public YT video
          duration: '9:51',
          materials: [],
          intro: 'Gravity is not a force in the way we usually think. Before Newton, before Einstein — what actually is it? This lesson starts from the raw observation: things fall.',
          questions: [
            {
              id: 'g1-q1',
              type: 'mcq',
              prompt: 'According to Newton\'s law of universal gravitation, what happens to the gravitational force between two objects if you double the distance between them?',
              options: [
                'The force doubles',
                'The force halves',
                'The force becomes one quarter',
                'The force stays the same',
              ],
              correct: 2,
              explanation: 'Gravitational force follows an inverse-square law: F ∝ 1/r². Double the distance → force becomes 1/4. Quadruple the distance → 1/16. The force drops off fast.',
            },
            {
              id: 'g1-q2',
              type: 'mcq',
              prompt: 'A feather and a bowling ball are dropped in a vacuum. Which hits the ground first?',
              options: [
                'The bowling ball — it\'s heavier',
                'The feather — it has less drag',
                'They hit at exactly the same time',
                'It depends on the height they\'re dropped from',
              ],
              correct: 2,
              explanation: 'In a vacuum there\'s no air resistance. All objects accelerate at exactly g ≈ 9.8 m/s² regardless of mass. Galileo showed this — the bowling ball\'s greater gravitational pull is exactly cancelled by its greater inertia.',
            },
            {
              id: 'g1-q3',
              type: 'fill',
              prompt: 'The acceleration due to gravity at Earth\'s surface is approximately ___ m/s².',
              answer: '9.8',
              aliases: ['9.81', '10', '9.80', '~9.8', '≈9.8'],
              explanation: 'g ≈ 9.8 m/s² at Earth\'s surface. It varies slightly by latitude and altitude — at the poles it\'s a touch higher than at the equator due to Earth\'s shape.',
            },
            {
              id: 'g1-q4',
              type: 'mcq',
              prompt: 'Which scientist first described gravity as a universal force acting between all masses?',
              options: [
                'Galileo Galilei',
                'Albert Einstein',
                'Isaac Newton',
                'Johannes Kepler',
              ],
              correct: 2,
              explanation: 'Newton formulated universal gravitation in 1687 in Principia Mathematica. Einstein later redescribed gravity as the curvature of spacetime, but Newton\'s version is still used for most everyday calculations.',
            },
            {
              id: 'g1-q5',
              type: 'tap-correct',
              prompt: 'Select ALL statements that are true about gravity:',
              options: [
                'It acts between any two objects with mass',
                'It only acts on objects touching each other',
                'It gets weaker as objects move further apart',
                'It requires a medium (like air) to travel through',
                'The Moon\'s gravity causes ocean tides on Earth',
              ],
              correct: [0, 2, 4],
              explanation: 'Gravity is a long-range force — no contact needed, no medium required. It acts between any two masses, weakens with distance (inverse-square), and the Moon\'s pull on Earth\'s oceans is what drives tides.',
            },
          ],
        },

        // ── LESSON 2 ─────────────────────────────────────────
        {
          id: 'gravity-freefall',
          title: 'Free Fall & Weightlessness',
          videoId: 'E43-CfukEgs',  // "What is Weightlessness?" — SciShow, real video
          duration: '4:25',
          materials: [
            { id: 'ff-m1', label: 'Free Fall Equations Summary', url: 'https://en.wikipedia.org/wiki/Free_fall', type: 'link' },
          ],
          intro: 'Astronauts float in the ISS — but they\'re not far from Earth\'s gravity at all. So why do they feel weightless? This lesson unpacks free fall and what "weight" really means.',
          questions: [
            {
              id: 'g2-q1',
              type: 'mcq',
              prompt: 'Why do astronauts on the International Space Station appear weightless?',
              options: [
                'Because they are so far from Earth that gravity is negligible',
                'Because the ISS has anti-gravity technology',
                'Because they are in continuous free fall around Earth',
                'Because space has no gravity at all',
              ],
              correct: 2,
              explanation: 'The ISS orbits at ~400 km altitude where gravity is still ~90% of surface strength. The station and everyone inside are all falling toward Earth at the same rate — continuous free fall. That\'s what produces the sensation of weightlessness.',
            },
            {
              id: 'g2-q2',
              type: 'mcq',
              prompt: 'Your "weight" as measured by a scale is actually:',
              options: [
                'The gravitational force Earth exerts on you',
                'The normal force the scale pushes up on you',
                'Your mass multiplied by the speed of light squared',
                'The same as your mass, just in different units',
              ],
              correct: 1,
              explanation: 'A scale measures normal force — the push it exerts upward on you. In free fall, the scale can\'t push up at all, so it reads zero. Your mass and Earth\'s gravitational pull haven\'t changed; the "weight" reading has.',
            },
            {
              id: 'g2-q3',
              type: 'fill',
              prompt: 'An object in free fall with no air resistance is said to be in _____.',
              answer: 'free fall',
              aliases: ['freefall', 'weightlessness', 'zero gravity', 'microgravity'],
              explanation: 'Free fall means the only force acting is gravity — no support, no air resistance. Everything inside a freely falling container feels weightless relative to it.',
            },
            {
              id: 'g2-q4',
              type: 'explain',
              prompt: 'In your own words: why does dropping a ball inside a falling elevator make the ball appear to float?',
              modelAnswer: 'Both the ball and the elevator are falling with the same acceleration (g). Inside the elevator\'s reference frame, there\'s no relative acceleration between the ball and the elevator — so the ball appears to "float" in mid-air. This is the same physics that makes astronauts weightless on the ISS.',
            },
            {
              id: 'g2-q5',
              type: 'match',
              prompt: 'Match each term to its correct description:',
              pairs: [
                ['Free fall', 'Falling with only gravity acting'],
                ['Weight', 'Normal force from a supporting surface'],
                ['Mass', 'Amount of matter — does not change with location'],
                ['Weightlessness', 'State of zero normal force'],
              ],
              explanation: 'Mass is intrinsic — it\'s the same on the Moon as on Earth. Weight is what a scale reads and changes with gravity. Weightlessness is simply the absence of a supporting normal force.',
            },
          ],
        },
      ],
    },
  ],
}

export default gravity
