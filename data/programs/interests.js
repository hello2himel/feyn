import astronomy    from '../subjects/interests/astronomy.js'
import mathematics  from '../subjects/interests/mathematics.js'
import philosophy   from '../subjects/interests/philosophy.js'
import programming  from '../subjects/interests/programming.js'

const interests = {
  id: 'interests',
  name: 'Interests',
  type: 'interest',
  description: 'Curiosity-driven courses beyond the syllabus — coming soon.',
  icon: 'ri-compass-discover-line',
  subjects: [astronomy, mathematics, philosophy, programming],
}

export default interests
