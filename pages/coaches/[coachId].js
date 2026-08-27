// ============================================================
// pages/coaches/[coachId].js — legacy alias for /m/[username]
//
// /coaches/{id} was the old instructor URL and is linked from older
// certificates and shared links. Mentors now live at /m/{username}
// (spec §8), so this route only exists to forward.
//
// Redirect, not a rendered duplicate: two canonical URLs for the same
// person would split search ranking and drift in content.
// ============================================================

export default function CoachRedirect() {
  return null
}

export async function getServerSideProps({ params }) {
  return {
    redirect: {
      destination: `/m/${encodeURIComponent(params.coachId)}`,
      permanent: true,
    },
  }
}
