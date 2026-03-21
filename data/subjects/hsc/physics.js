import dynamics       from '../../topics/hsc/physics/dynamics.js'
import electricity    from '../../topics/hsc/physics/electricity.js'
import magnetism      from '../../topics/hsc/physics/magnetism.js'
import waves          from '../../topics/hsc/physics/waves.js'
import thermodynamics from '../../topics/hsc/physics/thermodynamics.js'
import modernPhysics  from '../../topics/hsc/physics/modern-physics.js'

const physics = {
  id: 'physics',
  name: 'Physics',
  icon: 'ri-rocket-2-line',
  description: 'HSC 1st & 2nd Paper — from kinematics to quantum mechanics, built from first principles.',
  // coachIds → Feyn's own curating instructors (coach pages + certificates).
  // Video source attribution (OnnoRokom Pathshala / Ratul Khan) lives in lesson.source fields.
  coachIds: ['himel'],
  certificate: true,
  topics: [dynamics, electricity, magnetism, waves, thermodynamics, modernPhysics],
}

export default physics
