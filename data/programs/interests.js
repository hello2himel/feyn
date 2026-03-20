import astronomy   from '../subjects/interests/astronomy.js'
import programming from '../subjects/interests/programming.js'
import philosophy  from '../subjects/interests/philosophy.js'
import mathematics from '../subjects/interests/mathematics.js'

const interests = {
  id: 'interests',
  name: 'Interests',
  type: 'genre',
  description: 'Beyond the syllabus. Learn because you are curious.',
  icon: 'ri-compass-discover-line',
  subjects: [astronomy, programming, philosophy, mathematics],
}

export default interests
