// ============================================================
// FEYN — COURSE DATA
// Taxonomy:
//   Level 0: programs  = Classes (HSC, SSC, Grade 7…) OR Interests (Music, Tech…)
//             type: 'class' | 'interest'
//   Level 1: subjects  = Courses  (Physics, Guitar, Python…)
//   Level 2: topics    = Chapters/Topics
//   Level 3: lessons   = Video lessons
// ============================================================

export const coaches = [
  {
    id: "himel",
    name: "Himel",
    title: "Founder & Lead Instructor",
    bio: "Builds every concept from the ground up using the Feynman technique. Teaches HSC Math and Physics.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "https://hello2himel.netlify.app" }
  },
  {
    id: "ashiqur",
    name: "Md. Ashiqur Rahman",
    title: "Chemistry Instructor",
    bio: "Specialist in HSC Chemistry. Known for making organic reactions intuitive and memorable.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "" }
  },
  {
    id: "nadia",
    name: "Nadia Islam",
    title: "Biology & Science Instructor",
    bio: "Brings biology to life with diagrams, analogies, and real-world examples. Teaches SSC and HSC Bio.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "" }
  },
  {
    id: "rafiq",
    name: "Rafiqul Hasan",
    title: "Mathematics Instructor",
    bio: "Specialist in SSC and JSC mathematics. Focuses on problem-solving strategies.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "" }
  },
  {
    id: "sara",
    name: "Sara Ahmed",
    title: "English & Literature Instructor",
    bio: "Teaches English grammar, writing, and literature appreciation at all levels.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "" }
  },
  {
    id: "tanvir",
    name: "Tanvir Hossain",
    title: "Programming & Technology Instructor",
    bio: "Self-taught developer turned educator. Teaches Python, web dev, and CS fundamentals.",
    avatar: null, signature: null,
    socials: { youtube: "https://youtube.com", website: "" }
  },
  {
    id: "mitu",
    name: "Mitu Barua",
    title: "Music & Arts Instructor",
    bio: "Classical vocalist and music theorist. Makes music theory accessible to complete beginners.",
    avatar: null, signature: null,
    socials: { youtube: "", website: "" }
  }
]

