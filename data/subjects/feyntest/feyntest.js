import gravity from '../../topics/feyntest/gravity.js'

const feyntest = {
  id: 'feyntest',
  name: 'Feyn Test',
  icon: 'ri-flask-line',
  description: 'A short two-lesson course to verify video playback, Q&A, progress tracking, and certificate generation.',
  coachIds: ['himel'],
  certificate: true,
  materials: [
    { id: 'ft-m1', label: 'Feyn Setup Guide', url: 'https://github.com/', type: 'link' },
  ],
  topics: [gravity],
}

export default feyntest
