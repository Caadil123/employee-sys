// A round avatar with the user's initials, e.g. "Abdirahim Omar" -> "AO".
// We use it in the top bar, the sidebar and the users table.

import "./UserAvatar.css";

// A few soft colours. Each user always gets the same colour.
const AVATAR_COLOURS = ["#6563d6", "#e0795a", "#3fa37a", "#d6a13f", "#4a90d9", "#c2569b"];

// Take the first letter of the first two words of the name
function getInitials(fullName) {
  const nameWords = fullName.trim().split(" ");
  const firstLetter = nameWords[0]?.[0] ?? "";
  const secondLetter = nameWords[1]?.[0] ?? "";
  return (firstLetter + secondLetter).toUpperCase();
}

// Pick a colour from the name, so the same name always gets the same colour
function pickColour(fullName) {
  let letterTotal = 0;
  for (const letter of fullName) {
    letterTotal += letter.charCodeAt(0);
  }
  return AVATAR_COLOURS[letterTotal % AVATAR_COLOURS.length];
}

export default function UserAvatar({ fullName, size = 40 }) {
  return (
    <span
      className="user-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4, // the letters grow with the circle
        background: pickColour(fullName),
      }}
    >
      {getInitials(fullName)}
    </span>
  );
}