const data = {
  programs: [

    // ── CLASS: HSC ─────────────────────────────────────────────────────
    {
      id: "hsc",
      name: "HSC",
      type: "class",
      description: "Higher Secondary Certificate — complete Science, Humanities and Commerce coverage.",
      subjects: [
        {
          id: "hsc-physics",
          name: "Physics",
          icon: "ri-flashlight-line",
          description: "From Newtonian mechanics to modern physics — built from first principles.",
          coachIds: ["himel"],
          certificate: true,
          materials: [
            { id: "hsc-phys-m1", label: "HSC Physics Formula Sheet", url: "#", type: "pdf" }
          ],
          topics: [
            {
              id: "kinematics",
              name: "Kinematics",
              description: "Position, velocity, acceleration and the language of motion.",
              coachIds: ["himel"],
              lessons: [
                { id: "what-is-motion", title: "What is Motion?", videoId: "GtOt7Os41iE", duration: "11:00", description: "Before equations — what does it actually mean for something to move?", materials: [] },
                { id: "velocity-vs-speed", title: "Velocity vs Speed", videoId: "DRb5PSxJerM", duration: "9:45", description: "Why direction matters: the difference between scalar and vector quantities.", materials: [] },
                { id: "acceleration", title: "Acceleration Explained", videoId: "FOkQszg1-j8", duration: "12:20", description: "What acceleration really is — and why it confuses people.", materials: [] },
                { id: "equations-of-motion", title: "Equations of Motion", videoId: "VYgSXBjEA8I", duration: "15:10", description: "Deriving the four kinematic equations from intuition, not memorisation.", materials: [{ id: "m-eom", label: "Equations Cheat Sheet", url: "#", type: "pdf" }] }
              ]
            },
            {
              id: "dynamics",
              name: "Dynamics & Newton's Laws",
              description: "Forces, mass, inertia — why things move the way they do.",
              coachIds: ["himel"],
              lessons: [
                { id: "newtons-first", title: "Newton's First Law", videoId: "CQYgIBDFDlo", duration: "10:30", description: "Inertia and the natural state of objects. Why do moving things keep moving?", materials: [] },
                { id: "newtons-second", title: "F = ma — What It Really Means", videoId: "ou9YMWlJgkE", duration: "13:45", description: "The second law unpacked — force, mass, and acceleration.", materials: [] },
                { id: "newtons-third", title: "Action & Reaction", videoId: "By-ggTfeuJU", duration: "11:00", description: "Every force has a pair. Understanding Newton's third law deeply.", materials: [] }
              ]
            },
            {
              id: "thermodynamics",
              name: "Thermodynamics",
              description: "Heat, temperature, and the laws that govern energy transfer.",
              coachIds: ["himel"],
              lessons: [
                { id: "what-is-heat", title: "What is Heat?", videoId: "vqDbMEdLiCs", duration: "13:20", description: "Heat as energy in transit — the microscopic picture.", materials: [] },
                { id: "temperature-scales", title: "Temperature Scales", videoId: "O7zZPqar50g", duration: "8:30", description: "Celsius, Kelvin, Fahrenheit — and why absolute zero matters.", materials: [] },
                { id: "first-law-thermo", title: "First Law of Thermodynamics", videoId: "4i1MUWJoI0U", duration: "14:00", description: "Conservation of energy applied to heat and work.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "hsc-chemistry",
          name: "Chemistry",
          icon: "ri-flask-line",
          description: "From atomic structure to organic reactions — systematic and intuitive.",
          coachIds: ["ashiqur"],
          certificate: true,
          materials: [],
          topics: [
            {
              id: "atomic-structure",
              name: "Atomic Structure",
              description: "The building blocks of all matter.",
              coachIds: ["ashiqur"],
              lessons: [
                { id: "atoms-intro", title: "What is an Atom?", videoId: "xazQRcSCRaY", duration: "10:00", description: "Protons, neutrons, electrons — and why the atom is mostly empty space.", materials: [] },
                { id: "electron-config", title: "Electron Configuration", videoId: "i5PtaCJJFjw", duration: "14:30", description: "How electrons arrange themselves around the nucleus.", materials: [] },
                { id: "periodic-table", title: "The Periodic Table Explained", videoId: "0RRVV4Diomg", duration: "12:45", description: "Why the periodic table is arranged the way it is — the logic behind it.", materials: [] }
              ]
            },
            {
              id: "chemical-bonding",
              name: "Chemical Bonding",
              description: "Ionic, covalent, and metallic bonds.",
              coachIds: ["ashiqur"],
              lessons: [
                { id: "ionic-bonds", title: "Ionic Bonds", videoId: "CGA8sRwqIFg", duration: "11:15", description: "How atoms transfer electrons to form ionic compounds.", materials: [] },
                { id: "covalent-bonds", title: "Covalent Bonds", videoId: "S90WKAHthbE", duration: "12:00", description: "Sharing electrons — covalent bond formation explained simply.", materials: [] }
              ]
            },
            {
              id: "organic-chemistry",
              name: "Organic Chemistry",
              description: "Carbon compounds and the chemistry of life.",
              coachIds: ["ashiqur"],
              lessons: [
                { id: "intro-organic", title: "Introduction to Organic Chemistry", videoId: "bSMx0NS0XfY", duration: "13:00", description: "Why carbon is special and what makes organic chemistry its own world.", materials: [] },
                { id: "hydrocarbons", title: "Hydrocarbons", videoId: "R_b-MEKp3ZA", duration: "15:30", description: "Alkanes, alkenes, alkynes — naming and properties.", materials: [] },
                { id: "functional-groups", title: "Functional Groups", videoId: "JGkIFAsnWoI", duration: "14:20", description: "The key groups that give organic molecules their properties.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "hsc-math",
          name: "Mathematics",
          icon: "ri-calculator-line",
          description: "Algebra, calculus, vectors — the complete HSC mathematics curriculum.",
          coachIds: ["himel"],
          certificate: true,
          materials: [{ id: "hsc-math-m1", label: "HSC Math Formula Sheet", url: "#", type: "pdf" }],
          topics: [
            {
              id: "linear-algebra",
              name: "Linear Algebra",
              description: "Vectors, matrices, and linear transformations.",
              coachIds: ["himel"],
              lessons: [
                { id: "what-is-a-vector", title: "What is a Vector?", videoId: "fNk_zzaMoSs", duration: "12:30", description: "Intuitive introduction to vectors — geometry before formulas.", materials: [{ id: "l-v1-1", label: "Vector Notes", url: "#", type: "pdf" }] },
                { id: "vector-addition", title: "Vector Addition & Scaling", videoId: "wDJmLJkeXEM", duration: "10:15", description: "How vectors combine — the geometry of addition.", materials: [] },
                { id: "intro-to-matrices", title: "What is a Matrix?", videoId: "rowWM-x7IU8", duration: "14:00", description: "Matrices as linear transformations.", materials: [] },
                { id: "determinants", title: "Determinants", videoId: "Ip3X9LOh2dk", duration: "11:30", description: "What the determinant is really telling you — geometrically.", materials: [] }
              ]
            },
            {
              id: "calculus",
              name: "Calculus",
              description: "Differentiation and integration from first principles.",
              coachIds: ["himel"],
              lessons: [
                { id: "limits", title: "Limits — The Foundation", videoId: "W4pGBBUOAC0", duration: "13:00", description: "What a limit is and why calculus needs it.", materials: [] },
                { id: "derivatives", title: "What is a Derivative?", videoId: "rAof9Ld5sOg", duration: "14:30", description: "The derivative as a rate of change — built from scratch.", materials: [] },
                { id: "integration", title: "Integration Explained", videoId: "rfG8ce4nNh0", duration: "15:00", description: "Anti-derivatives and the area under a curve.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "hsc-biology",
          name: "Biology",
          icon: "ri-microscope-line",
          description: "Cell biology, genetics, ecology — life explained at every scale.",
          coachIds: ["nadia"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "cell-biology",
              name: "Cell Biology",
              description: "The fundamental unit of life.",
              coachIds: ["nadia"],
              lessons: [
                { id: "cell-intro", title: "The Cell — An Overview", videoId: "URUJD5NEXC8", duration: "12:00", description: "Plant vs animal cells, organelles and their roles.", materials: [] },
                { id: "cell-membrane", title: "Cell Membrane & Transport", videoId: "Qqe-yvQhBGs", duration: "11:30", description: "How substances move in and out of cells.", materials: [] }
              ]
            },
            {
              id: "genetics",
              name: "Genetics",
              description: "DNA, heredity, and how traits pass through generations.",
              coachIds: ["nadia"],
              lessons: [
                { id: "dna-structure", title: "DNA Structure", videoId: "aeAL6xThRdE", duration: "13:00", description: "The double helix — how information is stored in DNA.", materials: [] },
                { id: "mendelian-genetics", title: "Mendelian Genetics", videoId: "CB0_D7KTBOI", duration: "14:20", description: "Dominant, recessive, and how traits inherit.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── CLASS: SSC ─────────────────────────────────────────────────────
    {
      id: "ssc",
      name: "SSC",
      type: "class",
      description: "Secondary School Certificate — Grades 9–10 full curriculum.",
      subjects: [
        {
          id: "ssc-math",
          name: "Mathematics",
          icon: "ri-calculator-line",
          description: "Algebra, geometry, and statistics for SSC students.",
          coachIds: ["rafiq"],
          certificate: true,
          materials: [],
          topics: [
            {
              id: "algebra-ssc",
              name: "Algebra",
              description: "Equations, inequalities, and polynomials.",
              coachIds: ["rafiq"],
              lessons: [
                { id: "ssc-linear-eq", title: "Linear Equations", videoId: "bAerID24QJ0", duration: "10:00", description: "Solving one and two variable linear equations step by step.", materials: [] },
                { id: "ssc-quadratic", title: "Quadratic Equations", videoId: "ZBalWWHYFQc", duration: "12:30", description: "Factoring, completing the square, and the quadratic formula.", materials: [] },
                { id: "ssc-polynomials", title: "Polynomials", videoId: "N0L3bTRFC7U", duration: "11:00", description: "Degree, coefficients, and polynomial operations.", materials: [] }
              ]
            },
            {
              id: "geometry-ssc",
              name: "Geometry",
              description: "Triangles, circles, and coordinate geometry.",
              coachIds: ["rafiq"],
              lessons: [
                { id: "triangles", title: "Properties of Triangles", videoId: "eTiGaJ3kl2c", duration: "10:30", description: "Angle sum, congruence, and similarity.", materials: [] },
                { id: "pythagoras", title: "Pythagoras Theorem", videoId: "CAkMUdeB06o", duration: "9:45", description: "Why a² + b² = c² — proof and applications.", materials: [] },
                { id: "circles", title: "Circles & Arcs", videoId: "YqqNAkn7vJs", duration: "11:00", description: "Radius, diameter, circumference, and arc length.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "ssc-science",
          name: "General Science",
          icon: "ri-test-tube-line",
          description: "Physics, chemistry, and biology integrated for SSC.",
          coachIds: ["nadia"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "matter-ssc",
              name: "Matter & Its Properties",
              description: "States of matter, physical and chemical changes.",
              coachIds: ["nadia"],
              lessons: [
                { id: "states-matter", title: "States of Matter", videoId: "WMEovlLrOek", duration: "10:00", description: "Solid, liquid, gas — and plasma. What makes each state different.", materials: [] },
                { id: "physical-vs-chemical", title: "Physical vs Chemical Changes", videoId: "OAn6-W0hNas", duration: "9:30", description: "How to tell whether a change is physical or chemical.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "ssc-english",
          name: "English",
          icon: "ri-book-open-line",
          description: "Grammar, writing, comprehension and literature for SSC.",
          coachIds: ["sara"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "grammar-ssc",
              name: "Grammar Essentials",
              description: "Parts of speech, tenses, and sentence structure.",
              coachIds: ["sara"],
              lessons: [
                { id: "parts-of-speech", title: "Parts of Speech", videoId: "SRpMSjTJ_VQ", duration: "10:30", description: "Nouns, verbs, adjectives, adverbs — the building blocks of English.", materials: [] },
                { id: "verb-tenses", title: "Verb Tenses", videoId: "pnMcqOOXRdw", duration: "12:00", description: "Past, present, future — and the perfect and continuous forms.", materials: [] },
                { id: "passive-voice", title: "Active vs Passive Voice", videoId: "usSMaL0KZFM", duration: "9:45", description: "When and how to use the passive voice correctly.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── CLASS: JSC ─────────────────────────────────────────────────────
    {
      id: "jsc",
      name: "JSC",
      type: "class",
      description: "Junior School Certificate — Grade 8 curriculum.",
      subjects: [
        {
          id: "jsc-math",
          name: "Mathematics",
          icon: "ri-calculator-line",
          description: "Fractions, ratios, basic algebra and geometry.",
          coachIds: ["rafiq"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "fractions-ratios",
              name: "Fractions & Ratios",
              description: "Understanding parts of a whole.",
              coachIds: ["rafiq"],
              lessons: [
                { id: "fractions-intro", title: "What is a Fraction?", videoId: "yg-BGvBM66M", duration: "8:00", description: "Numerator, denominator — and why fractions matter.", materials: [] },
                { id: "ratios", title: "Ratios & Proportions", videoId: "1Rk4eStd7hg", duration: "9:30", description: "How to compare quantities and solve proportion problems.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── CLASS: Grade 6–7 ───────────────────────────────────────────────
    {
      id: "primary",
      name: "Grades 6–7",
      type: "class",
      description: "Foundation topics in maths, science and English for primary upper grades.",
      subjects: [
        {
          id: "primary-math",
          name: "Mathematics",
          icon: "ri-calculator-line",
          description: "Number sense, multiplication, basic geometry.",
          coachIds: ["rafiq"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "number-sense",
              name: "Number Sense",
              description: "Place value, rounding, and number lines.",
              coachIds: ["rafiq"],
              lessons: [
                { id: "place-value", title: "Place Value", videoId: "0x7qRpqFDSI", duration: "7:30", description: "Ones, tens, hundreds — understanding positional notation.", materials: [] },
                { id: "rounding", title: "Rounding Numbers", videoId: "X4bk5FVEUUo", duration: "6:45", description: "How and when to round — with real examples.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── INTEREST: Technology & Programming ────────────────────────────
    {
      id: "tech",
      name: "Technology",
      type: "interest",
      description: "Programming, web development, AI, and digital skills.",
      subjects: [
        {
          id: "python",
          name: "Python Programming",
          icon: "ri-code-line",
          description: "From hello world to real projects — Python for complete beginners.",
          coachIds: ["tanvir"],
          certificate: true,
          materials: [],
          topics: [
            {
              id: "python-basics",
              name: "Python Basics",
              description: "Variables, types, control flow.",
              coachIds: ["tanvir"],
              lessons: [
                { id: "hello-world", title: "Hello World & Setup", videoId: "rfscVS0vtbw", duration: "13:30", description: "Installing Python and writing your first program.", materials: [] },
                { id: "variables", title: "Variables & Data Types", videoId: "TM0pBPn3rrI", duration: "14:00", description: "Storing and manipulating data in Python.", materials: [] },
                { id: "conditionals", title: "If / Else / Elif", videoId: "DZwmZ8Usvnk", duration: "11:00", description: "Making decisions in code.", materials: [] },
                { id: "loops", title: "Loops: For & While", videoId: "OnDr4J2UXSA", duration: "12:30", description: "Repeating actions — iteration in Python.", materials: [] }
              ]
            },
            {
              id: "python-functions",
              name: "Functions & Modules",
              description: "Organising code into reusable pieces.",
              coachIds: ["tanvir"],
              lessons: [
                { id: "functions", title: "Defining Functions", videoId: "9Os0o3wzS_I", duration: "13:00", description: "Why functions exist and how to write good ones.", materials: [] },
                { id: "modules", title: "Importing Modules", videoId: "CqvZ3vGoGs0", duration: "10:30", description: "Using Python's standard library and third-party packages.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "web-dev",
          name: "Web Development",
          icon: "ri-global-line",
          description: "HTML, CSS, JavaScript — build real websites from scratch.",
          coachIds: ["tanvir"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "html-basics",
              name: "HTML Fundamentals",
              description: "The structure of every web page.",
              coachIds: ["tanvir"],
              lessons: [
                { id: "html-intro", title: "What is HTML?", videoId: "ysEN5RaKOlA", duration: "10:00", description: "Tags, elements, and the anatomy of a web page.", materials: [] },
                { id: "html-structure", title: "Document Structure", videoId: "mbeT8mpmtHA", duration: "11:30", description: "Head, body, semantic elements — building the right skeleton.", materials: [] }
              ]
            },
            {
              id: "css-basics",
              name: "CSS Styling",
              description: "Colours, layout, and making pages beautiful.",
              coachIds: ["tanvir"],
              lessons: [
                { id: "css-intro", title: "What is CSS?", videoId: "1PnVor36_40", duration: "9:30", description: "Selectors, properties, and the cascade explained.", materials: [] },
                { id: "flexbox", title: "Flexbox Layout", videoId: "fYq5PXgSsbE", duration: "13:00", description: "The modern way to lay out elements on a page.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── INTEREST: Music ───────────────────────────────────────────────
    {
      id: "music",
      name: "Music",
      type: "interest",
      description: "Theory, instruments, and the joy of making music.",
      subjects: [
        {
          id: "music-theory",
          name: "Music Theory",
          icon: "ri-music-2-line",
          description: "Notes, scales, chords — the grammar of music.",
          coachIds: ["mitu"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "notes-scales",
              name: "Notes & Scales",
              description: "The raw material of music.",
              coachIds: ["mitu"],
              lessons: [
                { id: "what-is-a-note", title: "What is a Note?", videoId: "j5I-_CTCzB0", duration: "9:00", description: "Pitch, frequency, and why certain notes sound the way they do.", materials: [] },
                { id: "major-scale", title: "The Major Scale", videoId: "jQUG1aazSP8", duration: "11:30", description: "Building the major scale — whole steps, half steps, and the pattern.", materials: [] },
                { id: "minor-scale", title: "The Minor Scale", videoId: "gEsFF_hSmQs", duration: "10:45", description: "Natural minor — the scale behind most emotional music.", materials: [] }
              ]
            },
            {
              id: "chords",
              name: "Chords & Harmony",
              description: "How notes combine into chords and progressions.",
              coachIds: ["mitu"],
              lessons: [
                { id: "triads", title: "Triads — The Basic Chord", videoId: "9V8BVKnIxXk", duration: "10:00", description: "Major, minor, diminished, augmented — the four triads.", materials: [] },
                { id: "chord-progressions", title: "Chord Progressions", videoId: "4RT4cqbMOj8", duration: "12:30", description: "Why certain chord sequences feel resolved, tense, or emotional.", materials: [] }
              ]
            }
          ]
        },
        {
          id: "guitar",
          name: "Guitar for Beginners",
          icon: "ri-guitar-line",
          description: "Pick up a guitar and play your first songs.",
          coachIds: ["mitu"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "guitar-basics",
              name: "Getting Started",
              description: "Holding, tuning, and your first chords.",
              coachIds: ["mitu"],
              lessons: [
                { id: "guitar-anatomy", title: "Parts of a Guitar", videoId: "oieMaHvCmWs", duration: "7:30", description: "Know your instrument before you play it.", materials: [] },
                { id: "first-chords", title: "Your First Three Chords", videoId: "HqTnUAUjPFI", duration: "12:00", description: "G, C, D — the three chords that unlock hundreds of songs.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── INTEREST: Languages ───────────────────────────────────────────
    {
      id: "languages",
      name: "Languages",
      type: "interest",
      description: "English, Bangla, Arabic and more — language learning for all levels.",
      subjects: [
        {
          id: "english-skills",
          name: "English Communication",
          icon: "ri-chat-quote-line",
          description: "Speaking, writing and comprehension beyond the classroom.",
          coachIds: ["sara"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "speaking-skills",
              name: "Speaking Skills",
              description: "Confidence, clarity, and fluency.",
              coachIds: ["sara"],
              lessons: [
                { id: "pronunciation", title: "English Pronunciation Basics", videoId: "dOgqEsNyiJw", duration: "10:00", description: "Common pronunciation mistakes and how to fix them.", materials: [] },
                { id: "fluency", title: "Building Fluency", videoId: "FQK9x5HQVQ0", duration: "11:30", description: "How to speak more naturally — practical techniques.", materials: [] }
              ]
            }
          ]
        }
      ]
    },

    // ── INTEREST: Art & Design ────────────────────────────────────────
    {
      id: "art",
      name: "Art & Design",
      type: "interest",
      description: "Drawing, digital art, design principles — creative skills for everyone.",
      subjects: [
        {
          id: "drawing-basics",
          name: "Drawing Fundamentals",
          icon: "ri-brush-line",
          description: "Lines, forms, shading — the foundation of all visual art.",
          coachIds: ["mitu"],
          certificate: false,
          materials: [],
          topics: [
            {
              id: "basic-shapes",
              name: "Basic Shapes & Forms",
              description: "Everything is made of simple shapes.",
              coachIds: ["mitu"],
              lessons: [
                { id: "line-control", title: "Line Control", videoId: "q_QjKDK5J2E", duration: "8:30", description: "Straight lines, curves, and pressure — the fundamentals of drawing.", materials: [] },
                { id: "shading", title: "Shading & Value", videoId: "H5sSHLpMNtk", duration: "11:00", description: "How light and shadow create the illusion of 3D form.", materials: [] }
              ]
            }
          ]
        }
      ]
    }

  ]
}

export default data
