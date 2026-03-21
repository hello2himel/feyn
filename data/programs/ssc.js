import physics     from '../subjects/ssc/physics.js'
import chemistry   from '../subjects/ssc/chemistry.js'
import mathematics from '../subjects/ssc/mathematics.js'
import biology     from '../subjects/ssc/biology.js'

const ssc = {
  id: 'ssc',
  name: 'SSC',
  type: 'class',
  description: 'Secondary School Certificate — coming soon.',
  icon: 'ri-book-open-line',
  subjects: [physics, chemistry, mathematics, biology],
}

export default ssc
