import physics     from '../subjects/ssc/physics.js'
import chemistry   from '../subjects/ssc/chemistry.js'
import mathematics from '../subjects/ssc/mathematics.js'
import biology     from '../subjects/ssc/biology.js'

const ssc = {
  id: 'ssc',
  name: 'SSC',
  type: 'class',
  description: 'Secondary School Certificate — built from scratch, one idea at a time.',
  icon: 'ri-book-open-line',
  subjects: [physics, chemistry, mathematics, biology],
}

export default ssc
