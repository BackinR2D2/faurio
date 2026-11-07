import { reviewAuthor, type ReviewAuthor as Author } from "@/lib/review-authors";

export function ReviewAuthor({ author }: { author?: Author }) {
  const profile = author || reviewAuthor();
  return <div className="feedback-author"><span className="feedback-avatar" role="img" aria-label={`Avatar ${profile.name}`}>{profile.initials}</span><strong>{profile.name}</strong></div>;
}
