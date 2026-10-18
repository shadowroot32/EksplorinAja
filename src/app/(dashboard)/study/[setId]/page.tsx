import StudyClient from './StudyClient';

export const instant = false;

export default function StudyPage({ params }: { params: Promise<{ setId: string }> }) {
  return <StudyClient paramsPromise={params} />;
}
