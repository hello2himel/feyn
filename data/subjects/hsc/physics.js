import dynamics      from '../../topics/hsc/physics/dynamics.js'
import waves         from '../../topics/hsc/physics/waves.js'
import thermodynamics from '../../topics/hsc/physics/thermodynamics.js'
import electricity   from '../../topics/hsc/physics/electricity.js'
import magnetism     from '../../topics/hsc/physics/magnetism.js'
import modernPhysics from '../../topics/hsc/physics/modern-physics.js'

const physics = {
  id: 'physics',
  name: 'Physics',
  icon: 'ri-rocket-2-line',
  description: 'From forces to quantum mechanics — built from first principles.',
  coachIds: [],
  topics: [dynamics, waves, thermodynamics, electricity, magnetism, modernPhysics],
}

export default physics
