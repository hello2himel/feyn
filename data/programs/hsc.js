import physics     from '../subjects/hsc/physics.js'
import chemistry   from '../subjects/hsc/chemistry.js'
import mathematics from '../subjects/hsc/mathematics.js'
import biology     from '../subjects/hsc/biology.js'

const hsc = {
  id: 'hsc',
  name: 'HSC',
  type: 'class',
  description: 'Higher Secondary Certificate — full coverage coming soon.',
  icon: 'ri-graduation-cap-line',
  subjects: [physics, chemistry, mathematics, biology],
}

export default hsc
